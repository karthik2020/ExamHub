import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient, getRemoteSupabaseUrl, getSupabaseAnonKey } from '../server/supabase';
import { razorpayProvider } from '../server/services/paymentProvider';

const APP_URL = 'http://localhost:3000';
const SUPABASE_URL = getRemoteSupabaseUrl();
const ANON_KEY = getSupabaseAnonKey();

async function runPaymentSecurityTests() {
  console.log('================================================================');
  console.log('RAZORPAY TEST SUITE 1: CHECKOUT & PAYMENT SECURITY TESTS');
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

  const tenantId = 'a0000000-0000-0000-0000-000000000001'; // dMATHub
  const otherTenantId = 'a0000000-0000-0000-0000-000000000002'; // Second tenant

  // Register Student A
  const ts = Date.now();
  const studentAEmail = `rzp_sec_a_${ts}@example.com`;
  const studentPassword = 'SecurePass123!Candidate';

  const regARes = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentAEmail,
      password: studentPassword,
      name: 'Razorpay Student A',
      tenant_id: tenantId,
    }),
  });
  assert(regARes.status === 201, 'Candidate A registered successfully');
  const studentAData = await regARes.json();
  const studentAId = studentAData.user.id;

  const { data: studentAAuth } = await anonClient.auth.signInWithPassword({
    email: studentAEmail,
    password: studentPassword,
  });
  const studentAJwt = studentAAuth.session!.access_token;
  const authHeaderA = `Bearer ${studentAJwt}`;

  // Register Student B
  const studentBEmail = `rzp_sec_b_${ts}@example.com`;
  const regBRes = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentBEmail,
      password: studentPassword,
      name: 'Razorpay Student B',
      tenant_id: tenantId,
    }),
  });
  assert(regBRes.status === 201, 'Candidate B registered successfully');
  const studentBData = await regBRes.json();
  const studentBId = studentBData.user.id;

  const { data: studentBAuth } = await anonClient.auth.signInWithPassword({
    email: studentBEmail,
    password: studentPassword,
  });
  const studentBJwt = studentBAuth.session!.access_token;
  const authHeaderB = `Bearer ${studentBJwt}`;

  // Fetch valid plan from DB
  const validPlanId = 'e1000000-0000-0000-0000-000000000003';
  const { data: dbPlan } = await adminClient.from('plans').select('*').eq('id', validPlanId).single();
  assert(Boolean(dbPlan), `Discovered commercial plan: ${dbPlan?.name} (${dbPlan?.price} ${dbPlan?.currency})`);

  // Create plan belonging to another tenant
  const crossTenantPlanId = crypto.randomUUID();
  await adminClient.from('plans').insert({
    id: crossTenantPlanId,
    tenant_id: otherTenantId,
    name: 'Cross-Tenant Isolated Plan',
    description: 'Isolation test',
    price: 99,
    currency: 'INR',
    billing_interval: 'ONE_TIME',
    status: 'ACTIVE',
    features: ['isolation'],
  });

  console.log('\n--- 1. UNAUTHENTICATED CHECKOUT ---');
  // 1. Unauthenticated checkout -> 401
  const unauthCheckout = await fetch(`${APP_URL}/api/checkout/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_id: validPlanId }),
  });
  assert(unauthCheckout.status === 401, 'Unauthenticated checkout request rejected (HTTP 401)');

  console.log('\n--- 2. INVALID PLAN CHECKOUT ---');
  // 2. Invalid plan -> 4xx
  const invalidPlanCheckout = await fetch(`${APP_URL}/api/checkout/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeaderA },
    body: JSON.stringify({ plan_id: '00000000-0000-0000-0000-000000000000' }),
  });
  assert(invalidPlanCheckout.status === 400 || invalidPlanCheckout.status === 404, 'Invalid plan ID rejected (HTTP 400/404)');

  console.log('\n--- 3. CROSS-TENANT PLAN CHECKOUT ---');
  // 3. Cross-tenant plan -> rejected
  const crossTenantCheckout = await fetch(`${APP_URL}/api/checkout/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeaderA },
    body: JSON.stringify({ plan_id: crossTenantPlanId }),
  });
  assert(crossTenantCheckout.status === 403, 'Cross-tenant plan checkout strictly rejected (HTTP 403)');

  console.log('\n--- 4-7. CLIENT ATTRIBUTE MANIPULATION PREVENTION ---');
  // 4. Client price manipulation: passes price: 1
  // 5. Client currency manipulation: passes currency: "USD"
  // 6. Client duration manipulation: passes duration_days: 999
  // 7. Client tier manipulation: passes user_tier: "PAID"
  const tamperedCheckout = await fetch(`${APP_URL}/api/checkout/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeaderA },
    body: JSON.stringify({
      plan_id: validPlanId,
      price: 1,
      amount: 100,
      currency: 'USD',
      duration_days: 9999,
      user_tier: 'PAID',
      user_id: '00000000-0000-0000-0000-000000000000',
    }),
  });
  assert(tamperedCheckout.status === 200, 'Checkout session created (HTTP 200)');
  const tamperedData = await tamperedCheckout.json();
  const expectedAmountInPaise = Math.round(Number(dbPlan.price) * 100);
  assert(tamperedData.amount === expectedAmountInPaise, `Client price manipulation ignored (amount: ${tamperedData.amount} paise === ${expectedAmountInPaise} paise)`);
  assert(tamperedData.currency === (dbPlan.currency || 'INR').toUpperCase(), `Client currency manipulation ignored (currency: ${tamperedData.currency} === ${(dbPlan.currency || 'INR').toUpperCase()})`);
  assert(tamperedData.plan.duration_days === 90, `Client duration manipulation ignored (duration_days: ${tamperedData.plan.duration_days} === 90)`);
  assert(tamperedData.order_id.startsWith('order_'), `Valid Razorpay order_id created: ${tamperedData.order_id}`);
  assert(tamperedData.key_id !== undefined, 'Returns public key_id for Razorpay Checkout');
  assert(tamperedData.key_secret === undefined, 'Secrets strictly omitted from client response');

  const validOrderId = tamperedData.order_id;
  const validPaymentId = `pay_test_${Date.now()}`;

  console.log('\n--- 8. INVALID RAZORPAY PAYMENT SIGNATURE ---');
  // 8. Invalid signature rejected
  const invalidSigRes = await fetch(`${APP_URL}/api/checkout/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeaderA },
    body: JSON.stringify({
      razorpay_order_id: validOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: '0000000000000000000000000000000000000000000000000000000000000000',
    }),
  });
  assert(invalidSigRes.status === 400, 'Forged payment signature rejected (HTTP 400)');

  console.log('\n--- 13. WRONG ORDER ID ---');
  // 13. Wrong order ID -> rejected
  const wrongOrderSig = razorpayProvider.generateTestPaymentSignature('order_nonexistent_9999', validPaymentId);
  const wrongOrderRes = await fetch(`${APP_URL}/api/checkout/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeaderA },
    body: JSON.stringify({
      razorpay_order_id: 'order_nonexistent_9999',
      razorpay_payment_id: validPaymentId,
      razorpay_signature: wrongOrderSig,
    }),
  });
  assert(wrongOrderRes.status === 400, 'Non-existent order ID rejected (HTTP 400)');

  console.log('\n--- 14. WRONG PAYMENT ID / ORDER RELATIONSHIP ---');
  // 14. Wrong payment ID signature mismatch -> rejected
  const mismatchedSig = razorpayProvider.generateTestPaymentSignature(validOrderId, 'pay_different_payment_id');
  const mismatchedRes = await fetch(`${APP_URL}/api/checkout/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeaderA },
    body: JSON.stringify({
      razorpay_order_id: validOrderId,
      razorpay_payment_id: validPaymentId, // Does not match what was signed
      razorpay_signature: mismatchedSig,
    }),
  });
  assert(mismatchedRes.status === 400, 'Mismatched order/payment relationship rejected (HTTP 400)');

  console.log('\n--- 20. CROSS-USER PAYMENT METADATA ---');
  // 20. Candidate B attempts to verify Candidate A's order
  const validSigA = razorpayProvider.generateTestPaymentSignature(validOrderId, validPaymentId);
  const crossUserVerify = await fetch(`${APP_URL}/api/checkout/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeaderB },
    body: JSON.stringify({
      razorpay_order_id: validOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSigA,
    }),
  });
  assert(crossUserVerify.status === 403, 'Cross-user payment verification attempt strictly rejected (HTTP 403)');

  console.log('\n--- 21. AUTHORITATIVE CHECKOUT VERIFICATION & 90-DAY ACTIVATION ---');
  // 21. Candidate A verifies own valid payment with cryptographic signature
  const validVerifyRes = await fetch(`${APP_URL}/api/checkout/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeaderA },
    body: JSON.stringify({
      razorpay_order_id: validOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSigA,
    }),
  });
  assert(validVerifyRes.status === 200, 'Legitimate checkout verification succeeds (HTTP 200)');
  const validVerifyData = await validVerifyRes.json();
  assert(validVerifyData.success === true, 'Verification returns success: true');
  assert(validVerifyData.tier === 'PAID', 'Candidate tier upgraded to PAID');

  // Verify duplicate checkout verification is idempotent
  const dupeVerifyRes = await fetch(`${APP_URL}/api/checkout/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeaderA },
    body: JSON.stringify({
      razorpay_order_id: validOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSigA,
    }),
  });
  assert(dupeVerifyRes.status === 200, 'Duplicate checkout verification succeeds (HTTP 200)');
  const dupeVerifyData = await dupeVerifyRes.json();
  assert(dupeVerifyData.duplicate === true, 'Duplicate checkout verification recognized as idempotent duplicate');

  // Clean up test data
  if (validVerifyData.subscription_id) {
    await adminClient.from('subscriptions').delete().eq('id', validVerifyData.subscription_id);
  }
  await adminClient.from('payments').delete().eq('provider_payment_id', validPaymentId);
  await adminClient.from('payment_events').delete().eq('provider_event_id', validPaymentId);
  await adminClient.from('plans').delete().eq('id', crossTenantPlanId);
  await adminClient.from('tenant_users').delete().eq('user_id', studentAId);
  await adminClient.from('tenant_users').delete().eq('user_id', studentBId);
  await adminClient.from('users').delete().eq('id', studentAId);
  await adminClient.from('users').delete().eq('id', studentBId);
  await adminClient.auth.admin.deleteUser(studentAId);
  await adminClient.auth.admin.deleteUser(studentBId);

  console.log('\n================================================================');
  console.log(`PAYMENT SECURITY SUITE RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runPaymentSecurityTests().catch((err) => {
  console.error('Fatal error in payment security tests:', err);
  process.exit(1);
});
