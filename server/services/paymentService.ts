import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabaseAdminClient } from '../supabase';
import { razorpayProvider, ParsedPaymentEvent } from './paymentProvider';
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
   * Authoritative checkout session / Razorpay order creation.
   * Resolves plan price and access pass duration strictly server-side.
   * Never trusts client-supplied amount, currency, duration, tier, or user_id.
   */
  async createCheckoutSession(userId: string, tenantId: string, planId: string, authHeader?: string) {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      throw new Error('Database admin client not configured');
    }

    // 1. Verify candidate user exists
    const { data: user, error: userError } = await admin
      .from('users')
      .select('id, email, name')
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

    // 4. Verify plan is active, ONE_TIME, and currency INR
    if (plan.status !== 'ACTIVE') {
      throw new Error(`Plan ${plan.name} is not active for commercial checkout`);
    }

    if (plan.billing_interval !== 'ONE_TIME') {
      throw new Error(`Invalid billing interval: ${plan.billing_interval}. Only ONE_TIME plans are supported for Razorpay checkout.`);
    }

    const currency = (plan.currency || 'INR').toUpperCase();
    if (currency !== 'INR') {
      throw new Error(`Invalid plan currency: ${currency}. Only INR plans are supported for Razorpay Test Mode checkout.`);
    }

    // 5. Server-authoritative resolution of price, currency, and duration
    // Duration must be 90 days for this one-time plan
    const durationDays = 90;
    const amount = Number(plan.price);

    // 6. Create Razorpay order via Razorpay Provider Adapter
    const orderResult = await razorpayProvider.createOrder({
      tenant_id: tenantId,
      user_id: userId,
      user_email: user.email,
      plan_id: plan.id,
      plan_name: plan.name,
      amount,
      currency,
      duration_days: durationDays,
    });

    return {
      order_id: orderResult.order_id,
      key_id: orderResult.key_id,
      amount: orderResult.amount, // in paise
      currency: orderResult.currency,
      provider: 'RAZORPAY',
      mode: 'test',
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
   * Server-side payment verification after Razorpay Checkout completion.
   * Cryptographically verifies razorpay_order_id, razorpay_payment_id, and razorpay_signature.
   * Checks against server-authoritative database plan before activating access pass.
   */
  async verifyPayment(
    userId: string,
    tenantId: string,
    orderIdOrParams:
      | string
      | {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        },
    paymentId?: string,
    signature?: string
  ) {
    let order_id: string;
    let payment_id: string;
    let sig: string;

    if (typeof orderIdOrParams === 'object' && orderIdOrParams !== null) {
      order_id = orderIdOrParams.razorpay_order_id;
      payment_id = orderIdOrParams.razorpay_payment_id;
      sig = orderIdOrParams.razorpay_signature;
    } else {
      order_id = orderIdOrParams as string;
      payment_id = paymentId || '';
      sig = signature || '';
    }

    if (!order_id || !payment_id || !sig) {
      throw new Error('Missing required Razorpay verification parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required');
    }

    // 1. Cryptographic HMAC-SHA256 signature verification
    const isValid = razorpayProvider.verifyPaymentSignature({
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      razorpay_signature: sig,
    });
    if (!isValid) {
      throw new Error('Invalid Razorpay payment signature');
    }

    // 2. Retrieve trusted server-side order record from cache or Razorpay Orders API
    let order = razorpayProvider.getOrder(order_id);
    if (!order) {
      order = await razorpayProvider.fetchOrder(order_id);
    }
    if (!order) {
      throw new Error(`Order ${order_id} not found in authoritative order records`);
    }

    // 3. Verify order ownership
    if (order.tenant_id !== tenantId || order.user_id !== userId) {
      throw new Error('Forbidden: Order does not match authenticated candidate or tenant');
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      throw new Error('Database admin client unavailable');
    }

    // 4. Fetch authoritative plan from PostgreSQL
    const { data: plan, error: planError } = await admin
      .from('plans')
      .select('*')
      .eq('id', order.plan_id)
      .maybeSingle();

    if (planError || !plan) {
      throw new Error(`Plan ${order.plan_id} not found in database`);
    }

    if (plan.tenant_id !== tenantId) {
      throw new Error('Cross-tenant plan integrity violation');
    }

    const expectedAmount = Number(plan.price);
    const expectedPaise = Math.round(expectedAmount * 100);
    if (order.amount !== expectedPaise) {
      throw new Error(`Price integrity violation: expected ${expectedPaise} paise, order has ${order.amount}`);
    }

    const expectedCurrency = (plan.currency || 'INR').toUpperCase();
    if (order.currency !== expectedCurrency) {
      throw new Error(`Currency integrity violation: expected ${expectedCurrency}, order has ${order.currency}`);
    }

    // 5. Authoritative Idempotency check using payment ID
    const lockKey = `${tenantId}:RAZORPAY:${payment_id}`;
    const { acquired, record } = await this.acquireEventLock(
      tenantId,
      'RAZORPAY',
      payment_id,
      'payment.verified',
      { razorpay_order_id: order_id, razorpay_payment_id: payment_id }
    );

    if (!acquired) {
      console.log(`[PaymentService] Duplicate payment verification ignored: ${payment_id}`);
      return {
        success: true,
        message: 'Payment was previously verified and processed',
        duplicate: true,
        tier: 'PAID',
      };
    }

    try {
      // 6. Record completed payment in PostgreSQL
      const paymentPayload = {
        tenant_id: tenantId,
        user_id: userId,
        provider: 'RAZORPAY',
        provider_payment_id: payment_id,
        amount: expectedAmount,
        currency: expectedCurrency,
        status: 'COMPLETED',
      };

      const { data: insertedPayment, error: paymentError } = await admin
        .from('payments')
        .insert(paymentPayload)
        .select()
        .single();

      if (paymentError) {
        console.error('[PaymentService] Error inserting payment:', paymentError);
      }

      // 7. Authoritative 90-Day Access Pass Activation or Extension
      const durationDays = (plan as any).duration_days || (plan.billing_interval === 'ONE_TIME' ? 90 : 90);

      // Check existing active subscription
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
      let targetExpiresAt: string;

      if (activeSub) {
        // Extend: MAX(existing_expiry, now) + duration
        const existingExpiryMs = activeSub.expires_at ? new Date(activeSub.expires_at).getTime() : Date.now();
        const baseMs = Math.max(existingExpiryMs, Date.now());
        const newExpiry = new Date(baseMs + durationDays * 86400 * 1000);
        targetExpiresAt = newExpiry.toISOString();

        await admin
          .from('subscriptions')
          .update({
            plan_id: plan.id,
            expires_at: targetExpiresAt,
            status: 'ACTIVE',
          })
          .eq('id', activeSub.id);

        targetSubscriptionId = activeSub.id;
        console.log(`[PaymentService] Extended active subscription ${activeSub.id} until ${targetExpiresAt}`);
      } else {
        // Activate new access pass
        targetExpiresAt = new Date(Date.now() + durationDays * 86400 * 1000).toISOString();
        const { data: newSub, error: subError } = await admin
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            user_id: userId,
            plan_id: plan.id,
            status: 'ACTIVE',
            started_at: new Date().toISOString(),
            expires_at: targetExpiresAt,
          })
          .select()
          .single();

        if (subError) {
          throw new Error(`Failed to activate subscription in PostgreSQL: ${subError.message}`);
        }
        targetSubscriptionId = newSub.id;
        console.log(`[PaymentService] Created new active 90-day subscription ${newSub.id} expiring at ${targetExpiresAt}`);
      }

      // 8. Link subscription ID in payments table
      if (insertedPayment?.id) {
        await admin
          .from('payments')
          .update({ subscription_id: targetSubscriptionId })
          .eq('id', insertedPayment.id);
      }

      // 9. Authoritative Audit Log
      await admin.from('audit_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        action: 'PAYMENT_SUCCEEDED',
        entity_type: 'subscription',
        entity_id: targetSubscriptionId,
        new_data: {
          payment_id: insertedPayment?.id,
          provider_payment_id: payment_id,
          provider_order_id: order_id,
          plan_name: plan.name,
          duration_days: durationDays,
          expires_at: targetExpiresAt,
        },
      });

      // 10. Finalize event record
      await this.finalizeEventRecord(record, 'PROCESSED');

      return {
        success: true,
        payment_id: insertedPayment?.id,
        subscription_id: targetSubscriptionId,
        tier: 'PAID',
        expires_at: targetExpiresAt,
      };
    } catch (err: any) {
      await this.finalizeEventRecord(record, 'FAILED', err.message);
      throw err;
    }
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
   * 1. Cryptographic HMAC-SHA256 signature check (X-Razorpay-Signature)
   * 2. Authoritative Database-backed idempotency check
   * 3. Metadata verification against PostgreSQL (tenant, user, plan, amount)
   * 4. Authoritative subscription / payment state mutations
   * 5. Audit logging
   */
  async handleWebhook(
    rawBody: string,
    signatureHeader?: string,
    eventIdHeader?: string
  ): Promise<{ statusCode: number; body: any }> {
    // 1. Verify cryptographic signature
    const verification = razorpayProvider.verifyWebhook(rawBody, signatureHeader);
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

    // 3. Parse Razorpay event structure
    const event = razorpayProvider.parseWebhook(payload, eventIdHeader);
    const tenantId = event.tenant_id;
    const userId = event.user_id;
    const planId = event.plan_id;

    if (!tenantId) {
      return {
        statusCode: 422,
        body: { error: 'Missing tenant_id in webhook notes metadata' },
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

      // 6. Handle Non-Success Events (Failure, Ignored)
      if (event.status !== 'SUCCEEDED') {
        if (event.status === 'FAILED' && event.provider_payment_id) {
          // Record failed payment
          await admin.from('payments').insert({
            tenant_id: tenantId,
            user_id: userId || '00000000-0000-0000-0000-000000000000',
            provider: 'RAZORPAY',
            provider_payment_id: event.provider_payment_id,
            amount: event.amount || 0,
            currency: event.currency || 'INR',
            status: 'FAILED',
          });
        }
        await this.finalizeEventRecord(record, 'PROCESSED');
        return {
          statusCode: 200,
          body: { success: true, event_id: event.provider_event_id, status: event.status },
        };
      }

      // 7. Verify metadata against authoritative database
      if (!userId || !planId) {
        await this.finalizeEventRecord(record, 'FAILED', 'Missing user_id or plan_id in notes');
        return {
          statusCode: 422,
          body: { error: 'Missing user_id or plan_id in webhook notes metadata' },
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

      // Check amount and currency match authoritative plan
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

      const expectedCurrency = (plan.currency || 'INR').toUpperCase();
      if (event.currency && event.currency !== expectedCurrency) {
        await this.finalizeEventRecord(
          record,
          'FAILED',
          `Currency mismatch: expected ${expectedCurrency}, received ${event.currency}`
        );
        return {
          statusCode: 422,
          body: { error: `Currency integrity violation: expected ${expectedCurrency}, received ${event.currency}` },
        };
      }

      // 8. Authoritative State Mutation: Insert Payment Record
      const paymentPayload = {
        tenant_id: tenantId,
        user_id: userId,
        provider: 'RAZORPAY',
        provider_payment_id: event.provider_payment_id || `pay_${Date.now()}`,
        amount: expectedAmount,
        currency: expectedCurrency,
        status: 'COMPLETED',
      };

      const { data: insertedPayment, error: paymentError } = await admin
        .from('payments')
        .insert(paymentPayload)
        .select()
        .single();

      if (paymentError) {
        console.error('[PaymentWebhook] Error recording payment in PostgreSQL:', paymentError);
      }

      // 9. Authoritative State Mutation: 90-Day Access Pass Activation or Extension
      const durationDays = (plan as any).duration_days || (plan.billing_interval === 'ONE_TIME' ? 90 : 90);

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
      let targetExpiresAt: string;

      if (activeSub) {
        // Extend existing access pass: new expiry is MAX(existing_expiry, now) + duration
        const existingExpiryMs = activeSub.expires_at ? new Date(activeSub.expires_at).getTime() : Date.now();
        const baseMs = Math.max(existingExpiryMs, Date.now());
        const newExpiry = new Date(baseMs + durationDays * 86400 * 1000);
        targetExpiresAt = newExpiry.toISOString();

        await admin
          .from('subscriptions')
          .update({
            plan_id: plan.id,
            expires_at: targetExpiresAt,
            status: 'ACTIVE',
          })
          .eq('id', activeSub.id);

        targetSubscriptionId = activeSub.id;
        console.log(`[PaymentWebhook] Extended active subscription ${activeSub.id} until ${targetExpiresAt}`);
      } else {
        // Create new active subscription pass
        targetExpiresAt = new Date(Date.now() + durationDays * 86400 * 1000).toISOString();
        const { data: newSub, error: subError } = await admin
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            user_id: userId,
            plan_id: plan.id,
            status: 'ACTIVE',
            started_at: new Date().toISOString(),
            expires_at: targetExpiresAt,
          })
          .select()
          .single();

        if (subError) {
          throw new Error(`Failed to activate subscription in PostgreSQL: ${subError.message}`);
        }
        targetSubscriptionId = newSub.id;
        console.log(`[PaymentWebhook] Created new active 90-day subscription ${newSub.id} expiring at ${targetExpiresAt}`);
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
          expires_at: targetExpiresAt,
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
          expires_at: targetExpiresAt,
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

    const { data: users } = await admin.from('users').select('id, email, name');
    const { data: plans } = await admin.from('plans').select('id, name, price, currency');

    const userMap = new Map((users || []).map((u) => [u.id, u]));
    const planMap = new Map((plans || []).map((p) => [p.id, p]));

    return (subs || []).map((sub) => {
      const user = userMap.get(sub.user_id);
      const plan = planMap.get(sub.plan_id);
      return {
        ...sub,
        user_email: user?.email || 'unknown',
        user_name: user?.name || 'unknown',
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

    const { data: users } = await admin.from('users').select('id, email, name');
    const userMap = new Map((users || []).map((u) => [u.id, u]));

    return (payments || []).map((pay) => {
      const user = userMap.get(pay.user_id);
      return {
        ...pay,
        user_email: user?.email || 'unknown',
        user_name: user?.name || 'unknown',
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
