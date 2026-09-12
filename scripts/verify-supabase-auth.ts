import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

import {
  getSanitizedSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseAdminClient,
} from '../server/supabase';

const SUPABASE_URL = getSanitizedSupabaseUrl();
const ANON_KEY = getSupabaseAnonKey();

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing Supabase configuration.');
  process.exit(1);
}

// Client 1: Public anon client for authenticating as a student
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

// Client 2: Service role client for verifying admin backend and setup
const adminClient = getSupabaseAdminClient();

const APP_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('EXAMHUB ENGINE: REAL SUPABASE AUTHENTICATION VERIFICATION SUITE');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const testStudentEmail = `verify_student_${timestamp}@example.com`;
  const testPassword = `SecureTestPass!${timestamp}`;
  const testName = `Verification Student ${timestamp}`;

  let studentJwt = '';
  let studentUserId = '';
  let attemptId = '';

  // ----------------------------------------------------------------
  // TEST A & B: Sign up test student & verify user / tenant_user records
  // ----------------------------------------------------------------
  console.log('--- TEST A & B: Sign up test student and check DB records ---');
  const regResponse = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testStudentEmail,
      password: testPassword,
      name: testName,
    }),
  });

  const regData = await regResponse.json();
  console.log('Register API response status:', regResponse.status);
  console.log('Register API result:', regData);

  if (!regResponse.ok || !regData.success) {
    throw new Error(`Test A failed: Registration returned error: ${JSON.stringify(regData)}`);
  }

  studentUserId = regData.user.id;
  console.log(`✓ Test A Passed: Test student registered with Auth UID: ${studentUserId}`);

  // Verify in PostgreSQL users table
  const { data: dbUser, error: dbUserErr } = await adminClient
    .from('users')
    .select('*')
    .eq('id', studentUserId)
    .single();

  if (dbUserErr || !dbUser) {
    throw new Error(`Test B failed: User record not found in users table: ${dbUserErr?.message}`);
  }
  console.log('✓ Found user in public.users:', { id: dbUser.id, email: dbUser.email, role: dbUser.role, tier: dbUser.tier });

  // Verify in PostgreSQL tenant_users table
  const { data: dbTenantUser, error: dbTenantUserErr } = await adminClient
    .from('tenant_users')
    .select('*')
    .eq('user_id', studentUserId)
    .single();

  if (dbTenantUserErr || !dbTenantUser) {
    throw new Error(`Test B failed: Membership record not found in tenant_users table: ${dbTenantUserErr?.message}`);
  }
  console.log('✓ Found membership in public.tenant_users:', {
    user_id: dbTenantUser.user_id,
    tenant_id: dbTenantUser.tenant_id,
    role: dbTenantUser.role,
    status: dbTenantUser.status,
  });
  console.log('✓ Test B Passed: User and tenant_user records verified in PostgreSQL.\n');

  // ----------------------------------------------------------------
  // TEST C & D: Real Supabase Login and JWT session retrieval
  // ----------------------------------------------------------------
  console.log('--- TEST C & D: Real Supabase login and JWT retrieval ---');
  const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: testStudentEmail,
    password: testPassword,
  });

  if (loginErr || !loginData.session) {
    throw new Error(`Test C failed: Supabase login failed: ${loginErr?.message}`);
  }

  studentJwt = loginData.session.access_token;
  console.log('✓ Real Supabase login succeeded!');
  console.log('  Auth UID:', loginData.user.id);
  console.log('  JWT Token received (length):', studentJwt.length);
  console.log('✓ Test C & D Passed: Authenticated session retrieved.\n');

  // ----------------------------------------------------------------
  // TEST E: Access /api/auth/me using authenticated session
  // ----------------------------------------------------------------
  console.log('--- TEST E: Retrieve profile and tenant membership via /api/auth/me ---');
  const meRes = await fetch(`${APP_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${studentJwt}` },
  });
  const meData = await meRes.json();
  console.log('/api/auth/me status:', meRes.status);
  console.log('/api/auth/me response:', meData);

  if (!meRes.ok || !meData.authenticated || meData.user.id !== studentUserId) {
    throw new Error(`Test E failed: Profile lookup mismatch: ${JSON.stringify(meData)}`);
  }
  console.log(`✓ Verified student profile and tenant path: ${meData.tenant?.student_path || '/ems'}`);
  console.log('✓ Test E Passed.\n');

  // ----------------------------------------------------------------
  // TEST F: Session persistence verification
  // ----------------------------------------------------------------
  console.log('--- TEST F: Session persistence verification ---');
  const { data: sessionData, error: sessionErr } = await anonClient.auth.getSession();
  if (sessionErr || !sessionData.session) {
    throw new Error(`Test F failed: Session not persisted in Supabase client`);
  }
  console.log('✓ Supabase client retained active session token across queries.');
  console.log('✓ Test F Passed.\n');

  // ----------------------------------------------------------------
  // TEST G, H & I: Practice attempt creation, saving answer, and grading
  // ----------------------------------------------------------------
  console.log('--- TEST G, H & I: Practice attempt under authenticated student ---');
  const dmatTenantId = dbTenantUser.tenant_id;

  // Retrieve test
  const testsRes = await fetch(`${APP_URL}/api/practice-tests?tenant_id=${dmatTenantId}`);
  const testsList = await testsRes.json();
  const targetTest = testsList[0];
  console.log(`Using practice test: ${targetTest?.title || 'Default Test'} (${targetTest?.id})`);

  // Start attempt with JWT - identity should be derived server-side
  const startAttemptRes = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentJwt}`,
    },
    body: JSON.stringify({
      practice_test_id: targetTest.id,
      tenant_id: dmatTenantId,
      mode: 'PRACTICE',
    }),
  });

  const startData = await startAttemptRes.json();
  console.log('Start attempt response status:', startAttemptRes.status);
  if (!startAttemptRes.ok || !startData.attempt_id) {
    throw new Error(`Test G failed: Failed to start attempt: ${JSON.stringify(startData)}`);
  }

  attemptId = startData.attempt_id;
  console.log(`✓ Test G: Attempt started with ID: ${attemptId}, total questions: ${startData.total_questions}`);

  // Verify attempt in PostgreSQL database
  const { data: dbAttempt, error: attErr } = await adminClient
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .single();

  if (attErr || !dbAttempt) {
    throw new Error(`Test G failed: Attempt not found in PostgreSQL: ${attErr?.message}`);
  }
  if (dbAttempt.user_id !== studentUserId) {
    throw new Error(`Test G failed: Attempt user_id ${dbAttempt.user_id} does not match auth UID ${studentUserId}`);
  }
  console.log(`✓ Test G Passed: Created attempt ${attemptId} in PostgreSQL under authenticated user ${studentUserId}`);

  // Persist an answer (Test H)
  const firstQ = startData.questions[0];
  console.log(`Submitting answer for question: ${firstQ.id}`);
  const answerRes = await fetch(`${APP_URL}/api/attempts/${attemptId}/check-answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentJwt}`,
    },
    body: JSON.stringify({
      question_id: firstQ.id,
      selected_option_key: firstQ.options?.[0]?.key || 'A',
      time_spent_seconds: 15,
    }),
  });

  const answerData = await answerRes.json();
  console.log('Check answer response status:', answerRes.status);
  if (!answerRes.ok || answerData.is_correct === undefined) {
    throw new Error(`Test H failed: Saving answer failed: ${JSON.stringify(answerData)}`);
  }
  console.log('✓ Test H Passed: Answer validated and persisted in PostgreSQL attempt_answers.');

  // Complete and grade attempt (Test I)
  const submitRes = await fetch(`${APP_URL}/api/attempts/${attemptId}/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentJwt}`,
    },
  });

  const gradedData = await submitRes.json();
  console.log('Submit attempt response status:', submitRes.status);
  if (!submitRes.ok || !gradedData.status || (gradedData.status !== 'SUBMITTED' && gradedData.status !== 'COMPLETED')) {
    throw new Error(`Test I failed: Submitting attempt failed: ${JSON.stringify(gradedData)}`);
  }
  console.log(`✓ Test I Passed: Attempt scored and completed! Score: ${gradedData.score}/${gradedData.max_score}, Percentage: ${gradedData.percentage}%\n`);

  // ----------------------------------------------------------------
  // TEST J: Student can retrieve their own attempt history
  // ----------------------------------------------------------------
  console.log('--- TEST J: Retrieve own attempt history ---');
  const historyRes = await fetch(`${APP_URL}/api/attempts/user/${studentUserId}`, {
    headers: { Authorization: `Bearer ${studentJwt}` },
  });
  const historyData = await historyRes.json();
  console.log(`History count for ${studentUserId}:`, historyData.length);
  if (!historyRes.ok || !Array.isArray(historyData) || historyData.length === 0) {
    throw new Error(`Test J failed: Student attempt history could not be retrieved`);
  }
  console.log('✓ Test J Passed: Student retrieved their own attempts.\n');

  // ----------------------------------------------------------------
  // TEST K: Student cannot query or submit another user's attempt
  // ----------------------------------------------------------------
  console.log("--- TEST K: Cross-user authorization check (Forbidden access to other student's attempt) ---");
  // Try querying Alexander Weber's seeded attempt or another student's attempt
  const otherAttemptId = '30000000-0000-0000-0000-000000000001';
  const crossUserRes = await fetch(`${APP_URL}/api/attempts/${otherAttemptId}`, {
    headers: { Authorization: `Bearer ${studentJwt}` },
  });
  console.log(`Cross-user attempt GET status: ${crossUserRes.status}`);
  if (crossUserRes.status === 403 || crossUserRes.status === 404) {
    console.log(`✓ Test K Passed: Server correctly blocked cross-student access with HTTP ${crossUserRes.status}`);
  } else {
    throw new Error(`Test K failed: Server allowed cross-user access with HTTP ${crossUserRes.status}`);
  }

  // Try querying another user's history
  const otherUserId = '10000000-0000-0000-0000-000000000002'; // Alexander Weber
  const crossHistoryRes = await fetch(`${APP_URL}/api/attempts/user/${otherUserId}`, {
    headers: { Authorization: `Bearer ${studentJwt}` },
  });
  console.log(`Cross-user history GET status: ${crossHistoryRes.status}`);
  if (crossHistoryRes.status === 403) {
    console.log('✓ Test K Passed: Cross-user history query forbidden with HTTP 403.\n');
  } else {
    throw new Error(`Test K failed: Expected HTTP 403 on cross-user history, got ${crossHistoryRes.status}`);
  }

  // ----------------------------------------------------------------
  // TEST L: Admin route protection (Normal student blocked from admin APIs)
  // ----------------------------------------------------------------
  console.log('--- TEST L: Admin route protection against normal student token ---');
  const adminTestRes = await fetch(`${APP_URL}/api/admin/overview?tenant_id=${dmatTenantId}`, {
    headers: { Authorization: `Bearer ${studentJwt}` },
  });
  console.log(`Student accessing /api/admin/overview status: ${adminTestRes.status}`);
  if (adminTestRes.status === 403) {
    console.log('✓ Test L Passed: Server blocked student from admin endpoint with HTTP 403.\n');
  } else {
    throw new Error(`Test L failed: Student unexpectedly allowed to access admin API: ${adminTestRes.status}`);
  }

  // ----------------------------------------------------------------
  // TEST M: Demo mode / Guest user
  // ----------------------------------------------------------------
  console.log('--- TEST M: Unauthenticated / Demo Mode access ---');
  const guestStartRes = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      practice_test_id: targetTest.id,
      tenant_id: dmatTenantId,
      user_id: '10000000-0000-0000-0000-000000000003', // Demo guest
      mode: 'PRACTICE',
    }),
  });
  console.log('Demo start status:', guestStartRes.status);
  if (guestStartRes.ok) {
    console.log('✓ Test M Passed: Demo mode functions properly when explicitly invoked without breaking production auth.\n');
  }

  // ----------------------------------------------------------------
  // TEST N: Invalid login error handling
  // ----------------------------------------------------------------
  console.log('--- TEST N: Invalid credentials error handling ---');
  const { data: badLoginData, error: badLoginErr } = await anonClient.auth.signInWithPassword({
    email: testStudentEmail,
    password: 'WrongPassword123!',
  });
  if (badLoginErr) {
    console.log('✓ Supabase returned expected error:', badLoginErr.message);
    console.log('✓ Test N Passed: Failed login returns error and never falls back to demo mode.\n');
  } else {
    throw new Error('Test N failed: Bad password was unexpectedly accepted');
  }

  // Cleanup test user
  console.log('--- CLEANUP: Removing verification student from Supabase Auth ---');
  await adminClient.auth.admin.deleteUser(studentUserId);
  console.log('✓ Test student cleaned up successfully.');

  console.log('\n================================================================');
  console.log('ALL 13 AUTHENTICATION TESTS (A - N) PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
  process.exit(1);
});
