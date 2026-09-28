import crypto from 'crypto';
import { Request, Response } from 'express';
import { getSupabaseAdminClient } from './supabase';

interface GuestSessionRecord {
  sessionHash: string;
  tenantId: string;
  createdAt: number;
}

// In-memory cache for ultra-low latency lookups (synchronized with PostgreSQL audit_logs)
const guestAttemptCache = new Map<string, GuestSessionRecord>();

export class GuestSessionManager {
  /**
   * Generate a cryptographically random, high-entropy guest session token (256-bit entropy).
   * Never uses Math.random() or predictable counters.
   */
  public static generateSessionToken(): string {
    const raw = crypto.randomBytes(32).toString('hex');
    return `gs_${raw}`;
  }

  /**
   * Compute a secure SHA-256 hash of the guest session token.
   * Only the hash is stored in the database, never the raw token.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Extract guest session token from HTTP Request:
   * 1. 'x-guest-session' request header
   * 2. 'examhub_guest_session' cookie
   * 3. 'guest_session_token' body parameter or query parameter
   */
  public static extractSessionToken(req: Request): string | undefined {
    // 1. Check custom header
    const headerVal = req.headers['x-guest-session'];
    if (typeof headerVal === 'string' && headerVal.trim().length > 0) {
      return headerVal.trim();
    }

    // 2. Check cookies
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)examhub_guest_session=([^;]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1].trim());
      }
    }

    // 3. Check body or query
    if (req.body && typeof req.body.guest_session_token === 'string') {
      return req.body.guest_session_token.trim();
    }
    if (req.query && typeof req.query.guest_session_token === 'string') {
      return (req.query.guest_session_token as string).trim();
    }

    return undefined;
  }

  /**
   * Set secure HTTP-only cookie and header for the guest session token.
   */
  public static attachSessionToken(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('examhub_guest_session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.setHeader('x-guest-session', token);
  }

  /**
   * Bind a newly created guest attempt to a guest session token and tenant.
   * Stored in-memory and persistently in PostgreSQL audit_logs.
   */
  public static async bindGuestAttempt(
    attemptId: string,
    tenantId: string,
    sessionToken: string
  ): Promise<void> {
    const sessionHash = this.hashToken(sessionToken);

    // 1. Store in memory cache
    guestAttemptCache.set(attemptId, {
      sessionHash,
      tenantId,
      createdAt: Date.now(),
    });

    // 2. Persist to PostgreSQL audit_logs using admin client
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { error } = await admin.from('audit_logs').insert([
        {
          tenant_id: tenantId,
          user_id: '10000000-0000-0000-0000-000000000003',
          action: 'GUEST_SESSION_BOUND',
          entity_type: 'attempt',
          entity_id: attemptId,
          new_data: {
            session_hash: sessionHash,
            tenant_id: tenantId,
            bound_at: new Date().toISOString(),
          },
        },
      ]);
      if (error) {
        console.warn(`[GuestSession] Failed to persist guest session binding in audit_logs: ${error.message}`);
      }
    }
  }

  /**
   * Validate that a guest request has permission to access an attempt.
   * Guarantees:
   * 1. Token must be present.
   * 2. Token hash must match the attempt's bound session hash.
   * 3. Tenant ID must match if specified.
   */
  public static async validateGuestAttemptAccess(
    attemptId: string,
    sessionToken?: string,
    expectedTenantId?: string
  ): Promise<{ valid: boolean; status: number; error?: string }> {
    if (!sessionToken || sessionToken.trim().length === 0) {
      return {
        valid: false,
        status: 403,
        error: 'Forbidden: Guest session token required to access this attempt.',
      };
    }

    const providedHash = this.hashToken(sessionToken);

    // 1. Check in-memory cache first
    let record = guestAttemptCache.get(attemptId);

    // 2. If not in memory, query PostgreSQL audit_logs
    if (!record) {
      const admin = getSupabaseAdminClient();
      if (admin) {
        const { data, error } = await admin
          .from('audit_logs')
          .select('tenant_id, new_data')
          .eq('action', 'GUEST_SESSION_BOUND')
          .eq('entity_type', 'attempt')
          .eq('entity_id', attemptId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && data.new_data?.session_hash) {
          record = {
            sessionHash: data.new_data.session_hash,
            tenantId: data.tenant_id || data.new_data.tenant_id,
            createdAt: Date.now(),
          };
          guestAttemptCache.set(attemptId, record);
        }
      }
    }

    if (!record) {
      return {
        valid: false,
        status: 404,
        error: 'Forbidden: No guest session found for this attempt.',
      };
    }

    // Cryptographic constant-time comparison to prevent timing attacks
    const hashA = Buffer.from(record.sessionHash, 'hex');
    const hashB = Buffer.from(providedHash, 'hex');
    if (hashA.length !== hashB.length || !crypto.timingSafeEqual(hashA, hashB)) {
      return {
        valid: false,
        status: 403,
        error: 'Forbidden: This attempt does not belong to your guest session.',
      };
    }

    // Tenant isolation verification
    if (expectedTenantId && record.tenantId !== expectedTenantId) {
      return {
        valid: false,
        status: 403,
        error: 'Forbidden: Attempt belongs to a different tenant.',
      };
    }

    return { valid: true, status: 200 };
  }

  /**
   * Retrieve all attempt IDs created by a specific guest session token.
   * Ensures guest history is strictly scoped to the active guest session.
   */
  public static async getGuestSessionAttemptIds(
    sessionToken: string,
    tenantId?: string
  ): Promise<string[]> {
    if (!sessionToken || sessionToken.trim().length === 0) {
      return [];
    }

    const providedHash = this.hashToken(sessionToken);
    const attemptIds: string[] = [];

    // 1. Gather from in-memory cache
    for (const [attemptId, rec] of guestAttemptCache.entries()) {
      if (rec.sessionHash === providedHash) {
        if (!tenantId || rec.tenantId === tenantId) {
          attemptIds.push(attemptId);
        }
      }
    }

    // 2. Gather from PostgreSQL audit_logs
    const admin = getSupabaseAdminClient();
    if (admin) {
      let query = admin
        .from('audit_logs')
        .select('entity_id, new_data, tenant_id')
        .eq('action', 'GUEST_SESSION_BOUND')
        .eq('entity_type', 'attempt');

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data } = await query;
      for (const row of data || []) {
        if (row.new_data?.session_hash === providedHash && row.entity_id) {
          if (!attemptIds.includes(row.entity_id)) {
            attemptIds.push(row.entity_id);
          }
        }
      }
    }

    return attemptIds;
  }
}
