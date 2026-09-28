-- =====================================================================
-- Migration 00003: Commercial Payments & Webhook Idempotency
-- Single-tenant and multi-tenant commercial checkout and access pass schema
-- =====================================================================

-- 1. ENHANCE PLANS TABLE
-- Support fixed-duration examination access passes and external provider mappings
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS duration_days INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS external_price_id VARCHAR(255);

-- Ensure dMAT Pro Unlimited Plan reflects initial fixed-duration pass definition
UPDATE plans
SET duration_days = 30
WHERE id = 'e1000000-0000-0000-0000-000000000003';

-- 2. ENHANCE SUBSCRIPTIONS TABLE
-- Add provider tracking, billing windows, and grace periods
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider VARCHAR(64) DEFAULT 'PADDLE',
  ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- 3. ENHANCE PAYMENTS TABLE
-- Add provider customer IDs, receipt URLs, and failure tracking
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS failure_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS failure_message TEXT;

-- 4. CREATE PAYMENT_EVENTS TABLE
-- Authoritative database table for webhook deduplication, idempotency, and audit
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSING', -- 'PROCESSING', 'PROCESSED', 'FAILED', 'DUPLICATE'
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_events_provider_event UNIQUE (tenant_id, provider, provider_event_id)
);

-- 5. PERFORMANCE & INTEGRITY INDEXES
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_tenant_status ON subscriptions(user_id, tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_tenant ON payments(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_lookup ON payment_events(tenant_id, provider, provider_event_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Least-Privilege: Browser clients can only READ their own commercial state
-- Browser clients can NEVER INSERT, UPDATE, or DELETE subscriptions, payments, or payment_events.

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Plans: Public can view active plans
DROP POLICY IF EXISTS "Public can view active plans" ON plans;
CREATE POLICY "Public can view active plans"
    ON plans FOR SELECT
    USING (status = 'ACTIVE');

-- Subscriptions: Authenticated users can view their own subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
CREATE POLICY "Users can view their own subscriptions"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Payments: Authenticated users can view their own payment receipts
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments"
    ON payments FOR SELECT
    USING (auth.uid() = user_id);

-- Payment Events: Strictly internal / service-role only. No access for authenticated or anon roles.
REVOKE ALL ON payment_events FROM anon, authenticated;
