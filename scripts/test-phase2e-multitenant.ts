import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

import {
  getSanitizedSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseAdminClient,
} from '../server/supabase';
import { questionPluginRegistry } from '../src/generator';
import { GuestSessionManager } from '../server/guestSession';

const SUPABASE_URL = getSanitizedSupabaseUrl();
const ANON_KEY = getSupabaseAnonKey();
const APP_URL = 'http://localhost:3000';

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const adminClient = getSupabaseAdminClient();
if (!adminClient) {
  console.error('Missing Supabase admin client.');
  process.exit(1);
}

// Color helpers for terminal output
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    failedCount++;
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPhase2ETests() {
  console.log(bold('================================================================'));
  console.log(bold('EXAMHUB PHASE 2E: MULTI-TENANT VERIFICATION & REGRESSION SUITE'));
  console.log(bold('================================================================\n'));

  const timestamp = Date.now();

  // ====================================================================
  // SUITE 1: MULTI-TENANT DISCOVERY & RESOLUTION (dMATHub vs NISM Prep Hub)
  // ====================================================================
  console.log(cyan('--- SUITE 1: Multi-Tenant Discovery & Resolution ---'));

  // Query tenants from API
  const tenantsResp = await fetch(`${APP_URL}/api/tenants`);
  assert(tenantsResp.ok, 'Tenants API endpoint returns HTTP 200');
  const tenants = await tenantsResp.json();
  assert(Array.isArray(tenants) && tenants.length >= 2, `Discovered ${tenants.length} tenants (expected >= 2)`);

  const dmatTenant = tenants.find((t: any) => t.slug === 'dmathub');
  const nismTenant = tenants.find((t: any) => t.slug === 'nismprep');

  assert(!!dmatTenant, 'Tenant A (dMATHub) found in registry');
  assert(dmatTenant.name === 'dMATHub', `Tenant A name matches: "${dmatTenant.name}"`);
  assert(dmatTenant.student_path === '/ems', `Tenant A student path is "${dmatTenant.student_path}"`);
  assert(dmatTenant.primary_color === '#0f766e', `Tenant A primary color is "${dmatTenant.primary_color}"`);

  assert(!!nismTenant, 'Tenant B (NISM Prep Hub) found in registry');
  assert(nismTenant.name === 'NISM Prep Hub', `Tenant B name matches: "${nismTenant.name}"`);
  assert(nismTenant.student_path === '/portal', `Tenant B student path is "${nismTenant.student_path}"`);
  assert(nismTenant.primary_color === '#1e3a8a', `Tenant B primary color is "${nismTenant.primary_color}"`);
  assert(nismTenant.secondary_color === '#b45309', `Tenant B secondary color is "${nismTenant.secondary_color}"`);

  // Direct Slug Resolution
  const dmatBySlugResp = await fetch(`${APP_URL}/api/tenants/dmathub`);
  assert(dmatBySlugResp.ok, 'Resolve dMATHub by slug returns HTTP 200');
  const dmatBySlug = await dmatBySlugResp.json();
  assert(dmatBySlug.id === dmatTenant.id, 'Resolved dMATHub UUID matches');

  const nismBySlugResp = await fetch(`${APP_URL}/api/tenants/nismprep`);
  assert(nismBySlugResp.ok, 'Resolve NISM Prep Hub by slug returns HTTP 200');
  const nismBySlug = await nismBySlugResp.json();
  assert(nismBySlug.id === nismTenant.id, 'Resolved NISM Prep Hub UUID matches');

  // ====================================================================
  // SUITE 2: EXAM DISCOVERY & TENANT-SCOPED RESOLUTION
  // ====================================================================
  console.log(cyan('\n--- SUITE 2: Exam Discovery & Tenant Scoping ---'));

  // Exams for dMATHub
  const dmatExamsResp = await fetch(`${APP_URL}/api/exams?tenant_id=${dmatTenant.id}`);
  assert(dmatExamsResp.ok, 'Fetch exams for dMATHub returns HTTP 200');
  const dmatExams = await dmatExamsResp.json();
  assert(dmatExams.length >= 1, `dMATHub has ${dmatExams.length} active exam(s)`);
  const dmatExam = dmatExams[0];
  assert(dmatExam.slug === 'dmat', `dMAT exam slug matches: "${dmatExam.slug}"`);
  assert(dmatExam.tenant_id === dmatTenant.id, 'dMAT exam is strictly bound to dMATHub tenant_id');

  // Exams for NISM Prep Hub
  const nismExamsResp = await fetch(`${APP_URL}/api/exams?tenant_id=${nismTenant.id}`);
  assert(nismExamsResp.ok, 'Fetch exams for NISM Prep Hub returns HTTP 200');
  const nismExams = await nismExamsResp.json();
  console.log(`  ℹ NISM Prep Hub exams in seed data: ${nismExams.length}`);
  assert(Array.isArray(nismExams), 'NISM exams returned as valid array');

  // Verify that dMAT exam is NOT returned when querying NISM tenant
  const leakCheck = nismExams.some((e: any) => e.id === dmatExam.id);
  assert(!leakCheck, 'Cross-tenant leak check: dMAT exam is NOT present in NISM exam list');

  // ====================================================================
  // SUITE 3: CURRICULUM & SECTIONS SCOPING
  // ====================================================================
  console.log(cyan('\n--- SUITE 3: Curriculum & Section Scoping ---'));

  const dmatSectionsResp = await fetch(`${APP_URL}/api/exams/${dmatExam.id}/sections`);
  assert(dmatSectionsResp.ok, 'Fetch sections for dMAT exam returns HTTP 200');
  const dmatSections = await dmatSectionsResp.json();
  assert(dmatSections.length === 4, `dMAT exam has exactly 4 sections (found ${dmatSections.length})`);
  assert(dmatSections.every((s: any) => s.exam_id === dmatExam.id), 'All sections strictly belong to dMAT exam');

  const figSeqSection = dmatSections.find((s: any) => s.slug === 'figure-sequences');
  assert(!!figSeqSection, 'Figure Sequences section found in dMAT curriculum');

  const topicsResp = await fetch(`${APP_URL}/api/topics?section_id=${figSeqSection.id}`);
  assert(topicsResp.ok, 'Fetch topics for Figure Sequences returns HTTP 200');
  const topics = await topicsResp.json();
  assert(topics.length >= 1, `Figure Sequences section has ${topics.length} topics`);
  assert(topics.every((t: any) => t.section_id === figSeqSection.id), 'Topics strictly belong to Figure Sequences');

  // ====================================================================
  // SUITE 4: PRACTICE TESTS & QUESTION BANK SCOPING
  // ====================================================================
  console.log(cyan('\n--- SUITE 4: Practice Tests & Question Bank Scoping ---'));

  const dmatTestsResp = await fetch(`${APP_URL}/api/practice-tests?tenant_id=${dmatTenant.id}&exam_id=${dmatExam.id}`);
  assert(dmatTestsResp.ok, 'Fetch practice tests for dMAT returns HTTP 200');
  const dmatTests = await dmatTestsResp.json();
  assert(dmatTests.length >= 1, `dMAT has ${dmatTests.length} practice test(s)`);
  assert(dmatTests.every((t: any) => t.tenant_id === dmatTenant.id), 'All practice tests match dMATHub tenant_id');
  assert(dmatTests.every((t: any) => t.exam_id === dmatExam.id), 'All practice tests match dMAT exam_id');

  // Check NISM practice tests
  const nismTestsResp = await fetch(`${APP_URL}/api/practice-tests?tenant_id=${nismTenant.id}`);
  assert(nismTestsResp.ok, 'Fetch practice tests for NISM returns HTTP 200');
  const nismTests = await nismTestsResp.json();
  assert(nismTests.every((t: any) => t.tenant_id === nismTenant.id), 'NISM practice tests scoped to NISM');
  assert(!nismTests.some((t: any) => t.tenant_id === dmatTenant.id), 'No dMAT practice tests leak into NISM query');

  // Admin Question Bank Scoping
  const dmatQuestionsResp = await fetch(`${APP_URL}/api/admin/questions?tenant_id=${dmatTenant.id}&exam_id=${dmatExam.id}`, {
    headers: { 'x-demo-role': 'SUPER_ADMIN' },
  });
  assert(dmatQuestionsResp.ok, 'Fetch admin questions for dMAT returns HTTP 200');
  const dmatQuestions = await dmatQuestionsResp.json();
  assert(dmatQuestions.length >= 40, `dMAT question bank has ${dmatQuestions.length} questions (expected >= 40)`);
  assert(dmatQuestions.every((q: any) => q.tenant_id === dmatTenant.id), 'All dMAT questions match dMATHub tenant_id');
  assert(dmatQuestions.every((q: any) => q.exam_id === dmatExam.id), 'All dMAT questions match dMAT exam_id');

  const nismQuestionsResp = await fetch(`${APP_URL}/api/admin/questions?tenant_id=${nismTenant.id}`, {
    headers: { 'x-demo-role': 'SUPER_ADMIN' },
  });
  assert(nismQuestionsResp.ok, 'Fetch admin questions for NISM returns HTTP 200');
  const nismQuestions = await nismQuestionsResp.json();
  assert(nismQuestions.length === 0, `NISM has 0 questions in seed (found ${nismQuestions.length})`);
  assert(!nismQuestions.some((q: any) => q.tenant_id === dmatTenant.id), 'No dMAT questions leak into NISM query');

  // ====================================================================
  // SUITE 5: COMPLETE STUDENT JOURNEY (dMATHub / dMAT)
  // ====================================================================
  console.log(cyan('\n--- SUITE 5: Full Student Journey (dMATHub / dMAT) ---'));

  // 1. Create a dedicated test student in Supabase Auth
  const studentEmail = `student_2e_${timestamp}@example.com`;
  const studentPassword = `Password2E!${timestamp}`;
  const studentName = `Candidate 2E ${timestamp}`;

  const registerResp = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword,
      name: studentName,
      tenant_slug: 'dmathub',
    }),
  });
  assert(registerResp.ok, 'Student registration on dMATHub returns HTTP 201');
  const regData = await registerResp.json();
  assert(regData.user.tenant_id === dmatTenant.id, 'Registered student assigned to dMATHub tenant');
  assert(regData.user.student_path === '/ems', 'Registered student given /ems student path');

  // 2. Authenticate student via Supabase client to obtain real JWT
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: authData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: studentEmail,
    password: studentPassword,
  });
  assert(!loginErr && !!authData.session?.access_token, 'Student authenticated successfully and received JWT');
  const studentJwt = authData.session!.access_token;
  const studentAuthHeader = `Bearer ${studentJwt}`;
  const studentUserId = authData.user!.id;

  // 3. Start a practice test session
  const targetTest = dmatTests[0];
  const startResp = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({
      practice_test_id: targetTest.id,
      difficulty: 'MEDIUM',
      question_count: 5,
    }),
  });
  assert(startResp.ok, 'Start practice test session returns HTTP 200');
  const startData = await startResp.json();
  assert(!!startData.attempt_id, 'Received valid attempt_id');
  assert(Array.isArray(startData.questions) && startData.questions.length > 0, `Received ${startData.questions.length} questions`);

  const attemptId = startData.attempt_id;
  const activeQuestion = startData.questions[0];

  // 4. SANITIZATION CHECK: Ensure active questions do NOT expose correct_answer or explanation
  assert(activeQuestion.correct_answer === undefined, 'Active question correctly conceals correct_answer');
  assert(activeQuestion.explanation === undefined, 'Active question correctly conceals explanation');
  assert(activeQuestion.solution === undefined, 'Active question correctly conceals solution');
  assert(activeQuestion.options.every((o: any) => o.is_correct === undefined), 'Active question options conceal is_correct flag');

  // 5. Save candidate answer
  const saveResp = await fetch(`${APP_URL}/api/attempts/${attemptId}/save-answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({
      question_id: activeQuestion.id,
      selected_option_key: 'A',
      time_spent_seconds: 12,
    }),
  });
  assert(saveResp.ok, 'Save answer returns HTTP 200');

  // 6. Submit attempt for authoritative server-side scoring
  const submitResp = await fetch(`${APP_URL}/api/attempts/${attemptId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({
      time_spent_seconds: 45,
    }),
  });
  assert(submitResp.ok, 'Submit attempt returns HTTP 200');
  const submitData = await submitResp.json();
  assert(submitData.status === 'SUBMITTED', 'Attempt status updated to SUBMITTED');
  assert(typeof submitData.score === 'number', `Authoritative score calculated: ${submitData.score}/${submitData.max_score}`);
  assert(typeof submitData.percentage === 'number', `Authoritative percentage: ${submitData.percentage}%`);

  // 7. Retrieve attempt review (post-submission)
  const reviewResp = await fetch(`${APP_URL}/api/attempts/${attemptId}`, {
    headers: { Authorization: studentAuthHeader },
  });
  assert(reviewResp.ok, 'Retrieve completed attempt returns HTTP 200');
  const reviewData = await reviewResp.json();
  assert(reviewData.status === 'SUBMITTED', 'Review status confirms SUBMITTED');
  const reviewedAnswer = reviewData.answers[activeQuestion.id];
  assert(!!reviewedAnswer, 'Answer record exists in review');
  assert(reviewedAnswer.selected_answer === 'A', 'Selected answer recorded as A');
  assert(reviewedAnswer.correct_answer !== undefined, 'Post-submission review reveals correct_answer for evaluation');
  assert(reviewedAnswer.explanation !== undefined, 'Post-submission review reveals explanation');

  // 8. Retrieve student history
  const historyResp = await fetch(`${APP_URL}/api/attempts/user/${studentUserId}`, {
    headers: { Authorization: studentAuthHeader },
  });
  assert(historyResp.ok, 'Student history returns HTTP 200');
  const historyData = await historyResp.json();
  assert(historyData.some((a: any) => a.id === attemptId), 'Completed attempt visible in student history');

  // ====================================================================
  // SUITE 6: GENERATED DRILL PIPELINE (Registry -> Plugin -> Authoritative Scoring)
  // ====================================================================
  console.log(cyan('\n--- SUITE 6: Procedural Generator Pipeline via Registry ---'));

  // 1. Create a generated practice test
  const genTestTitle = `Phase 2E Generated Verification Drill ${timestamp}`;
  const { data: createdGenTest, error: genTestErr } = await adminClient
    .from('practice_tests')
    .insert([
      {
        tenant_id: dmatTenant.id,
        exam_id: dmatExam.id,
        section_id: figSeqSection.id,
        name: genTestTitle,
        description: 'Dynamically generated test for Phase 2E verification',
        test_type: 'PRACTICE',
        difficulty: 'MEDIUM',
        question_selection_mode: 'GENERATED',
        question_count: 2,
        time_limit_minutes: 10,
        is_published: true,
      },
    ])
    .select()
    .single();

  assert(!genTestErr && !!createdGenTest, 'Created temporary GENERATED practice test');

  // Grant Pro membership to student for procedural generation entitlement in Suite 6
  await adminClient.from('subscriptions').insert({
    user_id: studentUserId,
    tenant_id: dmatTenant.id,
    plan_id: 'e1000000-0000-0000-0000-000000000003',
    status: 'ACTIVE',
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // 2. Start attempt on generated test
  const startGenResp = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({
      practice_test_id: createdGenTest.id,
      difficulty: 'MEDIUM',
      question_count: 2,
    }),
  });
  assert(startGenResp.ok, 'Start generated practice test returns HTTP 200');
  const startGenData = await startGenResp.json();
  assert(startGenData.questions.length === 2, 'Generated exactly 2 questions on the fly via registry');
  assert(startGenData.questions[0].question_type === 'FIGURE_SEQUENCE', 'Generated question type is FIGURE_SEQUENCE');
  assert(startGenData.questions[0].correct_answer === undefined, 'Active generated question has sanitized correct_answer');

  // Submit generated attempt
  const submitGenResp = await fetch(`${APP_URL}/api/attempts/${startGenData.attempt_id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentAuthHeader,
    },
    body: JSON.stringify({ time_spent_seconds: 30 }),
  });
  assert(submitGenResp.ok, 'Submit generated attempt returns HTTP 200');
  const submitGenData = await submitGenResp.json();
  assert(submitGenData.status === 'SUBMITTED', 'Generated attempt successfully graded and marked SUBMITTED');

  // Clean up temporary generated test
  await adminClient.from('practice_tests').delete().eq('id', createdGenTest.id);

  // ====================================================================
  // SUITE 7: DETERMINISTIC GENERATOR REPRODUCIBILITY
  // ====================================================================
  console.log(cyan('\n--- SUITE 7: Deterministic Generator Reproducibility ---'));

  const testSeed = `regression-seed-${timestamp}`;
  const plugin = questionPluginRegistry.getPlugin('FIGURE_SEQUENCE');
  assert(!!plugin, 'FIGURE_SEQUENCE plugin registered');

  const gen1 = plugin!.generator.generate({
    seed: testSeed,
    difficulty: 'HARD',
    examId: dmatExam.id,
    sectionId: figSeqSection.id,
    tenantId: dmatTenant.id,
  });

  const gen2 = plugin!.generator.generate({
    seed: testSeed,
    difficulty: 'HARD',
    examId: dmatExam.id,
    sectionId: figSeqSection.id,
    tenantId: dmatTenant.id,
  });

  assert(gen1.question.correct_answer === gen2.question.correct_answer, 'Deterministic correct answer match across identical seeds');
  assert(gen1.question.explanation === gen2.question.explanation, 'Deterministic explanation match across identical seeds');
  assert(JSON.stringify(gen1.question.question_data) === JSON.stringify(gen2.question.question_data), 'Deterministic grid data match across identical seeds');
  assert(JSON.stringify(gen1.question.options) === JSON.stringify(gen2.question.options), 'Deterministic options match across identical seeds');
  assert(gen1.validation.isValid === true, 'Generated question passes mathematical validation suite');

  // ====================================================================
  // SUITE 8: CROSS-USER ISOLATION
  // ====================================================================
  console.log(cyan('\n--- SUITE 8: Cross-User Isolation ---'));

  // 1. Create Student B
  const studentBEmail = `student_2e_b_${timestamp}@example.com`;
  const registerBResp = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentBEmail,
      password: studentPassword,
      name: `Candidate B ${timestamp}`,
      tenant_slug: 'dmathub',
    }),
  });
  assert(registerBResp.ok, 'Student B registered');

  const { data: authBData } = await anonClient.auth.signInWithPassword({
    email: studentBEmail,
    password: studentPassword,
  });
  const studentBJwt = authBData.session!.access_token;
  const studentBAuthHeader = `Bearer ${studentBJwt}`;
  const studentBUserId = authBData.user!.id;

  // 2. Student B attempts to read Student A's attempt details (GET /api/attempts/:id)
  const crossUserGetResp = await fetch(`${APP_URL}/api/attempts/${attemptId}`, {
    headers: { Authorization: studentBAuthHeader },
  });
  assert(crossUserGetResp.status === 404, `Student B blocked from reading Student A attempt (HTTP ${crossUserGetResp.status})`);

  // 3. Student B attempts to read Student A's history (GET /api/attempts/user/:id)
  const crossUserHistResp = await fetch(`${APP_URL}/api/attempts/user/${studentUserId}`, {
    headers: { Authorization: studentBAuthHeader },
  });
  assert(crossUserHistResp.status === 403, `Student B forbidden from reading Student A history (HTTP ${crossUserHistResp.status})`);

  // 4. Student B attempts to save answer on Student A's attempt
  const crossUserSaveResp = await fetch(`${APP_URL}/api/attempts/${attemptId}/save-answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: studentBAuthHeader,
    },
    body: JSON.stringify({
      question_id: activeQuestion.id,
      selected_option_key: 'B',
    }),
  });
  assert(!crossUserSaveResp.ok, `Student B blocked from modifying Student A attempt answers (HTTP ${crossUserSaveResp.status})`);

  // 5. Direct PostgREST cross-user check under Supabase RLS
  const clientB = createClient(SUPABASE_URL, studentBJwt);
  const { data: rlsAttempts } = await clientB.from('attempts').select('*').eq('id', attemptId);
  assert(!rlsAttempts || rlsAttempts.length === 0, 'PostgREST RLS: Student B receives 0 rows querying Student A attempt');

  // ====================================================================
  // SUITE 9: CROSS-TENANT ISOLATION
  // ====================================================================
  console.log(cyan('\n--- SUITE 9: Cross-Tenant Isolation ---'));

  // 1. Create a user registered specifically under NISM tenant
  const nismUserEmail = `nism_student_${timestamp}@example.com`;
  const registerNismResp = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: nismUserEmail,
      password: studentPassword,
      name: `NISM Candidate ${timestamp}`,
      tenant_slug: 'nismprep',
    }),
  });
  assert(registerNismResp.ok, 'NISM Student registered');
  const regNismData = await registerNismResp.json();
  assert(regNismData.user.tenant_id === nismTenant.id, 'Student assigned to NISM tenant_id');
  assert(regNismData.user.student_path === '/portal', 'Student given /portal student path');

  const { data: nismAuthData } = await anonClient.auth.signInWithPassword({
    email: nismUserEmail,
    password: studentPassword,
  });
  const nismJwt = nismAuthData.session!.access_token;
  const nismAuthHeader = `Bearer ${nismJwt}`;

  // 2. NISM student queries /api/auth/me to verify profile scoping
  const meResp = await fetch(`${APP_URL}/api/auth/me`, {
    headers: { Authorization: nismAuthHeader },
  });
  assert(meResp.ok, 'NISM /api/auth/me returns HTTP 200');
  const meData = await meResp.json();
  assert(meData.tenant.id === nismTenant.id, 'Profile confirms NISM tenant_id');
  assert(meData.tenant.slug === 'nismprep', 'Profile confirms NISM tenant_slug');
  assert(meData.tenant.student_path === '/portal', 'Profile confirms /portal student_path');

  // 3. NISM student attempts to start dMAT test directly
  const crossTenantStartResp = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: nismAuthHeader,
    },
    body: JSON.stringify({
      practice_test_id: targetTest.id,
      tenant_id: nismTenant.id, // Trying to execute cross-tenant
    }),
  });
  // Should either be rejected or properly isolated
  assert(
    crossTenantStartResp.status === 400 || crossTenantStartResp.status === 403 || crossTenantStartResp.status === 404 || !crossTenantStartResp.ok,
    `Cross-tenant test execution blocked or rejected (HTTP ${crossTenantStartResp.status})`
  );

  // 4. Direct PostgREST cross-tenant check: NISM client cannot update dMATHub attempts
  const nismSupabaseClient = createClient(SUPABASE_URL, nismJwt);
  const { data: crossUpdateResult, error: crossUpdateError } = await nismSupabaseClient
    .from('attempts')
    .update({ time_spent_seconds: 999 })
    .eq('id', attemptId)
    .select();
  assert(!crossUpdateResult || crossUpdateResult.length === 0, 'PostgREST RLS: NISM client cannot update dMAT student attempt');

  // ====================================================================
  // SUITE 10: GUEST SESSION ISOLATION
  // ====================================================================
  console.log(cyan('\n--- SUITE 10: Guest Session Isolation ---'));

  // 1. Start Guest Attempt A
  const guestStartAResp = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      practice_test_id: targetTest.id,
      difficulty: 'EASY',
      question_count: 2,
    }),
  });
  assert(guestStartAResp.ok, 'Guest Attempt A started');
  const guestAData = await guestStartAResp.json();
  const guestTokenA = guestAData.guest_session_token || guestStartAResp.headers.get('x-guest-session');
  assert(!!guestTokenA, 'Guest A received high-entropy session token');
  const guestAttemptAId = guestAData.attempt_id;

  // 2. Start Guest Attempt B
  const guestStartBResp = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      practice_test_id: targetTest.id,
      difficulty: 'EASY',
      question_count: 2,
    }),
  });
  assert(guestStartBResp.ok, 'Guest Attempt B started');
  const guestBData = await guestStartBResp.json();
  const guestTokenB = guestBData.guest_session_token || guestStartBResp.headers.get('x-guest-session');
  assert(!!guestTokenB, 'Guest B received distinct high-entropy session token');
  assert(guestTokenA !== guestTokenB, 'Guest A and Guest B tokens are distinct and unique');
  const guestAttemptBId = guestBData.attempt_id;

  // 3. Guest B tries to access Guest A attempt
  const crossGuestResp = await fetch(`${APP_URL}/api/attempts/${guestAttemptAId}`, {
    headers: { 'x-guest-session': guestTokenB! },
  });
  assert(crossGuestResp.status === 403, `Guest B blocked from accessing Guest A attempt (HTTP ${crossGuestResp.status})`);

  // 4. Guest with no token tries to access Guest A attempt
  const noTokenGuestResp = await fetch(`${APP_URL}/api/attempts/${guestAttemptAId}`);
  assert(noTokenGuestResp.status === 403, `Unauthenticated guest blocked from accessing attempt (HTTP ${noTokenGuestResp.status})`);

  // 5. Guest A legitimately accesses Guest A attempt
  const legitimateGuestResp = await fetch(`${APP_URL}/api/attempts/${guestAttemptAId}`, {
    headers: { 'x-guest-session': guestTokenA! },
  });
  assert(legitimateGuestResp.ok, 'Guest A legitimately accesses own attempt (HTTP 200)');

  // 6. Guest A legitimately saves answer
  const guestSaveResp = await fetch(`${APP_URL}/api/attempts/${guestAttemptAId}/save-answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-session': guestTokenA!,
    },
    body: JSON.stringify({
      question_id: guestAData.questions[0].id,
      selected_option_key: 'A',
    }),
  });
  assert(guestSaveResp.ok, 'Guest A legitimately saves answer (HTTP 200)');

  // 7. Guest B tries to modify Guest A answer
  const guestCrossSaveResp = await fetch(`${APP_URL}/api/attempts/${guestAttemptAId}/save-answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-session': guestTokenB!,
    },
    body: JSON.stringify({
      question_id: guestAData.questions[0].id,
      selected_option_key: 'C',
    }),
  });
  assert(guestCrossSaveResp.status === 403, `Guest B blocked from modifying Guest A answer (HTTP ${guestCrossSaveResp.status})`);

  // ====================================================================
  // SUITE 11: ADMIN AUTHORIZATION & WORKBENCH SCOPING
  // ====================================================================
  console.log(cyan('\n--- SUITE 11: Admin Authorization & Hierarchy Scoping ---'));

  // 1. Student cannot access admin endpoints
  const studentAdminResp = await fetch(`${APP_URL}/api/admin/overview?tenant_id=${dmatTenant.id}`, {
    headers: { Authorization: studentAuthHeader },
  });
  assert(studentAdminResp.status === 403, `Student blocked from admin overview with HTTP 403`);

  // 2. Admin access with SUPER_ADMIN role
  const adminOverviewDmatResp = await fetch(`${APP_URL}/api/admin/overview?tenant_id=${dmatTenant.id}&exam_id=${dmatExam.id}`, {
    headers: { 'x-demo-role': 'SUPER_ADMIN' },
  });
  assert(adminOverviewDmatResp.ok, 'Admin overview for dMAT returns HTTP 200');
  const dmatStats = await adminOverviewDmatResp.json();
  assert(typeof dmatStats.totalQuestions === 'number', `dMAT questions stat: ${dmatStats.totalQuestions}`);
  assert(typeof dmatStats.totalTests === 'number', `dMAT tests stat: ${dmatStats.totalTests}`);

  // 3. Admin overview for NISM Prep Hub
  const adminOverviewNismResp = await fetch(`${APP_URL}/api/admin/overview?tenant_id=${nismTenant.id}`, {
    headers: { 'x-demo-role': 'SUPER_ADMIN' },
  });
  assert(adminOverviewNismResp.ok, 'Admin overview for NISM returns HTTP 200');
  const nismStats = await adminOverviewNismResp.json();
  assert(nismStats.totalQuestions === 0, `NISM questions stat correctly reflects 0: ${nismStats.totalQuestions}`);

  // 4. Generator workbench plugin registry discovery
  const plugins = questionPluginRegistry.getRegisteredPlugins();
  assert(plugins.length >= 1, `Discovered ${plugins.length} generator plugin(s) in registry`);
  const fsPlugin = plugins.find((p) => p.pluginId === 'FIGURE_SEQUENCE');
  assert(!!fsPlugin, 'Figure Sequence plugin discovered via registry metadata');
  assert(fsPlugin.supportedDifficulties.includes('EASY'), 'Plugin supports EASY difficulty');
  assert(fsPlugin.supportedDifficulties.includes('MEDIUM'), 'Plugin supports MEDIUM difficulty');
  assert(fsPlugin.supportedDifficulties.includes('HARD'), 'Plugin supports HARD difficulty');

  // ====================================================================
  // SUITE 12: TENANT BRANDING CONFIGURATION
  // ====================================================================
  console.log(cyan('\n--- SUITE 12: Tenant Branding Configuration ---'));

  // Verify dMATHub branding
  assert(dmatTenant.name === 'dMATHub', 'dMATHub name matches');
  assert(dmatTenant.primary_color === '#0f766e', 'dMATHub primary color matches');
  assert(dmatTenant.student_path === '/ems', 'dMATHub student path matches');

  // Verify NISM branding
  assert(nismTenant.name === 'NISM Prep Hub', 'NISM Prep Hub name matches');
  assert(nismTenant.primary_color === '#1e3a8a', 'NISM Prep Hub primary color matches');
  assert(nismTenant.student_path === '/portal', 'NISM Prep Hub student path matches');

  // Test updating branding via admin endpoint
  const testColor = '#0d9488';
  const updateBrandResp = await fetch(`${APP_URL}/api/tenants/${dmatTenant.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-demo-role': 'SUPER_ADMIN',
    },
    body: JSON.stringify({
      primary_color: testColor,
    }),
  });
  assert(updateBrandResp.ok, 'Update tenant branding returns HTTP 200');
  const updatedBrand = await updateBrandResp.json();
  assert(updatedBrand.primary_color === testColor, 'Tenant primary color successfully updated');

  // Restore original color
  await fetch(`${APP_URL}/api/tenants/${dmatTenant.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-demo-role': 'SUPER_ADMIN',
    },
    body: JSON.stringify({
      primary_color: '#0f766e',
    }),
  });

  // ====================================================================
  // CLEANUP
  // ====================================================================
  console.log(cyan('\n--- CLEANUP ---'));
  if (createdGenTest?.id) {
    await adminClient.from('practice_tests').delete().eq('id', createdGenTest.id);
  }
  // Clean up created test students
  await adminClient.from('users').delete().eq('email', studentEmail);
  await adminClient.from('users').delete().eq('email', studentBEmail);
  await adminClient.from('users').delete().eq('email', nismUserEmail);
  console.log('  ✓ Cleaned up verification users and generated tests from database.');

  console.log(bold('\n================================================================'));
  console.log(green(bold(`PHASE 2E TEST RESULTS: ${passedCount}/${passedCount} ASSERTIONS PASSED (100% GREEN)`)));
  console.log(bold('================================================================\n'));
}

runPhase2ETests().catch((err) => {
  console.error(red(`\nPhase 2E Verification Suite Failed: ${err.message}`));
  console.error(err.stack);
  process.exit(1);
});
