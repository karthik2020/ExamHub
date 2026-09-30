import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient, getRemoteSupabaseUrl, getSupabaseAnonKey } from '../server/supabase';
import { razorpayProvider } from '../server/services/paymentProvider';

const APP_URL = 'http://localhost:3000';
const SUPABASE_URL = getRemoteSupabaseUrl();
const ANON_KEY = getSupabaseAnonKey();

async function runAccessRevocationTests() {
  console.log('================================================================');
  console.log('RAZORPAY TEST SUITE 5: REFUND & ACCESS REVOCATION TESTS');
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
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  const tenantId = 'a0000000-0000-0000-0000-000000000001';
  const planId = 'e1000000-0000-0000-0000-000000000003';

  // Register Candidate
  const ts = Date.now();
  const studentEmail = `rzp_revoc_${ts}@example.com`;
  const studentPassword = 'SecurePass123!Revoke';

  const regRes = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword,
      name: 'Revocation Test Candidate',
      tenant_id: tenantId,
    }),
  });
  assert(regRes.status === 201, 'Candidate registered');
  const regData = await regRes.json();
  const userId = regData.user.id;

  const { data: studentAuth } = await anonClient.auth.signInWithPassword({
    email: studentEmail,
    password: studentPassword,
  });
  const studentJwt = studentAuth.session!.access_token;
  const authHeader = `Bearer ${studentJwt}`;

  // Fetch plan
  const { data: plan } = await adminClient.from('plans').select('*').eq('id', planId).single();
  const pricePaise = Math.round(Number(plan.price) * 100);
  const currency = (plan.currency || 'INR').toUpperCase();

  console.log('\n--- 1. ACTIVATE LEGITIMATE ACCESS PASS VIA PAYMENT WEBHOOK ---');
  const paymentId = `pay_revoc_${Date.now()}`;
  const orderId = `order_revoc_${Date.now()}`;
  const paymentEventId = `evt_pay_revoc_${Date.now()}`;

  const payPayload = {
    entity: 'event',
    account_id: 'acc_test_dmathub',
    event: 'payment.captured',
    id: paymentEventId,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: pricePaise,
          currency,
          status: 'captured',
          notes: { tenant_id: tenantId, user_id: userId, plan_id: planId },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
  const payRaw = JSON.stringify(payPayload);
  const paySig = razorpayProvider.generateTestWebhookSignature(payRaw);

  const payRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': paySig,
    },
    body: payRaw,
  });
  assert(payRes.status === 200, 'Payment captured webhook processed (HTTP 200)');
  const payData = await payRes.json();
  const subId = payData.subscription_id;

  // Verify entitlement upgraded to PAID
  const subStatusBefore = await fetch(`${APP_URL}/api/subscriptions/current`, {
    headers: { Authorization: authHeader },
  });
  const subDataBefore = await subStatusBefore.json();
  assert(subDataBefore.tier === 'PAID', 'Candidate tier is PAID after successful payment');
  assert(subDataBefore.entitlement.hasProceduralGeneratorAccess === true, 'Procedural generator enabled');

  console.log('\n--- 2. UNAUTHORIZED CLIENT REFUND ATTEMPTS BLOCKED ---');
  // Client cannot trigger a refund via PostgREST or REST endpoints
  const clientFakeRefund = await fetch(`${APP_URL}/rest/v1/payments?id=eq.${paymentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ status: 'REFUNDED' }),
  });
  assert(clientFakeRefund.status === 403, 'Direct client payment status mutation strictly blocked (HTTP 403)');

  console.log('\n--- 3. AUTHORITATIVE RAZORPAY REFUND EVENT ---');
  // 19. refund -> entitlement revoked
  const refundId = `rfnd_${Date.now()}`;
  const refundEventId = `evt_rfnd_${Date.now()}`;

  const refundPayload = {
    entity: 'event',
    account_id: 'acc_test_dmathub',
    event: 'refund.processed',
    id: refundEventId,
    contains: ['refund', 'payment'],
    payload: {
      refund: {
        entity: {
          id: refundId,
          payment_id: paymentId,
          amount: pricePaise,
          currency,
          status: 'processed',
          notes: { tenant_id: tenantId, user_id: userId, plan_id: planId },
        },
      },
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: pricePaise,
          currency,
          status: 'refunded',
          notes: { tenant_id: tenantId, user_id: userId, plan_id: planId },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
  const refundRaw = JSON.stringify(refundPayload);
  const refundSig = razorpayProvider.generateTestWebhookSignature(refundRaw);

  const refundRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': refundSig,
    },
    body: refundRaw,
  });
  assert(refundRes.status === 200, 'Refund webhook processed successfully (HTTP 200)');
  const refundData = await refundRes.json();
  assert(refundData.action === 'refund_processed', 'Refund action confirmed by payment service');

  // Verify payment status changed to REFUNDED in PostgreSQL
  const { data: updatedPayment } = await adminClient
    .from('payments')
    .select('*')
    .eq('provider_payment_id', paymentId)
    .single();

  assert(updatedPayment.status === 'REFUNDED', 'Payment record in PostgreSQL marked as REFUNDED');

  // Verify subscription expired in PostgreSQL
  const { data: updatedSub } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('id', subId)
    .single();

  assert(updatedSub.status === 'EXPIRED', 'Subscription status in PostgreSQL revoked to EXPIRED');

  // Verify candidate entitlement downgraded in live API
  const subStatusAfter = await fetch(`${APP_URL}/api/subscriptions/current`, {
    headers: { Authorization: authHeader },
  });
  const subDataAfter = await subStatusAfter.json();
  assert(subDataAfter.tier === 'REGISTERED', 'Candidate tier immediately downgraded from PAID to REGISTERED');
  assert(subDataAfter.subscription === null, 'No active subscription returned');
  assert(subDataAfter.entitlement.hasProceduralGeneratorAccess === false, 'Procedural generator access revoked');

  // Cleanup
  await adminClient.from('payments').delete().eq('provider_payment_id', paymentId);
  await adminClient.from('subscriptions').delete().eq('id', subId);
  await adminClient.from('tenant_users').delete().eq('user_id', userId);
  await adminClient.from('users').delete().eq('id', userId);
  await adminClient.auth.admin.deleteUser(userId);

  console.log('\n================================================================');
  console.log(`ACCESS REVOCATION SUITE RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runAccessRevocationTests().catch((err) => {
  console.error('Fatal error in access revocation tests:', err);
  process.exit(1);
});
