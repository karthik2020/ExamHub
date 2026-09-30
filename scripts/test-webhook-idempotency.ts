import { config } from 'dotenv';
config();

import { getSupabaseAdminClient } from '../server/supabase';
import { razorpayProvider } from '../server/services/paymentProvider';

const APP_URL = 'http://localhost:3000';

async function runWebhookIdempotencyTests() {
  console.log('================================================================');
  console.log('RAZORPAY TEST SUITE 3: WEBHOOK IDEMPOTENCY & DEDUPLICATION TESTS');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  const adminClient = getSupabaseAdminClient()!;
  const tenantId = 'a0000000-0000-0000-0000-000000000001';
  const userId = '10000000-0000-0000-0000-000000000002';
  const planId = 'e1000000-0000-0000-0000-000000000003';

  // Fetch plan
  const { data: plan } = await adminClient.from('plans').select('*').eq('id', planId).single();
  const pricePaise = Math.round(Number(plan.price) * 100);

  const testEventId = `evt_idemp_${Date.now()}`;
  const testPaymentId = `pay_idemp_${Date.now()}`;
  const testOrderId = `order_idemp_${Date.now()}`;

  const payload = {
    entity: 'event',
    account_id: 'acc_test_dmathub',
    event: 'payment.captured',
    id: testEventId,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: testPaymentId,
          order_id: testOrderId,
          amount: pricePaise,
          currency: (plan.currency || 'INR').toUpperCase(),
          status: 'captured',
          notes: {
            tenant_id: tenantId,
            user_id: userId,
            plan_id: planId,
          },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };

  const rawBody = JSON.stringify(payload);
  const sig = razorpayProvider.generateTestWebhookSignature(rawBody);

  // Count existing payments and subscriptions
  const { count: initialPayCount } = await adminClient
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('provider_payment_id', testPaymentId);

  assert(initialPayCount === 0, 'No payment record exists prior to first webhook delivery');

  console.log('\n--- 1. FIRST WEBHOOK DELIVERY ---');
  const firstRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': sig,
      'X-Razorpay-Event-Id': testEventId,
    },
    body: rawBody,
  });
  assert(firstRes.status === 200, 'First webhook delivery succeeds with HTTP 200');
  const firstData = await firstRes.json();
  assert(firstData.success === true, 'First delivery marks success: true');
  assert(Boolean(firstData.subscription_id), `Active subscription created: ${firstData.subscription_id}`);

  // Inspect database
  const { data: firstSubs } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('id', firstData.subscription_id)
    .single();

  const firstExpiry = firstSubs.expires_at;

  const { data: firstPayments } = await adminClient
    .from('payments')
    .select('*')
    .eq('provider_payment_id', testPaymentId);

  assert(firstPayments?.length === 1, 'Exactly 1 payment record created in PostgreSQL');

  console.log('\n--- 2. DUPLICATE WEBHOOK DELIVERY (SAME EVENT ID) ---');
  // 11. duplicate webhook -> no duplicate entitlement
  const dupRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': sig,
      'X-Razorpay-Event-Id': testEventId,
    },
    body: rawBody,
  });
  assert(dupRes.status === 200, 'Duplicate delivery returns HTTP 200 without error');
  const dupData = await dupRes.json();
  assert(dupData.status === 'duplicate_ignored', 'Duplicate delivery recognized and ignored');

  // Verify payment count did not increase
  // 12. duplicate payment notification -> no duplicate payment
  const { data: dupPayments } = await adminClient
    .from('payments')
    .select('*')
    .eq('provider_payment_id', testPaymentId);

  assert(dupPayments?.length === 1, 'Payment records not duplicated after replay (remains exactly 1)');

  // Verify subscription expiry was not extended again
  const { data: dupSubs } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('id', firstData.subscription_id)
    .single();

  assert(dupSubs.expires_at === firstExpiry, 'Entitlement expiration unchanged by duplicate delivery');

  console.log('\n--- 3. CONCURRENT DUPLICATE RACE TEST ---');
  const racePromises = [1, 2, 3].map(() =>
    fetch(`${APP_URL}/api/webhooks/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': sig,
        'X-Razorpay-Event-Id': testEventId,
      },
      body: rawBody,
    })
  );

  const raceResponses = await Promise.all(racePromises);
  const all200 = raceResponses.every((r) => r.status === 200);
  assert(all200, 'Concurrent replayed webhooks handled gracefully (all HTTP 200)');

  // Clean up test data
  await adminClient.from('payments').delete().eq('provider_payment_id', testPaymentId);
  await adminClient.from('subscriptions').delete().eq('id', firstData.subscription_id);

  console.log('\n================================================================');
  console.log(`WEBHOOK IDEMPOTENCY SUITE RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runWebhookIdempotencyTests().catch((err) => {
  console.error('Fatal error in webhook idempotency tests:', err);
  process.exit(1);
});
