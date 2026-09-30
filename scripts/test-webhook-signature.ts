import { config } from 'dotenv';
config();

import crypto from 'crypto';
import { razorpayProvider } from '../server/services/paymentProvider';
import { getSupabaseAdminClient } from '../server/supabase';

const APP_URL = 'http://localhost:3000';

async function runWebhookSignatureTests() {
  console.log('================================================================');
  console.log('RAZORPAY TEST SUITE 2: WEBHOOK CRYPTOGRAPHIC SIGNATURE TESTS');
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

  const adminClient = getSupabaseAdminClient();
  const { data: dbPlan } = await adminClient.from('plans').select('*').eq('id', 'e1000000-0000-0000-0000-000000000003').single();
  const planAmountPaise = Math.round(Number(dbPlan?.price || 2499) * 100);
  const planCurrency = dbPlan?.currency || 'INR';

  const samplePayload = {
    entity: 'event',
    account_id: 'acc_test_dmathub',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: `pay_sig_test_${Date.now()}`,
          order_id: `order_sig_test_${Date.now()}`,
          amount: planAmountPaise,
          currency: planCurrency,
          status: 'captured',
          notes: {
            tenant_id: 'a0000000-0000-0000-0000-000000000001',
            user_id: '10000000-0000-0000-0000-000000000002',
            plan_id: 'e1000000-0000-0000-0000-000000000003',
          },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };

  const rawBody = JSON.stringify(samplePayload);

  console.log('\n--- 1. MISSING WEBHOOK SIGNATURE ---');
  // 9. Missing webhook signature -> 400
  const noSigRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
  });
  assert(noSigRes.status === 400, 'Webhook without X-Razorpay-Signature rejected (HTTP 400)');
  const noSigData = await noSigRes.json();
  assert(noSigData.error === 'Invalid webhook signature', 'Missing signature returns descriptive error');

  console.log('\n--- 2. MALFORMED / TRUNCATED SIGNATURE ---');
  const malformedSigRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': 'invalid_short_sig',
    },
    body: rawBody,
  });
  assert(malformedSigRes.status === 400, 'Malformed/short X-Razorpay-Signature rejected (HTTP 400)');

  console.log('\n--- 3. WRONG SECRET SIGNATURE ---');
  const wrongSecretSig = razorpayProvider.generateTestWebhookSignature(rawBody, 'wrong_test_secret_32bytes_long_fake!');
  const wrongSecretRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': wrongSecretSig,
    },
    body: rawBody,
  });
  assert(wrongSecretRes.status === 400, 'Signature generated with incorrect secret rejected (HTTP 400)');

  console.log('\n--- 4. MODIFIED WEBHOOK BODY (PAYLOAD TAMPERING) ---');
  // 10. Modified webhook body -> rejected
  const validSig = razorpayProvider.generateTestWebhookSignature(rawBody);
  const tamperedPayload = JSON.parse(rawBody);
  tamperedPayload.payload.payment.entity.amount = 1; // Tampered from 2900 to 1
  const tamperedRaw = JSON.stringify(tamperedPayload);

  const tamperedRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': validSig, // Signature of original body
    },
    body: tamperedRaw,
  });
  assert(tamperedRes.status === 400, 'Tampered webhook payload rejected (HTTP 400 HMAC mismatch)');

  console.log('\n--- 5. CRYPTOGRAPHICALLY VALID SIGNATURE ---');
  const validRes = await fetch(`${APP_URL}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': validSig,
    },
    body: rawBody,
  });
  assert(validRes.status === 200, 'Webhook with authentic HMAC-SHA256 signature accepted (HTTP 200)');
  const validData = await validRes.json();
  assert(validData.success === true, 'Webhook processed successfully');

  console.log('\n================================================================');
  console.log(`WEBHOOK SIGNATURE SUITE RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runWebhookSignatureTests().catch((err) => {
  console.error('Fatal error in webhook signature tests:', err);
  process.exit(1);
});
