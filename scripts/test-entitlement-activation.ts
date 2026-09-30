import { config } from 'dotenv';
config();

import { getSupabaseAdminClient } from '../server/supabase';
import { razorpayProvider } from '../server/services/paymentProvider';

const APP_URL = 'http://localhost:3000';

async function runEntitlementActivationTests() {
  console.log('================================================================');
  console.log('RAZORPAY TEST SUITE 4: 90-DAY ENTITLEMENT ACTIVATION TESTS');
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
  const correctPricePaise = Math.round(Number(plan.price) * 100);
  const correctCurrency = (plan.currency || 'INR').toUpperCase();

  console.log('\n--- 1. WRONG AMOUNT IN WEBHOOK ---');
  // 15. wrong amount -> rejected
  const wrongAmountPayload = {
    entity: 'event',
    account_id: 'acc_test_dmathub',
    event: 'payment.captured',
    id: `evt_wrong_amt_${Date.now()}`,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: `pay_wrong_amt_${Date.now()}`,
          order_id: `order_wrong_amt_${Date.now()}`,
          amount: 100, // Expected correctPricePaise, provided 100 (1 unit)
          currency: correctCurrency,
          status: 'captured',
          notes: { tenant_id: tenantId, user_id: userId, plan_id: planId },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
  const wrongAmountRaw = JSON.stringify(wrongAmountPayload);
  const wrongAmountSig = razorpayProvider.generateTestWebhookSignature(wrongAmountRaw);

  const wrongAmountRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': wrongAmountSig,
    },
    body: wrongAmountRaw,
  });
  assert(wrongAmountRes.status === 422, 'Webhook with incorrect amount strictly rejected (HTTP 422)');

  console.log('\n--- 2. WRONG CURRENCY IN WEBHOOK ---');
  // 16. wrong currency -> rejected
  const wrongCurrPayload = {
    entity: 'event',
    account_id: 'acc_test_dmathub',
    event: 'payment.captured',
    id: `evt_wrong_curr_${Date.now()}`,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: `pay_wrong_curr_${Date.now()}`,
          order_id: `order_wrong_curr_${Date.now()}`,
          amount: correctPricePaise,
          currency: correctCurrency === 'INR' ? 'USD' : 'JPY',
          status: 'captured',
          notes: { tenant_id: tenantId, user_id: userId, plan_id: planId },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
  const wrongCurrRaw = JSON.stringify(wrongCurrPayload);
  const wrongCurrSig = razorpayProvider.generateTestWebhookSignature(wrongCurrRaw);

  const wrongCurrRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': wrongCurrSig,
    },
    body: wrongCurrRaw,
  });
  assert(wrongCurrRes.status === 422, 'Webhook with mismatched currency strictly rejected (HTTP 422)');

  console.log('\n--- 3. FAILED PAYMENT NOTIFICATION ---');
  // 17. failed payment -> no entitlement
  const failedPaymentId = `pay_failed_${Date.now()}`;
  const failedPayload = {
    entity: 'event',
    account_id: 'acc_test_dmathub',
    event: 'payment.failed',
    id: `evt_failed_${Date.now()}`,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: failedPaymentId,
          order_id: `order_failed_${Date.now()}`,
          amount: correctPricePaise,
          currency: correctCurrency,
          status: 'failed',
          notes: { tenant_id: tenantId, user_id: userId, plan_id: planId },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
  const failedRaw = JSON.stringify(failedPayload);
  const failedSig = razorpayProvider.generateTestWebhookSignature(failedRaw);

  const failedRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': failedSig,
    },
    body: failedRaw,
  });
  assert(failedRes.status === 200, 'Failed payment webhook processed with HTTP 200');

  // Verify payment recorded as FAILED and no active subscription granted
  const { data: failedPayRecord } = await adminClient
    .from('payments')
    .select('*')
    .eq('provider_payment_id', failedPaymentId)
    .maybeSingle();

  assert(failedPayRecord?.status === 'FAILED', 'Failed payment recorded with status: FAILED');
  assert(failedPayRecord?.subscription_id === null, 'No subscription linked to failed payment');

  console.log('\n--- 4. VERIFIED SUCCESSFUL PAYMENT -> 90-DAY ACTIVATION ---');
  // 18. verified successful payment -> entitlement activated
  const successPaymentId = `pay_succ_${Date.now()}`;
  const successOrderId = `order_succ_${Date.now()}`;
  const successEventId = `evt_succ_${Date.now()}`;

  const successPayload = {
    entity: 'event',
    account_id: 'acc_test_dmathub',
    event: 'payment.captured',
    id: successEventId,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: successPaymentId,
          order_id: successOrderId,
          amount: correctPricePaise,
          currency: correctCurrency,
          status: 'captured',
          notes: { tenant_id: tenantId, user_id: userId, plan_id: planId },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
  const successRaw = JSON.stringify(successPayload);
  const successSig = razorpayProvider.generateTestWebhookSignature(successRaw);

  const beforeActivationTime = Date.now();
  const successRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': successSig,
    },
    body: successRaw,
  });
  assert(successRes.status === 200, 'Successful payment webhook accepted (HTTP 200)');
  const successData = await successRes.json();
  assert(successData.success === true, 'Webhook returns success: true');
  assert(successData.tier === 'PAID', 'Returns tier: PAID');

  const subId = successData.subscription_id;
  const { data: activatedSub } = await adminClient.from('subscriptions').select('*').eq('id', subId).single();
  assert(activatedSub.status === 'ACTIVE', 'Subscription status in PostgreSQL is ACTIVE');

  // Verify 90-day access window
  const expiryTime = new Date(activatedSub.expires_at).getTime();
  const durationMs = expiryTime - beforeActivationTime;
  const daysGranted = Math.round(durationMs / (24 * 60 * 60 * 1000));
  assert(daysGranted === 90, `Access pass valid for exactly 90 days (calculated: ${daysGranted} days)`);

  console.log('\n--- 5. RE-PURCHASE EXTENSION RULE TEST ---');
  // If active subscription exists and second payment made: new expiry = max(existing, now) + 90 days
  const secondPaymentId = `pay_extend_${Date.now()}`;
  const secondPayload = {
    entity: 'event',
    account_id: 'acc_test_dmathub',
    event: 'payment.captured',
    id: `evt_extend_${Date.now()}`,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: secondPaymentId,
          order_id: `order_extend_${Date.now()}`,
          amount: correctPricePaise,
          currency: correctCurrency,
          status: 'captured',
          notes: { tenant_id: tenantId, user_id: userId, plan_id: planId },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
  const secondRaw = JSON.stringify(secondPayload);
  const secondSig = razorpayProvider.generateTestWebhookSignature(secondRaw);

  const secondRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': secondSig,
    },
    body: secondRaw,
  });
  assert(secondRes.status === 200, 'Second payment webhook accepted (HTTP 200)');

  const { data: extendedSub } = await adminClient.from('subscriptions').select('*').eq('id', subId).single();
  const extendedExpiryTime = new Date(extendedSub.expires_at).getTime();
  const totalDays = Math.round((extendedExpiryTime - beforeActivationTime) / (24 * 60 * 60 * 1000));
  assert(totalDays >= 179 && totalDays <= 181, `Re-purchase extends existing access by additional 90 days (total: ${totalDays} days)`);

  // Clean up test data
  await adminClient.from('payments').delete().eq('provider_payment_id', failedPaymentId);
  await adminClient.from('payments').delete().eq('provider_payment_id', successPaymentId);
  await adminClient.from('payments').delete().eq('provider_payment_id', secondPaymentId);
  await adminClient.from('subscriptions').delete().eq('id', subId);

  console.log('\n================================================================');
  console.log(`ENTITLEMENT ACTIVATION SUITE RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runEntitlementActivationTests().catch((err) => {
  console.error('Fatal error in entitlement activation tests:', err);
  process.exit(1);
});
