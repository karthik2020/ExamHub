import crypto from 'crypto';

export interface CreateOrderParams {
  tenant_id: string;
  user_id: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  amount: number; // in major units (e.g. 29 or 2499)
  currency: string; // e.g. 'INR'
  duration_days: number;
  receipt?: string;
}

export interface CreateOrderResult {
  order_id: string;
  key_id: string;
  amount: number; // in paise (minor units)
  currency: string;
  provider: 'RAZORPAY';
  mode: 'test';
  receipt: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  timestamp?: number;
}

export interface ParsedPaymentEvent {
  provider: 'RAZORPAY';
  provider_event_id: string;
  event_type: string;
  occurred_at: string;
  tenant_id?: string;
  user_id?: string;
  plan_id?: string;
  amount?: number; // in major units (e.g. 29.00 or 2499.00)
  currency?: string;
  provider_payment_id?: string;
  provider_order_id?: string;
  provider_customer_id?: string;
  receipt?: string;
  status: 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'IGNORED';
  raw_payload: any;
}

export interface CachedOrderRecord {
  order_id: string;
  tenant_id: string;
  user_id: string;
  plan_id: string;
  amount: number; // in paise
  currency: string;
  duration_days: number;
  receipt: string;
  created_at: string;
}

export class RazorpayPaymentProvider {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly environment: 'test';
  private ordersCache = new Map<string, CachedOrderRecord>();

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_default_key_id';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_default_32bytes_long!';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_whsec_default_32bytes_long!';
    this.environment = 'test';
  }

  getMode(): 'test' {
    return 'test';
  }

  getKeyId(): string {
    return this.keyId;
  }

  getWebhookSecret(): string {
    return this.webhookSecret;
  }

  /**
   * Helper utility to generate valid cryptographic Razorpay Payment Signature for testing.
   * Specification: HMAC-SHA256(order_id + "|" + payment_id, secret)
   */
  generateTestPaymentSignature(orderId: string, paymentId: string, secret?: string): string {
    const key = secret || this.keySecret;
    const payload = `${orderId}|${paymentId}`;
    return crypto.createHmac('sha256', key).update(payload).digest('hex');
  }

  /**
   * Helper utility to generate valid cryptographic Razorpay Webhook Signature for testing.
   * Specification: HMAC-SHA256(rawBody, webhookSecret)
   */
  generateTestWebhookSignature(rawBody: string, secret?: string): string {
    const key = secret || this.webhookSecret;
    return crypto.createHmac('sha256', key).update(rawBody).digest('hex');
  }

  /**
   * Cryptographically verifies Razorpay Checkout payment signature returned to browser.
   * HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)
   */
  verifyPaymentSignature(params: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): boolean {
    if (!params.razorpay_order_id || !params.razorpay_payment_id || !params.razorpay_signature) {
      return false;
    }

    try {
      const payload = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;
      const expectedHmac = crypto.createHmac('sha256', this.keySecret).update(payload).digest('hex');

      const receivedBuf = Buffer.from(params.razorpay_signature, 'hex');
      const expectedBuf = Buffer.from(expectedHmac, 'hex');

      if (receivedBuf.length !== expectedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(receivedBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Cryptographically verifies incoming Razorpay webhook.
   * Specification:
   * 1. Header: X-Razorpay-Signature: <hex_hmac>
   * 2. HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
   * 3. timingSafeEqual constant-time comparison
   */
  verifyWebhook(rawBody: string, signatureHeader?: string): WebhookVerificationResult {
    if (!signatureHeader || typeof signatureHeader !== 'string') {
      return { isValid: false, error: 'Missing or malformed X-Razorpay-Signature header' };
    }

    const cleanSig = signatureHeader.trim();
    if (!cleanSig || cleanSig.length < 32) {
      return { isValid: false, error: 'X-Razorpay-Signature is invalid or malformed' };
    }

    try {
      const expectedHmac = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
      const receivedBuf = Buffer.from(cleanSig, 'hex');
      const expectedBuf = Buffer.from(expectedHmac, 'hex');

      if (receivedBuf.length !== expectedBuf.length) {
        return { isValid: false, error: 'Signature length mismatch' };
      }

      if (!crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
        return { isValid: false, error: 'Cryptographic webhook signature verification failed' };
      }

      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, error: `Signature verification exception: ${err.message}` };
    }
  }

  /**
   * Parses verified Razorpay webhook payload into normalized commercial event.
   */
  parseWebhook(payload: any, eventIdHeader?: string): ParsedPaymentEvent {
    const eventType = payload.event || payload.event_type || 'unknown';
    const occurredAt = payload.created_at
      ? new Date(payload.created_at * 1000).toISOString()
      : new Date().toISOString();

    const paymentEntity = payload.payload?.payment?.entity || payload.payment || {};
    const orderEntity = payload.payload?.order?.entity || payload.order || {};
    const refundEntity = payload.payload?.refund?.entity || payload.refund || {};

    const notes = paymentEntity.notes || orderEntity.notes || payload.notes || {};
    const tenantId = notes.tenant_id;
    const userId = notes.user_id;
    const planId = notes.plan_id;

    const providerPaymentId = paymentEntity.id || refundEntity.payment_id;
    const providerOrderId = paymentEntity.order_id || orderEntity.id;
    const providerCustomerId = paymentEntity.customer_id;
    const currency = (paymentEntity.currency || orderEntity.currency || 'INR').toUpperCase();

    // Razorpay expresses amounts in paise (minor units: 1 INR = 100 paise)
    let amount = 0;
    const rawPaise = paymentEntity.amount ?? orderEntity.amount ?? refundEntity.amount;
    if (typeof rawPaise === 'number') {
      amount = rawPaise / 100;
    }

    let status: ParsedPaymentEvent['status'] = 'IGNORED';
    if (['payment.captured', 'order.paid'].includes(eventType)) {
      status = 'SUCCEEDED';
    } else if (['payment.failed'].includes(eventType)) {
      status = 'FAILED';
    } else if (['refund.created', 'refund.processed', 'payment.refunded'].includes(eventType)) {
      status = 'REFUNDED';
    }

    // Determine stable event ID
    const eventId =
      eventIdHeader ||
      payload.id ||
      payload.event_id ||
      `evt_${providerPaymentId || providerOrderId || Date.now()}_${eventType.replace(/\./g, '_')}`;

    return {
      provider: 'RAZORPAY',
      provider_event_id: eventId,
      event_type: eventType,
      occurred_at: occurredAt,
      tenant_id: tenantId,
      user_id: userId,
      plan_id: planId,
      amount,
      currency,
      provider_payment_id: providerPaymentId,
      provider_order_id: providerOrderId,
      provider_customer_id: providerCustomerId,
      receipt: orderEntity.receipt || paymentEntity.receipt || null,
      status,
      raw_payload: payload,
    };
  }

  /**
   * Retrieves cached order record for server-side verification.
   */
  getOrder(orderId: string): CachedOrderRecord | undefined {
    return this.ordersCache.get(orderId);
  }

  /**
   * Retrieves order from cache or fetches from Razorpay Orders API if needed.
   */
  async fetchOrder(orderId: string): Promise<CachedOrderRecord | undefined> {
    const cached = this.ordersCache.get(orderId);
    if (cached) return cached;

    if (
      this.keyId &&
      this.keySecret &&
      this.keyId.startsWith('rzp_') &&
      !this.keyId.includes('default') &&
      !this.keyId.includes('placeholder')
    ) {
      try {
        const authString = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
          method: 'GET',
          headers: {
            Authorization: `Basic ${authString}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          const record: CachedOrderRecord = {
            order_id: data.id,
            tenant_id: data.notes?.tenant_id || '',
            user_id: data.notes?.user_id || '',
            plan_id: data.notes?.plan_id || '',
            amount: data.amount,
            currency: (data.currency || 'INR').toUpperCase(),
            duration_days: 90,
            receipt: data.receipt || '',
            created_at: new Date(data.created_at * 1000).toISOString(),
          };
          this.ordersCache.set(orderId, record);
          return record;
        }
      } catch (err) {
        console.warn(`[RazorpayPaymentProvider] Exception fetching order ${orderId}:`, err);
      }
    }

    return undefined;
  }

  /**
   * Creates a Razorpay Order through the Razorpay Orders API.
   * Amount in paise, currency INR (or plan currency).
   */
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const amountInPaise = Math.round(params.amount * 100);
    const currency = (params.currency || 'INR').toUpperCase();
    const receipt = params.receipt || `rcpt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    let orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // If real Razorpay credentials are provided in Cloud Run / test mode, call Razorpay Orders API
    if (
      this.keyId &&
      this.keySecret &&
      this.keyId.startsWith('rzp_') &&
      !this.keyId.includes('placeholder') &&
      !this.keyId.includes('default')
    ) {
      try {
        const authString = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const res = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authString}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt,
            notes: {
              tenant_id: params.tenant_id,
              user_id: params.user_id,
              plan_id: params.plan_id,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            orderId = data.id;
          }
        }
      } catch (e) {
        console.warn('[RazorpayPaymentProvider] API call exception, using deterministic test order:', e);
      }
    }

    // Cache order in server-authoritative store
    this.ordersCache.set(orderId, {
      order_id: orderId,
      tenant_id: params.tenant_id,
      user_id: params.user_id,
      plan_id: params.plan_id,
      amount: amountInPaise,
      currency,
      duration_days: params.duration_days,
      receipt,
      created_at: new Date().toISOString(),
    });

    return {
      order_id: orderId,
      key_id: this.keyId,
      amount: amountInPaise,
      currency,
      provider: 'RAZORPAY',
      mode: 'test',
      receipt,
    };
  }
}

export const razorpayProvider = new RazorpayPaymentProvider();
