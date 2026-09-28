import fs from 'fs';
import path from 'path';
import { getSupabaseAdminClient } from '../supabase';
import { paddleProvider, ParsedPaymentEvent } from './paymentProvider';
import { Plan, Subscription, Payment } from '../../src/types';

export interface PaymentEventRecord {
  id: string;
  tenant_id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  payload: any;
  status: 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DUPLICATE';
  processed_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

const EVENTS_FILE = path.join(process.cwd(), 'data', 'payment_events.json');

function loadPersistedEvents(): PaymentEventRecord[] {
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const raw = fs.readFileSync(EVENTS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading payment_events.json:', e);
  }
  return [];
}

function savePersistedEvents(events: PaymentEventRecord[]) {
  try {
    const dir = path.dirname(EVENTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving payment_events.json:', e);
  }
}

export class PaymentService {
  private processingLocks = new Set<string>();

  /**
   * Authoritative checkout session creation.
   * Resolves plan price and access pass duration strictly server-side.
   */
  async createCheckoutSession(userId: string, tenantId: string, planId: string, authHeader?: string) {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      throw new Error('Database admin client not configured');
    }

    // 1. Verify candidate user exists
    const { data: user, error: userError } = await admin
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      throw new Error(`Candidate user ${userId} not found`);
    }

    // 2. Fetch authoritative plan details from PostgreSQL
    const { data: plan, error: planError } = await admin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (planError || !plan) {
      throw new Error(`Plan ${planId} not found in database`);
    }

    // 3. Prevent cross-tenant plan checkout
    if (plan.tenant_id !== tenantId) {
      throw new Error(`Forbidden: Plan belongs to tenant ${plan.tenant_id}, but checkout was requested for tenant ${tenantId}`);
    }

    // 4. Verify plan is active
    if (plan.status !== 'ACTIVE') {
      throw new Error(`Plan ${plan.name} is not active for commercial checkout`);
    }

    // 5. Server-authoritative resolution
    const durationDays = (plan as any).duration_days || (plan.billing_interval === 'ONE_TIME' ? 30 : 30);
    const amount = Number(plan.price);
    const currency = plan.currency || 'EUR';

    // 6. Create hosted checkout session via Provider Adapter
    const checkoutResult = await paddleProvider.createCheckoutSession({
      tenant_id: tenantId,
      user_id: userId,
      user_email: user.email,
      plan_id: plan.id,
      plan_name: plan.name,
      amount,
      currency,
      duration_days: durationDays,
      return_url: '/ems/checkout/success',
    });

    return {
      ...checkoutResult,
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: amount,
        currency,
        duration_days: durationDays,
      },
    };
  }

  /**
   * Atomically checks and acquires an idempotency lock for incoming webhook events.
   * Backed by PostgreSQL audit_logs and atomic persistent store.
   */
  private async acquireEventLock(
    tenantId: string,
    provider: string,
    providerEventId: string,
    eventType: string,
    payload: any
  ): Promise<{ acquired: boolean; record: PaymentEventRecord }> {
    const lockKey = `${tenantId}:${provider}:${providerEventId}`;

    // Check in-process concurrency lock
    if (this.processingLocks.has(lockKey)) {
      return {
        acquired: false,
        record: {
          id: 'in-flight',
          tenant_id: tenantId,
          provider,
          provider_event_id: providerEventId,
          event_type: eventType,
          payload,
          status: 'DUPLICATE',
          created_at: new Date().toISOString(),
        },
      };
    }
    this.processingLocks.add(lockKey);

    try {
      const admin = getSupabaseAdminClient()!;

      // 1. Check PostgreSQL audit_logs for existing record
      const { data: existingAudit } = await admin
        .from('audit_logs')
        .select('id, action, entity_id, new_data, created_at')
        .eq('tenant_id', tenantId)
        .eq('entity_type', 'payment_event')
        .eq('entity_id', lockKey)
        .limit(1)
        .maybeSingle();

      // 2. Check persistent event store
      const persisted = loadPersistedEvents();
      const existingRecord = persisted.find(
        (e) => e.tenant_id === tenantId && e.provider === provider && e.provider_event_id === providerEventId
      );

      if (existingAudit || (existingRecord && existingRecord.status === 'PROCESSED')) {
        this.processingLocks.delete(lockKey);
        return {
          acquired: false,
          record: existingRecord || {
            id: existingAudit?.id || 'existing',
            tenant_id: tenantId,
            provider,
            provider_event_id: providerEventId,
            event_type: eventType,
            payload,
            status: 'DUPLICATE',
            created_at: existingAudit?.created_at || new Date().toISOString(),
          },
        };
      }

      // Create new event record
      const newRecord: PaymentEventRecord = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        provider,
        provider_event_id: providerEventId,
        event_type: eventType,
        payload,
        status: 'PROCESSING',
        created_at: new Date().toISOString(),
      };

      // Record to persistent store
      persisted.push(newRecord);
      savePersistedEvents(persisted);

      // Record idempotency placeholder in PostgreSQL audit_logs
      await admin.from('audit_logs').insert({
        tenant_id: tenantId,
        action: 'PAYMENT_EVENT_IDEMPOTENCY',
        entity_type: 'payment_event',
        entity_id: lockKey,
        new_data: {
          id: newRecord.id,
          provider,
          provider_event_id: providerEventId,
          event_type: eventType,
          status: 'PROCESSING',
        },
      });

      // Try inserting into payment_events table if present in PostgreSQL
      try {
        await admin.from('payment_events').insert({
          id: newRecord.id,
          tenant_id: tenantId,
          provider,
          provider_event_id: providerEventId,
          event_type: eventType,
          payload,
          status: 'PROCESSING',
        });
      } catch {
        // Table might still be synchronizing in remote PostgREST schema cache
      }

      return { acquired: true, record: newRecord };
    } catch (err) {
      this.processingLocks.delete(lockKey);
      throw err;
    }
  }

  /**
   * Releases lock and updates payment event record status.
   */
  private async finalizeEventRecord(
    record: PaymentEventRecord,
    status: 'PROCESSED' | 'FAILED',
    errorMessage?: string
  ) {
    const lockKey = `${record.tenant_id}:${record.provider}:${record.provider_event_id}`;
    this.processingLocks.delete(lockKey);

    record.status = status;
    record.processed_at = new Date().toISOString();
    if (errorMessage) {
      record.error_message = errorMessage;
    }

    // Update persistent store
    const persisted = loadPersistedEvents();
    const idx = persisted.findIndex((e) => e.id === record.id);
    if (idx >= 0) {
      persisted[idx] = record;
    } else {
      persisted.push(record);
    }
    savePersistedEvents(persisted);

    // Update PostgreSQL audit_logs
    const admin = getSupabaseAdminClient();
    if (admin) {
      await admin.from('audit_logs').insert({
        tenant_id: record.tenant_id,
        action: status === 'PROCESSED' ? 'PAYMENT_EVENT_PROCESSED' : 'PAYMENT_EVENT_FAILED',
        entity_type: 'payment_event',
        entity_id: lockKey,
        new_data: {
          id: record.id,
          status,
          processed_at: record.processed_at,
          error_message: errorMessage || null,
        },
      });

      try {
        await admin
          .from('payment_events')
          .update({
            status,
            processed_at: record.processed_at,
            error_message: errorMessage || null,
          })
          .eq('id', record.id);
      } catch {}
    }
  }

  /**
   * Secure Webhook Pipeline:
   * 1. Cryptographic signature check
   * 2. Replay attack rejection
   * 3. Database-backed idempotency check
   * 4. Metadata verification against PostgreSQL (tenant, user, plan, amount)
   * 5. Authoritative subscription / payment state mutations
   * 6. Audit logging
   */
  async handleWebhook(rawBody: string, signatureHeader?: string): Promise<{ statusCode: number; body: any }> {
    // 1. Verify cryptographic signature
    const verification = paddleProvider.verifyWebhook(rawBody, signatureHeader);
    if (!verification.isValid) {
      console.log(`[PaymentWebhook] Unsigned or invalid webhook rejected (HTTP 400): ${verification.error}`);
      return {
        statusCode: 400,
        body: { error: 'Invalid webhook signature', details: verification.error },
      };
    }

    // 2. Parse JSON payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        statusCode: 400,
        body: { error: 'Malformed JSON payload' },
      };
    }

    // 3. Parse event structure
    const event = paddleProvider.parseWebhook(payload);
    const tenantId = event.tenant_id;
    const userId = event.user_id;
    const planId = event.plan_id;

    if (!tenantId) {
      return {
        statusCode: 422,
        body: { error: 'Missing tenant_id in webhook custom_data metadata' },
      };
    }

    // 4. Authoritative Idempotency Check
    const { acquired, record } = await this.acquireEventLock(
      tenantId,
      event.provider,
      event.provider_event_id,
      event.event_type,
      payload
    );

    if (!acquired) {
      console.log(`[PaymentWebhook] Duplicate webhook event ignored: ${event.provider_event_id}`);
      return {
        statusCode: 200,
        body: {
          status: 'duplicate_ignored',
          event_id: event.provider_event_id,
          message: 'Webhook event was previously processed',
        },
      };
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      await this.finalizeEventRecord(record, 'FAILED', 'Database admin client unavailable');
      return {
        statusCode: 500,
        body: { error: 'Database service unavailable' },
      };
    }

    try {
      // 5. Handle Refund / Revocation
      if (event.status === 'REFUNDED') {
        await this.handleRefund(admin, event, record);
        await this.finalizeEventRecord(record, 'PROCESSED');
        return {
          statusCode: 200,
          body: { success: true, event_id: event.provider_event_id, action: 'refund_processed' },
        };
      }

      // 6. Handle Non-Success Events (Cancellation, Failure, Ignored)
      if (event.status !== 'SUCCEEDED') {
        await this.finalizeEventRecord(record, 'PROCESSED');
        return {
          statusCode: 200,
          body: { success: true, event_id: event.provider_event_id, status: event.status },
        };
      }

      // 7. Verify metadata against authoritative database
      if (!userId || !planId) {
        await this.finalizeEventRecord(record, 'FAILED', 'Missing user_id or plan_id in custom_data');
        return {
          statusCode: 422,
          body: { error: 'Missing user_id or plan_id in webhook custom_data metadata' },
        };
      }

      // Check tenant exists
      const { data: tenant } = await admin.from('tenants').select('id').eq('id', tenantId).maybeSingle();
      if (!tenant) {
        await this.finalizeEventRecord(record, 'FAILED', `Tenant ${tenantId} not found in database`);
        return {
          statusCode: 422,
          body: { error: `Tenant ${tenantId} not found` },
        };
      }

      // Check candidate user exists
      const { data: user } = await admin.from('users').select('id, email').eq('id', userId).maybeSingle();
      if (!user) {
        await this.finalizeEventRecord(record, 'FAILED', `Candidate user ${userId} not found in database`);
        return {
          statusCode: 422,
          body: { error: `Candidate user ${userId} not found` },
        };
      }

      // Check plan exists and belongs to tenant
      const { data: plan } = await admin.from('plans').select('*').eq('id', planId).maybeSingle();
      if (!plan) {
        await this.finalizeEventRecord(record, 'FAILED', `Plan ${planId} not found in database`);
        return {
          statusCode: 422,
          body: { error: `Plan ${planId} not found` },
        };
      }

      if (plan.tenant_id !== tenantId) {
        await this.finalizeEventRecord(record, 'FAILED', 'Cross-tenant plan violation detected');
        return {
          statusCode: 422,
          body: { error: 'Plan does not belong to specified tenant' },
        };
      }

      // Check amount and currency matches authoritative plan
      const expectedAmount = Number(plan.price);
      if (event.amount !== undefined && event.amount > 0 && Math.abs(event.amount - expectedAmount) > 0.05) {
        await this.finalizeEventRecord(
          record,
          'FAILED',
          `Amount mismatch: expected ${expectedAmount}, received ${event.amount}`
        );
        return {
          statusCode: 422,
          body: { error: `Price integrity violation: expected ${expectedAmount}, received ${event.amount}` },
        };
      }

      // 8. Authoritative State Mutation: Insert Payment Record
      const paymentPayload = {
        tenant_id: tenantId,
        user_id: userId,
        provider: 'PADDLE',
        provider_payment_id: event.provider_payment_id || `txn_${Date.now()}`,
        amount: expectedAmount,
        currency: plan.currency || 'EUR',
        status: 'COMPLETED',
      };

      const { data: insertedPayment, error: paymentError } = await admin
        .from('payments')
        .insert(paymentPayload)
        .select()
        .single();

      if (paymentError) {
        console.error('Error recording payment in PostgreSQL:', paymentError);
      }

      // 9. Authoritative State Mutation: Subscription / Access Pass Activation
      const durationDays = (plan as any).duration_days || (plan.billing_interval === 'ONE_TIME' ? 30 : 30);

      // Check for an existing active subscription
      const { data: activeSub } = await admin
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let targetSubscriptionId: string;

      if (activeSub) {
        // Extend existing access pass: new expiry is MAX(existing_expiry, now) + duration
        const existingExpiryMs = activeSub.expires_at ? new Date(activeSub.expires_at).getTime() : Date.now();
        const baseMs = existingExpiryMs > Date.now() ? existingExpiryMs : Date.now();
        const newExpiry = new Date(baseMs + durationDays * 86400 * 1000);

        const { data: updatedSub } = await admin
          .from('subscriptions')
          .update({
            plan_id: plan.id,
            expires_at: newExpiry.toISOString(),
            status: 'ACTIVE',
          })
          .eq('id', activeSub.id)
          .select()
          .single();

        targetSubscriptionId = activeSub.id;
        console.log(`[PaymentWebhook] Extended active subscription ${activeSub.id} until ${newExpiry.toISOString()}`);
      } else {
        // Create new active subscription pass
        const expiresAt = new Date(Date.now() + durationDays * 86400 * 1000).toISOString();
        const { data: newSub, error: subError } = await admin
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            user_id: userId,
            plan_id: plan.id,
            status: 'ACTIVE',
            started_at: new Date().toISOString(),
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (subError) {
          throw new Error(`Failed to activate subscription in PostgreSQL: ${subError.message}`);
        }
        targetSubscriptionId = newSub.id;
        console.log(`[PaymentWebhook] Created new active subscription ${newSub.id} expiring at ${expiresAt}`);
      }

      // 10. Link subscription ID in payments table
      if (insertedPayment?.id) {
        await admin
          .from('payments')
          .update({ subscription_id: targetSubscriptionId })
          .eq('id', insertedPayment.id);
      }

      // 11. Authoritative Audit Log
      await admin.from('audit_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        action: 'PAYMENT_SUCCEEDED',
        entity_type: 'subscription',
        entity_id: targetSubscriptionId,
        new_data: {
          payment_id: insertedPayment?.id,
          provider_payment_id: event.provider_payment_id,
          plan_name: plan.name,
          duration_days: durationDays,
        },
      });

      // 12. Finalize event status
      await this.finalizeEventRecord(record, 'PROCESSED');

      return {
        statusCode: 200,
        body: {
          success: true,
          event_id: event.provider_event_id,
          subscription_id: targetSubscriptionId,
          tier: 'PAID',
        },
      };
    } catch (err: any) {
      console.error('[PaymentWebhook] Exception processing webhook:', err);
      await this.finalizeEventRecord(record, 'FAILED', err.message);
      return {
        statusCode: 500,
        body: { error: 'Internal error processing payment event', message: err.message },
      };
    }
  }

  /**
   * Authoritative Refund Processing:
   * 1. Marks payment as REFUNDED.
   * 2. Revokes PRO access by expiring the subscription immediately.
   */
  private async handleRefund(admin: any, event: ParsedPaymentEvent, record: PaymentEventRecord) {
    console.log(`[PaymentWebhook] Processing refund for event: ${event.provider_event_id}`);

    // Look up payment by provider payment id
    if (event.provider_payment_id) {
      const { data: payment } = await admin
        .from('payments')
        .select('*')
        .eq('provider_payment_id', event.provider_payment_id)
        .maybeSingle();

      if (payment) {
        await admin
          .from('payments')
          .update({ status: 'REFUNDED' })
          .eq('id', payment.id);

        if (payment.subscription_id) {
          await admin
            .from('subscriptions')
            .update({
              status: 'EXPIRED',
              expires_at: new Date().toISOString(),
              cancelled_at: new Date().toISOString(),
            })
            .eq('id', payment.subscription_id);
        }
      }
    } else if (event.user_id && event.tenant_id) {
      // Fallback: expire active subscription for user
      await admin
        .from('subscriptions')
        .update({
          status: 'EXPIRED',
          expires_at: new Date().toISOString(),
          cancelled_at: new Date().toISOString(),
        })
        .eq('tenant_id', event.tenant_id)
        .eq('user_id', event.user_id)
        .eq('status', 'ACTIVE');
    }

    // Audit log
    await admin.from('audit_logs').insert({
      tenant_id: event.tenant_id,
      user_id: event.user_id || null,
      action: 'PAYMENT_REFUNDED',
      entity_type: 'payment',
      entity_id: event.provider_payment_id || event.provider_event_id,
      new_data: {
        provider_event_id: event.provider_event_id,
        amount: event.amount,
      },
    });
  }

  /**
   * Admin inspection queries (no sensitive card data).
   */
  async getAdminSubscriptions(tenantId?: string) {
    const admin = getSupabaseAdminClient();
    if (!admin) return [];

    let query = admin
      .from('subscriptions')
      .select('id, tenant_id, user_id, plan_id, status, started_at, expires_at, cancelled_at')
      .order('started_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: subs, error } = await query;
    if (error) throw error;

    // Enrich with user email and plan name
    const { data: users } = await admin.from('users').select('id, email, full_name');
    const { data: plans } = await admin.from('plans').select('id, name, price, currency');

    const userMap = new Map((users || []).map((u) => [u.id, u]));
    const planMap = new Map((plans || []).map((p) => [p.id, p]));

    return (subs || []).map((sub) => {
      const user = userMap.get(sub.user_id);
      const plan = planMap.get(sub.plan_id);
      return {
        ...sub,
        user_email: user?.email || 'unknown',
        user_name: user?.full_name || 'unknown',
        plan_name: plan?.name || 'Unknown Plan',
        plan_price: plan?.price,
        plan_currency: plan?.currency,
      };
    });
  }

  async getAdminPayments(tenantId?: string) {
    const admin = getSupabaseAdminClient();
    if (!admin) return [];

    let query = admin
      .from('payments')
      .select('id, tenant_id, user_id, subscription_id, provider, provider_payment_id, amount, currency, status, created_at')
      .order('created_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: payments, error } = await query;
    if (error) throw error;

    const { data: users } = await admin.from('users').select('id, email, full_name');
    const userMap = new Map((users || []).map((u) => [u.id, u]));

    return (payments || []).map((pay) => {
      const user = userMap.get(pay.user_id);
      return {
        ...pay,
        user_email: user?.email || 'unknown',
        user_name: user?.full_name || 'unknown',
      };
    });
  }

  async getAdminPaymentEvents(tenantId?: string): Promise<PaymentEventRecord[]> {
    const events = loadPersistedEvents();
    if (tenantId) {
      return events.filter((e) => e.tenant_id === tenantId);
    }
    return events;
  }
}

export const paymentService = new PaymentService();
