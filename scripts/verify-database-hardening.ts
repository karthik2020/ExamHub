import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import {
  getSanitizedSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseAdminClient,
} from '../server/supabase';

const SUPABASE_URL = getSanitizedSupabaseUrl();
const ANON_KEY = getSupabaseAnonKey();
const adminClient = getSupabaseAdminClient();
const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const APP_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

async function runHardeningVerification() {
  console.log('================================================================');
  console.log('EXAMHUB ENGINE: DATABASE HARDENING & POSTGREST VULNERABILITY TEST');
  console.log('================================================================');

  if (!adminClient) {
    throw new Error('Supabase admin client unavailable');
  }

  const results: TestResult[] = [];

  // 1. Create a real student account
  const studentEmail = `hardening_test_${Date.now()}@example.com`;
  const studentPassword = 'SecurePassword123!';
  const dmatTenantId = 'a0000000-0000-0000-0000-000000000001';

  console.log('Step 1: Creating real student user...');
  const regRes = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword,
      name: 'Hardening Test Student',
      tenant_id: dmatTenantId,
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.user?.id) {
    throw new Error(`Failed to register student: ${JSON.stringify(regData)}`);
  }
  const studentUserId = regData.user.id;
  console.log(`✓ Student created: ${studentUserId} (${studentEmail})`);

  // 2. Sign in as the student to obtain real student JWT
  console.log('Step 2: Authenticating student to obtain JWT...');
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: studentEmail,
    password: studentPassword,
  });

  if (authError || !authData.session?.access_token) {
    throw new Error(`Failed to log in student: ${authError?.message}`);
  }
  const studentJwt = authData.session.access_token;
  console.log('✓ Received real student JWT token\n');

  // 3. Start a legitimate attempt for this student
  console.log('Step 3: Starting a legitimate exam attempt...');
  const startRes = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentJwt}`,
    },
    body: JSON.stringify({
      practice_test_id: 'e2000000-0000-0000-0000-000000000001',
      tenant_id: dmatTenantId,
    }),
  });

  const startData = await startRes.json();
  if (!startRes.ok || !startData.attempt_id) {
    throw new Error(`Failed to start attempt: ${JSON.stringify(startData)}`);
  }
  const attemptId = startData.attempt_id;
  const firstQuestion = startData.questions[0];
  console.log(`✓ Attempt started: ${attemptId} with Question: ${firstQuestion.id}\n`);

  // Helper function to test direct PostgREST PATCH
  async function testPostgrestPatch(
    table: string,
    query: string,
    payload: Record<string, any>,
    testName: string
  ) {
    const patchUrl = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${studentJwt}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    let resBody: any = null;
    try {
      resBody = await res.json();
    } catch {
      resBody = await res.text();
    }

    const isRejected = res.status === 403 || res.status === 400 || res.status === 401;
    const actualMsg = `HTTP ${res.status} (${resBody?.message || resBody?.error || 'Rejected'})`;

    results.push({
      name: testName,
      expected: 'HTTP 403 (Rejected)',
      actual: actualMsg,
      passed: isRejected,
    });

    console.log(`[ATTACK TEST] ${testName}`);
    console.log(`  Target: PATCH ${patchUrl}`);
    console.log(`  Payload: ${JSON.stringify(payload)}`);
    console.log(`  Result: ${actualMsg} -> ${isRejected ? 'PASS (Correctly Rejected)' : 'FAIL (Unexpectedly Allowed)'}\n`);
  }

  // ----------------------------------------------------------------
  // ATTACK TESTS: PostgREST Authoritative Field Manipulation (Must FAIL)
  // ----------------------------------------------------------------
  console.log('================================================================');
  console.log('RUNNING MANDATED POSTGREST ATTACK TESTS (MUST BE REJECTED)');
  console.log('================================================================\n');

  // Test 1: PATCH own attempt score = 100
  await testPostgrestPatch(
    'attempts',
    `id=eq.${attemptId}`,
    { score: 100 },
    'PATCH own attempt score = 100'
  );

  // Test 2: PATCH own attempt percentage = 100
  await testPostgrestPatch(
    'attempts',
    `id=eq.${attemptId}`,
    { percentage: 100 },
    'PATCH own attempt percentage = 100'
  );

  // Test 3: PATCH own attempt correct_count = 999
  await testPostgrestPatch(
    'attempts',
    `id=eq.${attemptId}`,
    { correct_count: 999 },
    'PATCH own attempt correct_count = 999'
  );

  // Test 4: PATCH own attempt status = SUBMITTED
  await testPostgrestPatch(
    'attempts',
    `id=eq.${attemptId}`,
    { status: 'SUBMITTED' },
    'PATCH own attempt status = SUBMITTED'
  );

  // Test 5: PATCH own attempt user_id = another user
  await testPostgrestPatch(
    'attempts',
    `id=eq.${attemptId}`,
    { user_id: '10000000-0000-0000-0000-000000000002' },
    'PATCH own attempt user_id = another user'
  );

  // Test 6: PATCH own attempt tenant_id = another tenant
  await testPostgrestPatch(
    'attempts',
    `id=eq.${attemptId}`,
    { tenant_id: 'b0000000-0000-0000-0000-000000000001' },
    'PATCH own attempt tenant_id = another tenant'
  );

  // Test 7: PATCH own attempt_answer is_correct = true
  await testPostgrestPatch(
    'attempt_answers',
    `attempt_id=eq.${attemptId}&question_id=eq.${firstQuestion.id}`,
    { is_correct: true },
    'PATCH own attempt_answer is_correct = true'
  );

  // Test 8: PATCH own attempt_answer marks_awarded = 100
  await testPostgrestPatch(
    'attempt_answers',
    `attempt_id=eq.${attemptId}&question_id=eq.${firstQuestion.id}`,
    { marks_awarded: 100 },
    'PATCH own attempt_answer marks_awarded = 100'
  );

  // ----------------------------------------------------------------
  // LEGITIMATE FUNCTIONALITY TESTS (Must PASS)
  // ----------------------------------------------------------------
  console.log('================================================================');
  console.log('RUNNING MANDATED LEGITIMATE CANDIDATE TESTS (MUST PASS)');
  console.log('================================================================\n');

  // Test 9: Legitimate candidate answer saving via API
  console.log('[LEGITIMATE TEST] Candidate saving answer via ExamHub API');
  const saveAnswerRes = await fetch(`${APP_URL}/api/attempts/${attemptId}/check-answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentJwt}`,
    },
    body: JSON.stringify({
      question_id: firstQuestion.id,
      selected_option_key: firstQuestion.options?.[0]?.key || 'A',
      time_spent_seconds: 20,
    }),
  });
  const saveAnswerData = await saveAnswerRes.json();
  const savePassed = saveAnswerRes.ok && saveAnswerData.is_correct !== undefined;
  results.push({
    name: 'legitimate candidate answer saving',
    expected: 'HTTP 200 (Success)',
    actual: `HTTP ${saveAnswerRes.status} (Saved and verified)`,
    passed: savePassed,
  });
  console.log(`  Result: HTTP ${saveAnswerRes.status} -> ${savePassed ? 'PASS' : 'FAIL'}\n`);

  // Test 10: Legitimate attempt continuation (updating elapsed time via PostgREST)
  console.log('[LEGITIMATE TEST] Candidate continuing attempt (updating time_spent_seconds via PostgREST)');
  const contRes = await fetch(`${SUPABASE_URL}/rest/v1/attempts?id=eq.${attemptId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${studentJwt}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      time_spent_seconds: 45,
    }),
  });
  const contPassed = contRes.status === 200 || contRes.status === 204;
  results.push({
    name: 'legitimate attempt continuation',
    expected: 'HTTP 200/204 (Success)',
    actual: `HTTP ${contRes.status} (Continuation permitted)`,
    passed: contPassed,
  });
  console.log(`  Result: HTTP ${contRes.status} -> ${contPassed ? 'PASS' : 'FAIL'}\n`);

  // Test 11: Legitimate ExamHub API submission
  console.log('[LEGITIMATE TEST] Legitimate ExamHub API submission');
  const submitRes = await fetch(`${APP_URL}/api/attempts/${attemptId}/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentJwt}`,
    },
  });
  const submitData = await submitRes.json();
  const submitPassed = submitRes.ok && submitData.status === 'SUBMITTED';
  results.push({
    name: 'legitimate ExamHub API submission',
    expected: 'HTTP 200 (Status: SUBMITTED)',
    actual: `HTTP ${submitRes.status} (Status: ${submitData.status})`,
    passed: submitPassed,
  });
  console.log(`  Result: HTTP ${submitRes.status} -> ${submitPassed ? 'PASS' : 'FAIL'}\n`);

  // Test 12: Server-side authoritative grading
  const gradingPassed =
    typeof submitData.score === 'number' &&
    typeof submitData.max_score === 'number' &&
    typeof submitData.percentage === 'number';
  results.push({
    name: 'server-side authoritative grading',
    expected: 'Authoritative scores calculated',
    actual: `Score: ${submitData.score}/${submitData.max_score} (${submitData.percentage}%)`,
    passed: gradingPassed,
  });
  console.log(`[LEGITIMATE TEST] Server-side authoritative grading: ${submitData.score}/${submitData.max_score} (${submitData.percentage}%) -> ${gradingPassed ? 'PASS' : 'FAIL'}\n`);

  // Test 13: Result persistence in database
  console.log('[LEGITIMATE TEST] Verification of result persistence');
  const fetchAttemptRes = await fetch(`${APP_URL}/api/attempts/${attemptId}`, {
    headers: { Authorization: `Bearer ${studentJwt}` },
  });
  const persistedAttempt = await fetchAttemptRes.json();
  const persistencePassed =
    fetchAttemptRes.ok &&
    persistedAttempt.status === 'SUBMITTED' &&
    persistedAttempt.score === submitData.score;
  results.push({
    name: 'result persistence',
    expected: 'Persisted in database with status SUBMITTED',
    actual: `Status: ${persistedAttempt.status}, Score: ${persistedAttempt.score}`,
    passed: persistencePassed,
  });
  console.log(`  Result: Status ${persistedAttempt.status}, Score ${persistedAttempt.score} -> ${persistencePassed ? 'PASS' : 'FAIL'}\n`);

  // Clean up
  console.log('Cleaning up verification user...');
  await adminClient.auth.admin.deleteUser(studentUserId);
  console.log('✓ Cleanup complete.\n');

  // Print Summary Table
  console.log('================================================================');
  console.log('FINAL VERIFICATION RESULTS REPORT');
  console.log('================================================================');
  console.log('Test | Expected | Actual | PASS/FAIL');
  console.log('---|---|---|---');
  for (const r of results) {
    console.log(`${r.name} | ${r.expected} | ${r.actual} | ${r.passed ? 'PASS' : 'FAIL'}`);
  }
  console.log('================================================================');

  const allPassed = results.every((r) => r.passed);
  if (!allPassed) {
    throw new Error('One or more hardening tests failed');
  }
  console.log('\n✓ ALL MANDATED TESTS PASSED WITH ZERO VULNERABILITIES DETECTED!');
}

runHardeningVerification().catch((err) => {
  console.error('\n❌ HARDENING VERIFICATION FAILED:', err);
  process.exit(1);
});
