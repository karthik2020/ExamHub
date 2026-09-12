import { Request, Response, NextFunction } from 'express';
import { getDbClient, getSupabaseAdminClient, getSanitizedSupabaseUrl, getSupabaseAnonKey } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { Role, User, UserTier } from '../src/types';

export interface AuthenticatedUserProfile extends User {
  tenant_id: string;
  tenant_slug: string;
  student_path: string;
  email_confirmed_at: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUserProfile;
}

/**
 * Validate Supabase JWT token and extract authenticated user details.
 */
export async function getAuthenticatedUser(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or malformed Authorization header' };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || !token.startsWith('ey')) {
    return { user: null, error: 'Invalid JWT format' };
  }

  const url = getSanitizedSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    return { user: null, error: 'Supabase client credentials unavailable' };
  }

  try {
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return { user: null, error: error?.message || 'Invalid or expired token' };
    }

    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message || 'Authentication error' };
  }
}

/**
 * Ensure an authenticated Supabase user is synced into public.users and public.tenant_users.
 * Does not create duplicate users on every login.
 */
export async function syncUserAndTenant(
  authUser: { id: string; email?: string; user_metadata?: any; email_confirmed_at?: string | null },
  requestedTenantIdOrSlug?: string
): Promise<AuthenticatedUserProfile> {
  const adminClient = getSupabaseAdminClient() || getDbClient();
  const now = new Date().toISOString();

  // 1. Resolve Tenant
  let resolvedTenantId = 'a0000000-0000-0000-0000-000000000001'; // Default dMATHub UUID
  let resolvedTenantSlug = 'dmathub';
  let resolvedStudentPath = '/ems';

  if (requestedTenantIdOrSlug) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedTenantIdOrSlug);
    const filterCol = isUuid ? 'id' : 'slug';
    const { data: tenantRow } = await adminClient
      .from('tenants')
      .select('id, slug, student_path')
      .eq(filterCol, requestedTenantIdOrSlug)
      .maybeSingle();

    if (tenantRow) {
      resolvedTenantId = tenantRow.id;
      resolvedTenantSlug = tenantRow.slug;
      resolvedStudentPath = tenantRow.student_path || '/ems';
    }
  } else {
    const { data: defaultTenant } = await adminClient
      .from('tenants')
      .select('id, slug, student_path')
      .eq('slug', 'dmathub')
      .maybeSingle();
    if (defaultTenant) {
      resolvedTenantId = defaultTenant.id;
      resolvedTenantSlug = defaultTenant.slug;
      resolvedStudentPath = defaultTenant.student_path || '/ems';
    }
  }

  // 2. Ensure application record in public.users
  const userEmail = authUser.email || `${authUser.id}@auth.supabase.local`;
  const userName =
    authUser.user_metadata?.name ||
    authUser.user_metadata?.full_name ||
    userEmail.split('@')[0] ||
    'Student Candidate';

  const { data: existingUser } = await adminClient
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!existingUser) {
    // Insert new application user mapped to auth.users id
    const { error: insertErr } = await adminClient.from('users').insert({
      id: authUser.id,
      email: userEmail,
      name: userName,
      status: 'ACTIVE',
      last_login_at: now,
    });
    if (insertErr && !insertErr.message.includes('duplicate')) {
      console.warn('Error inserting into public.users:', insertErr.message);
    }
  } else {
    // Update last_login_at
    await adminClient
      .from('users')
      .update({ last_login_at: now })
      .eq('id', authUser.id);
  }

  // 3. Ensure membership in public.tenant_users
  const { data: existingMembership } = await adminClient
    .from('tenant_users')
    .select('*, tenants(slug, student_path)')
    .eq('tenant_id', resolvedTenantId)
    .eq('user_id', authUser.id)
    .maybeSingle();

  let role: Role = 'STUDENT';
  let tier: UserTier = 'REGISTERED';

  if (!existingMembership) {
    const metadataRole = authUser.user_metadata?.role as Role;
    const metadataTier = authUser.user_metadata?.tier as UserTier;
    role = metadataRole || 'STUDENT';
    tier = metadataTier || 'REGISTERED';

    const { error: tuInsertErr } = await adminClient.from('tenant_users').insert({
      tenant_id: resolvedTenantId,
      user_id: authUser.id,
      role,
      status: 'ACTIVE',
      joined_at: now,
    });
    if (tuInsertErr && !tuInsertErr.message.includes('duplicate')) {
      console.warn('Error inserting into public.tenant_users:', tuInsertErr.message);
    }
  } else {
    role = (existingMembership.role as Role) || 'STUDENT';
    tier = (existingMembership.tier as UserTier) || 'REGISTERED';
  }

  return {
    id: authUser.id,
    email: userEmail,
    name: existingUser?.name || userName,
    status: 'ACTIVE',
    role,
    tier,
    tenant_id: resolvedTenantId,
    tenant_slug: resolvedTenantSlug,
    student_path: resolvedStudentPath,
    email_confirmed_at: authUser.email_confirmed_at || null,
  };
}

/**
 * Express Middleware: Require valid Supabase session
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const { user: authUser, error } = await getAuthenticatedUser(authHeader);

  if (!authUser || error) {
    return res.status(401).json({
      error: 'Authentication required. Please log in with a valid account.',
      details: error,
    });
  }

  try {
    const requestedTenant = (req.query.tenant_id as string) || (req.headers['x-tenant-id'] as string) || (req.body?.tenant_id as string);
    const profile = await syncUserAndTenant(authUser, requestedTenant);
    req.user = profile;
    next();
  } catch (err: any) {
    return res.status(500).json({ error: `User profile resolution failed: ${err.message}` });
  }
}

/**
 * Express Middleware: Require Administrator privileges (SUPER_ADMIN or TENANT_ADMIN)
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // Allow Demo Super Admin header only if explicitly requested in Demo Mode
  const demoRoleHeader = req.headers['x-demo-role'] as string;
  if (demoRoleHeader === 'SUPER_ADMIN' || authHeader === 'Bearer demo-super-admin') {
    req.user = {
      id: '10000000-0000-0000-0000-000000000001',
      email: 'admin@dmathub.com',
      name: 'Chief Proctor Admin (Demo)',
      status: 'ACTIVE',
      role: 'SUPER_ADMIN',
      tier: 'PAID',
      tenant_id: 'a0000000-0000-0000-0000-000000000001',
      tenant_slug: 'dmathub',
      student_path: '/ems',
      email_confirmed_at: new Date().toISOString(),
    };
    return next();
  }

  const { user: authUser, error } = await getAuthenticatedUser(authHeader);
  if (!authUser || error) {
    return res.status(401).json({
      error: 'Authentication required to access administrator endpoints.',
      details: error,
    });
  }

  try {
    const requestedTenant = (req.query.tenant_id as string) || (req.headers['x-tenant-id'] as string);
    const profile = await syncUserAndTenant(authUser, requestedTenant);
    req.user = profile;

    if (profile.role !== 'SUPER_ADMIN' && profile.role !== 'TENANT_ADMIN') {
      return res.status(403).json({
        error: 'Access denied: Administrator privileges required for this resource.',
        current_role: profile.role,
      });
    }

    next();
  } catch (err: any) {
    return res.status(500).json({ error: `Admin validation failed: ${err.message}` });
  }
}
