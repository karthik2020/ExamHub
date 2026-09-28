import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient, getRemoteSupabaseUrl, getSupabaseAnonKey } from '../server/supabase';
import { resolveUserEntitlement } from '../src/types/entitlements';

const APP_URL = 'http://localhost:3000';
const SUPABASE_URL = getRemoteSupabaseUrl();
const ANON_KEY = getSupabaseAnonKey();

async function runPhase3AVerification() {
  console.log('================================================================');
  console.log('EXAMHUB PHASE 3A: LIVE VERIFICATION & SECURITY AUDIT SUITE');
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
  const examId = 'e0000000-0000-0000-0000-000000000001';
  const sectionId = 'b0000000-0000-0000-0000-000000000001';

  // Find or create a fixed practice test, a generated test, and a mock test for testing
  const { data: fixedTests } = await adminClient
    .from('practice_tests')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('test_type', 'PRACTICE')
    .eq('question_selection_mode', 'FIXED')
    .eq('is_published', true)
    .limit(1);

  const fixedTest = fixedTests?.[0];
  assert(Boolean(fixedTest), `Discovered fixed practice test: ${fixedTest?.name} (${fixedTest?.id})`);

  // Create temporary generated practice test
  const tempGenTestId = crypto.randomUUID();
  const { data: genTest } = await adminClient
    .from('practice_tests')
    .insert([
      {
        id: tempGenTestId,
        tenant_id: tenantId,
        exam_id: examId,
        section_id: sectionId,
        name: 'Phase 3A Security Audit Generated Test',
        description: 'Temporary generated test for entitlement verification',
        test_type: 'PRACTICE',
        question_selection_mode: 'GENERATED',
        difficulty: 'MEDIUM',
        question_count: 2,
        time_limit_minutes: 10,
        is_published: true,
      },
    ])
    .select()
    .single();
  assert(Boolean(genTest), `Created temporary generated test: ${genTest?.name}`);

  // Create temporary mock test
  const tempMockTestId = crypto.randomUUID();
  const { data: mockTest } = await adminClient
    .from('practice_tests')
    .insert([
      {
        id: tempMockTestId,
        tenant_id: tenantId,
        exam_id: examId,
        section_id: sectionId,
        name: 'Phase 3A Security Audit Mock Test',
        description: 'Temporary mock exam for guest gating verification',
        test_type: 'MOCK',
        question_selection_mode: 'FIXED',
        difficulty: 'HARD',
        question_count: 5,
        time_limit_minutes: 30,
        is_published: true,
      },
    ])
    .select()
    .single();
  assert(Boolean(mockTest), `Created temporary mock exam: ${mockTest?.name}`);

  // Register a legitimate student
  const studentTimestamp = Date.now();
  const studentEmail = `p3a_audit_${studentTimestamp}@example.com`;
  const studentPassword = 'AuditPass123!Secure';

  const regRes = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword,
      name: 'Phase 3A Audit Student',
      tenant_id: tenantId,
      tenant_slug: 'dmathub',
    }),
  });
  assert(regRes.status === 201, 'Student registered successfully via /api/auth/register');
  const regData = await regRes.json();
  const studentUserId = regData.user.id;

  const { data: studentAuth } = await anonClient.auth.signInWithPassword({
    email: studentEmail,
    password: studentPassword,
  });
  const studentJwt = studentAuth.session!.access_token;
  const studentAuthHeader = `Bearer ${studentJwt}`;
  assert(Boolean(studentJwt), `Student logged in, received real JWT session`);

  // Admin token (demo super admin for testing)
  const adminAuthHeader = 'Bearer demo-super-admin';

  console.log('\n--- SUITE 1: ENTITLEMENT BYPASS ATTEMPTS AGAINST LIVE API ---');

  // Attack 1: Unauthenticated GUEST attempts to start GENERATED test with client-spoofed PAID tier & SUPER_ADMIN role
  const guestSpoofGen = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      practice_test_id: tempGenTestId,
      tenant_id: tenantId,
      user_tier: 'PAID',
      user_role: 'SUPER_ADMIN',
    }),
  });
  assert(guestSpoofGen.status === 403, 'Guest spoofing user_tier: PAID on GENERATED test strictly rejected (HTTP 403)');
  const guestSpoofData = await guestSpoofGen.json();
  assert(guestSpoofData.code === 'UPGRADE_REQUIRED', 'Guest spoof rejected with UPGRADE_REQUIRED error code');

  // Attack 2: Unauthenticated GUEST attempts to start a MOCK examination
  const guestMockAttempt = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      practice_test_id: tempMockTestId,
      tenant_id: tenantId,
      user_tier: 'PAID',
    }),
  });
  assert(guestMockAttempt.status === 403, 'Guest attempting to start MOCK test rejected (HTTP 403)');
  const guestMockData = await guestMockAttempt.json();
  assert(guestMockData.code === 'REGISTRATION_REQUIRED', 'Guest rejected from MOCK test with REGISTRATION_REQUIRED');

  // Attack 3: REGISTERED student (without subscription) attempts to start GENERATED test with spoofed user_tier: 'PAID'
  const regSpoofGen = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({
      practice_test_id: tempGenTestId,
      tenant_id: tenantId,
      user_tier: 'PAID',
    }),
  });
  assert(regSpoofGen.status === 403, 'Registered student spoofing user_tier: PAID rejected (HTTP 403)');
  const regSpoofData = await regSpoofGen.json();
  assert(regSpoofData.code === 'UPGRADE_REQUIRED', 'Registered student rejected with UPGRADE_REQUIRED (authoritative subscription enforced)');

  // Attack 4: Unauthenticated access to admin routes
  const unauthAdminPost = await fetch(`${APP_URL}/api/admin/practice-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Malicious Test' }),
  });
  assert(unauthAdminPost.status === 401, 'Unauthenticated request to POST /api/admin/practice-tests blocked (HTTP 401)');

  // Attack 5: Student JWT attempting to access admin route
  const studentAdminPost = await fetch(`${APP_URL}/api/admin/practice-tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({ name: 'Unauthorized Student Test' }),
  });
  assert(studentAdminPost.status === 403, 'Student JWT accessing POST /api/admin/practice-tests blocked (HTTP 403)');

  // Attack 6: Student JWT attempting to create curriculum section
  const studentSectionPost = await fetch(`${APP_URL}/api/admin/sections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({ exam_id: examId, name: 'Hacked Section' }),
  });
  assert(studentSectionPost.status === 403, 'Student JWT accessing POST /api/admin/sections blocked (HTTP 403)');

  // Attack 7: Student JWT attempting to create curriculum topic
  const studentTopicPost = await fetch(`${APP_URL}/api/admin/topics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({ section_id: sectionId, name: 'Hacked Topic' }),
  });
  assert(studentTopicPost.status === 403, 'Student JWT accessing POST /api/admin/topics blocked (HTTP 403)');

  console.log('\n--- SUITE 2: FREE / PAID / PRO BEHAVIOR VERIFICATION ---');

  // 1. FREE GUEST Behavior
  console.log(' Testing FREE GUEST behavior:');
  const guestStart = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      practice_test_id: fixedTest.id,
      tenant_id: tenantId,
      question_count: 50, // Guest limit is 10 max
    }),
  });
  assert(guestStart.status === 200, 'Guest can legitimately start fixed practice test (HTTP 200)');
  const guestStartData = await guestStart.json();
  assert(guestStartData.questions.length <= 10, `Guest question count strictly capped at ${guestStartData.questions.length} <= 10`);
  assert(guestStartData.questions[0].correct_answer === undefined, 'Guest questions conceal correct_answer');
  assert(guestStartData.questions[0].explanation === undefined, 'Guest questions conceal explanation');

  const guestSessionToken = guestStartData.guest_session_token;
  assert(Boolean(guestSessionToken), 'Guest received secure session token');

  // Submit guest attempt
  const guestSubmit = await fetch(`${APP_URL}/api/attempts/${guestStartData.attempt_id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-session': guestSessionToken,
    },
    body: JSON.stringify({ time_spent_seconds: 15 }),
  });
  assert(guestSubmit.status === 200, 'Guest submit attempt returns HTTP 200');

  // Review guest attempt: Guest does NOT receive detailed step explanations
  const guestReview = await fetch(`${APP_URL}/api/attempts/${guestStartData.attempt_id}`, {
    headers: { 'x-guest-session': guestSessionToken },
  });
  assert(guestReview.status === 200, 'Guest retrieve completed attempt returns HTTP 200');
  const guestReviewData = await guestReview.json();
  const guestReviewedQ = guestReviewData.questions?.[0];
  assert(guestReviewedQ.explanation === null || guestReviewedQ.explanation === undefined, 'Guest post-submission review conceals step-by-step explanations');

  // 2. REGISTERED Student Behavior
  console.log(' Testing REGISTERED student behavior:');
  const regStart = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({
      practice_test_id: fixedTest.id,
      tenant_id: tenantId,
      question_count: 5,
    }),
  });
  assert(regStart.status === 200, 'Registered student starts fixed practice test (HTTP 200)');
  const regStartData = await regStart.json();

  // Registered student can start timed mock test
  const regMockStart = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({
      practice_test_id: tempMockTestId,
      tenant_id: tenantId,
    }),
  });
  assert(regMockStart.status === 200, 'Registered student can access timed MOCK exams (HTTP 200)');
  const regMockData = await regMockStart.json();

  // Submit registered mock attempt
  const regMockSubmit = await fetch(`${APP_URL}/api/attempts/${regMockData.attempt_id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({ time_spent_seconds: 60 }),
  });
  assert(regMockSubmit.status === 200, 'Registered student submit attempt returns HTTP 200');

  // Review registered attempt: Registered student DOES receive detailed step explanations
  const regReview = await fetch(`${APP_URL}/api/attempts/${regMockData.attempt_id}`, {
    headers: { Authorization: studentAuthHeader },
  });
  assert(regReview.status === 200, 'Registered student retrieve completed attempt returns HTTP 200');
  const regReviewData = await regReview.json();
  const regReviewedQ = regReviewData.questions?.[0];
  assert(Boolean(regReviewedQ?.explanation), 'Registered candidate receives detailed step explanations in post-submission review');

  console.log('\n--- SUITE 3: INSPECT SUBSCRIPTION AUTHORITY ---');

  // 1. Check current subscription status before Pro subscription
  const subBefore = await fetch(`${APP_URL}/api/subscriptions/current`, {
    headers: { Authorization: studentAuthHeader },
  });
  assert(subBefore.status === 200, 'GET /api/subscriptions/current returns HTTP 200');
  const subBeforeData = await subBefore.json();
  assert(subBeforeData.tier === 'REGISTERED', 'Candidate tier is REGISTERED prior to active subscription');
  assert(subBeforeData.subscription === null, 'No active subscription object present');
  assert(subBeforeData.entitlement.hasProceduralGeneratorAccess === false, 'Procedural generator access is false');
  assert(Array.isArray(subBeforeData.plans) && subBeforeData.plans.length > 0, `Returned ${subBeforeData.plans.length} commercial pricing plans`);

  // 2. Grant active Pro subscription in PostgreSQL
  const subId = crypto.randomUUID();
  const proPlanId = 'e1000000-0000-0000-0000-000000000003'; // Pro Unlimited Generator
  const { error: subInsertErr } = await adminClient.from('subscriptions').insert({
    id: subId,
    user_id: studentUserId,
    tenant_id: tenantId,
    plan_id: proPlanId,
    status: 'ACTIVE',
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  assert(!subInsertErr, 'Inserted authoritative ACTIVE Pro subscription in PostgreSQL');

  // 3. Verify real-time upgrade in /api/subscriptions/current
  const subAfter = await fetch(`${APP_URL}/api/subscriptions/current`, {
    headers: { Authorization: studentAuthHeader },
  });
  assert(subAfter.status === 200, 'GET /api/subscriptions/current returns HTTP 200 after upgrade');
  const subAfterData = await subAfter.json();
  assert(subAfterData.tier === 'PAID', 'Authoritative tier upgraded to PAID based on database subscription');
  assert(subAfterData.subscription?.id === subId, 'Subscription record accurately reflects database entry');
  assert(subAfterData.entitlement.hasProceduralGeneratorAccess === true, 'Entitlement reflects hasProceduralGeneratorAccess: true');

  // 4. Test PRO behavior: PRO student can now execute GENERATED test
  const proGenStart = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({
      practice_test_id: tempGenTestId,
      tenant_id: tenantId,
      difficulty: 'HARD',
      question_count: 2,
    }),
  });
  assert(proGenStart.status === 200, 'PRO student can start live GENERATED practice test (HTTP 200)');
  const proGenData = await proGenStart.json();
  assert(proGenData.questions.length === 2, 'Generated 2 questions successfully on the fly');

  // 5. Test EXPIRED subscription authority: Set subscription expires_at in the past
  await adminClient.from('subscriptions').update({
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  }).eq('id', subId);

  const subExpired = await fetch(`${APP_URL}/api/subscriptions/current`, {
    headers: { Authorization: studentAuthHeader },
  });
  const subExpiredData = await subExpired.json();
  assert(subExpiredData.tier === 'REGISTERED', 'Expired subscription automatically falls back to REGISTERED tier');
  assert(subExpiredData.entitlement.hasProceduralGeneratorAccess === false, 'Expired subscription revokes procedural generator access');

  // Attempt to start GENERATED test with expired subscription
  const expiredGenStart = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({
      practice_test_id: tempGenTestId,
      tenant_id: tenantId,
    }),
  });
  assert(expiredGenStart.status === 403, 'Candidate with expired subscription blocked from GENERATED test (HTTP 403)');

  console.log('\n--- SUITE 4: VERIFY ADMIN CRUD AUTHORIZATION ---');

  // 1. Admin creates a syllabus section
  const sectionPayload = {
    exam_id: examId,
    name: 'Phase 3A Verified Curriculum Section',
    slug: `p3a-sec-${Date.now()}`,
    display_order: 99,
    description: 'Admin CRUD verification section',
  };
  const createSecRes = await fetch(`${APP_URL}/api/admin/sections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: adminAuthHeader,
    },
    body: JSON.stringify(sectionPayload),
  });
  assert(createSecRes.status === 201, 'Admin can create curriculum section via POST /api/admin/sections (HTTP 201)');
  const createdSec = await createSecRes.json();
  assert(Boolean(createdSec?.id), `Created section ID: ${createdSec.id}`);

  // 2. Admin creates a syllabus topic
  const topicPayload = {
    section_id: createdSec.id,
    name: 'Phase 3A Verified Curriculum Topic',
    slug: `p3a-top-${Date.now()}`,
    display_order: 1,
    description: 'Admin CRUD verification topic',
  };
  const createTopRes = await fetch(`${APP_URL}/api/admin/topics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: adminAuthHeader,
    },
    body: JSON.stringify(topicPayload),
  });
  assert(createTopRes.status === 201, 'Admin can create curriculum topic via POST /api/admin/topics (HTTP 201)');
  const createdTop = await createTopRes.json();
  assert(Boolean(createdTop?.id), `Created topic ID: ${createdTop.id}`);

  // 3. Admin creates a practice test
  const testPayload = {
    tenant_id: tenantId,
    exam_id: examId,
    section_id: createdSec.id,
    name: 'Phase 3A Verified Practice Test',
    description: 'Admin CRUD verification practice test',
    test_type: 'PRACTICE',
    question_selection_mode: 'FIXED',
    difficulty: 'MEDIUM',
    question_count: 1,
    time_limit_minutes: 15,
    is_published: true,
    question_ids: [fixedTest.id ? fixedTests[0].id : ''],
  };
  const createTestRes = await fetch(`${APP_URL}/api/admin/practice-tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: adminAuthHeader,
    },
    body: JSON.stringify(testPayload),
  });
  assert(createTestRes.status === 201, 'Admin can create practice test via POST /api/admin/practice-tests (HTTP 201)');
  const createdTest = await createTestRes.json();
  assert(Boolean(createdTest?.id), `Created test ID: ${createdTest.id}`);

  // 4. Admin updates the practice test
  const updateTestRes = await fetch(`${APP_URL}/api/admin/practice-tests/${createdTest.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: adminAuthHeader,
    },
    body: JSON.stringify({
      name: 'Phase 3A Updated Practice Test Name',
      time_limit_minutes: 25,
    }),
  });
  assert(updateTestRes.status === 200, 'Admin can update practice test via PUT /api/admin/practice-tests/:id (HTTP 200)');
  const updatedTest = await updateTestRes.json();
  assert(updatedTest.name === 'Phase 3A Updated Practice Test Name', 'Practice test name was updated in PostgreSQL');
  assert(updatedTest.time_limit_minutes === 25, 'Practice test time limit was updated in PostgreSQL');

  // 5. Admin deletes the practice test
  const deleteTestRes = await fetch(`${APP_URL}/api/admin/practice-tests/${createdTest.id}`, {
    method: 'DELETE',
    headers: { Authorization: adminAuthHeader },
  });
  assert(deleteTestRes.status === 200, 'Admin can delete practice test via DELETE /api/admin/practice-tests/:id (HTTP 200)');

  // Verify deletion
  const getDeleted = await fetch(`${APP_URL}/api/practice-tests/${createdTest.id}`);
  assert(getDeleted.status === 404, 'Deleted practice test returns HTTP 404');

  // Clean up created topic and section
  await adminClient.from('topics').delete().eq('id', createdTop.id);
  await adminClient.from('exam_sections').delete().eq('id', createdSec.id);

  console.log('\n--- SUITE 5: QUESTION-BANK & PRACTICE-TEST READINESS AUDIT ---');

  // Query actual question counts
  const { data: allQuestions } = await adminClient
    .from('questions')
    .select('id, question_type, difficulty, status, section_id, correct_answer, options:question_options(id, option_key, is_correct)');

  const totalQuestions = allQuestions?.length || 0;
  const publishedQuestions = allQuestions?.filter((q) => q.status === 'PUBLISHED') || [];
  const easyQuestions = publishedQuestions.filter((q) => q.difficulty === 'EASY');
  const medQuestions = publishedQuestions.filter((q) => q.difficulty === 'MEDIUM');
  const hardQuestions = publishedQuestions.filter((q) => q.difficulty === 'HARD');

  const withValidOptions = publishedQuestions.filter((q) => {
    return q.options && q.options.length >= 4 && Boolean(q.correct_answer);
  });

  console.log(`\n  [Question Bank Audit Report]`);
  console.log(`  • Total questions in PostgreSQL: ${totalQuestions}`);
  console.log(`  • Total published questions: ${publishedQuestions.length}`);
  console.log(`  • Difficulty distribution: EASY=${easyQuestions.length}, MEDIUM=${medQuestions.length}, HARD=${hardQuestions.length}`);
  console.log(`  • Questions with valid 4+ options & designated answer: ${withValidOptions.length} (${Math.round((withValidOptions.length / (publishedQuestions.length || 1)) * 100)}%)`);

  assert(publishedQuestions.length >= 50, `Published question bank meets commercial threshold (found ${publishedQuestions.length} >= 50)`);
  assert(withValidOptions.length === publishedQuestions.length, '100% of published questions have valid options and designated correct answers');

  // Query actual practice tests
  const { data: allPracticeTests } = await adminClient
    .from('practice_tests')
    .select('id, name, test_type, question_selection_mode, difficulty, question_count, is_published');

  const publishedTests = allPracticeTests?.filter((t) => t.is_published && t.id !== tempGenTestId && t.id !== tempMockTestId) || [];
  const fixedModeTests = publishedTests.filter((t) => t.question_selection_mode === 'FIXED');
  const genModeTests = publishedTests.filter((t) => t.question_selection_mode === 'GENERATED');
  const mockExamTests = publishedTests.filter((t) => t.test_type === 'MOCK');

  console.log(`\n  [Practice Test Readiness Report]`);
  console.log(`  • Total published tests: ${publishedTests.length}`);
  console.log(`  • Fixed practice tests: ${fixedModeTests.length}`);
  console.log(`  • Procedural generated tests: ${genModeTests.length}`);
  console.log(`  • Full mock examinations: ${mockExamTests.length}`);

  assert(fixedModeTests.length >= 1, 'At least 1 active fixed diagnostic test configured');
  assert(genModeTests.length >= 1, 'At least 1 active procedural generator drill configured');
  assert(mockExamTests.length >= 1, 'At least 1 active timed mock examination configured');

  // Cleanup temporary tests and student
  console.log('\n--- CLEANUP ---');
  await adminClient.from('practice_tests').delete().eq('id', tempGenTestId);
  await adminClient.from('practice_tests').delete().eq('id', tempMockTestId);
  await adminClient.from('subscriptions').delete().eq('id', subId);
  await adminClient.from('tenant_users').delete().eq('user_id', studentUserId);
  await adminClient.from('users').delete().eq('id', studentUserId);
  await adminClient.auth.admin.deleteUser(studentUserId);
  console.log('  ✓ Cleaned up temporary tests, subscriptions, and audit user.');

  console.log('\n================================================================');
  console.log(`PHASE 3A VERIFICATION RESULTS: ${passed}/${total} ASSERTIONS PASSED (${passed === total ? '100% GREEN' : 'FAILED'})`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase3AVerification().catch((err) => {
  console.error('Fatal error during Phase 3A verification:', err);
  process.exit(1);
});
