import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import {
  getSanitizedSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseAdminClient,
} from '../server/supabase';
import { questionPluginRegistry, QuestionGenerator, GenerateQuestionParams } from '../src/generator';
import { attemptService } from '../server/services/attemptService';
import { Question } from '../src/types';

const SUPABASE_URL = getSanitizedSupabaseUrl();
const ANON_KEY = getSupabaseAnonKey();
const adminClient = getSupabaseAdminClient();
const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const APP_URL = 'http://localhost:3000';

async function runAttemptGeneratorFlowTests() {
  console.log('================================================================');
  console.log('EXAMHUB PHASE 2B: ATTEMPT SERVICE GENERATOR FLOW & DECOUPLING TEST');
  console.log('================================================================\n');

  if (!adminClient) {
    throw new Error('Supabase admin client unavailable');
  }

  const dmatTenantId = 'a0000000-0000-0000-0000-000000000001';
  const dmatExamId = 'e0000000-0000-0000-0000-000000000001';
  const dmatSectionId = 'b0000000-0000-0000-0000-000000000001';

  // 1. Create and authenticate student
  const timestamp = Date.now();
  const studentEmail = `gen_flow_${timestamp}@example.com`;
  const studentPassword = 'Password123!Secure';

  console.log('Step 1: Register and login test student...');
  const regRes = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword,
      name: 'Gen Flow Student',
      tenant_id: dmatTenantId,
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.user?.id) {
    throw new Error(`Failed to register student: ${JSON.stringify(regData)}`);
  }
  const studentUserId = regData.user.id;

  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: studentEmail,
    password: studentPassword,
  });

  if (authError || !authData.session?.access_token) {
    throw new Error(`Failed to sign in student: ${authError?.message}`);
  }
  const studentJwt = authData.session.access_token;
  const authHeader = `Bearer ${studentJwt}`;
  console.log(`✓ Student authenticated: ${studentUserId}\n`);

  // Grant Pro subscription for procedural generation entitlement
  await adminClient.from('subscriptions').insert({
    user_id: studentUserId,
    tenant_id: dmatTenantId,
    plan_id: 'e1000000-0000-0000-0000-000000000003',
    status: 'ACTIVE',
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // 2. Insert a temporary practice test with question_selection_mode = 'GENERATED'
  const generatedPracticeTestId = crypto.randomUUID();
  console.log('Step 2: Creating practice test with question_selection_mode = GENERATED...');
  const { error: ptError } = await adminClient.from('practice_tests').insert([
    {
      id: generatedPracticeTestId,
      tenant_id: dmatTenantId,
      exam_id: dmatExamId,
      section_id: dmatSectionId,
      name: 'Phase 2B Live Generated Drill',
      description: 'End-to-end test verifying registry-based question generation in attempts.',
      test_type: 'PRACTICE',
      difficulty: 'MEDIUM',
      question_selection_mode: 'GENERATED',
      question_count: 2,
      time_limit_minutes: 15,
      is_published: true,
    },
  ]);

  if (ptError) {
    throw new Error(`Failed to insert test practice_test: ${ptError.message}`);
  }
  console.log(`✓ Created GENERATED practice test: ${generatedPracticeTestId}\n`);

  // 3. Spy on questionPluginRegistry.generate to prove attemptService delegates to it
  console.log('Step 3: Setting up spy on questionPluginRegistry.generate...');
  let registryCalls = 0;
  const originalGenerate = questionPluginRegistry.generate.bind(questionPluginRegistry);
  questionPluginRegistry.generate = (params) => {
    registryCalls++;
    console.log(`  [SPY DETECTED] questionPluginRegistry.generate() invoked for type: ${params.questionType || params.generatorType}`);
    return originalGenerate(params);
  };

  // 4. Test in-process delegation: invoke attemptService.startAttempt directly with spy active
  console.log('Step 4: Executing attemptService.startAttempt with active spy...');
  const directAttemptResult = await attemptService.startAttempt(
    {
      practice_test_id: generatedPracticeTestId,
      tenant_id: dmatTenantId,
      user_id: studentUserId,
      question_count: 2,
      user_tier: 'PAID',
    },
    authHeader
  );

  console.log(`✓ In-process attempt created: ${directAttemptResult.attempt_id}`);
  console.log(`✓ Questions generated: ${directAttemptResult.questions.length}`);
  console.log(`✓ Registry spy calls recorded: ${registryCalls}`);

  if (registryCalls < 2) {
    throw new Error(`Expected at least 2 registry.generate calls, but recorded ${registryCalls}`);
  }
  console.log('✓ PROVEN: attemptService.startAttempt dispatches question generation strictly via questionPluginRegistry!\n');

  // Restore original generate method
  questionPluginRegistry.generate = originalGenerate;

  // 5. Test end-to-end via HTTP API endpoint (/api/practice-tests/start)
  console.log('Step 5: Calling HTTP POST /api/practice-tests/start...');
  const startRes = await fetch(`${APP_URL}/api/practice-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      practice_test_id: generatedPracticeTestId,
      tenant_id: dmatTenantId,
    }),
  });

  const startData = await startRes.json();
  if (!startRes.ok || !startData.attempt_id) {
    throw new Error(`Start attempt failed: ${JSON.stringify(startData)}`);
  }

  const httpAttemptId = startData.attempt_id;
  console.log(`✓ HTTP Attempt started: ${httpAttemptId}`);
  console.log(`✓ Number of questions received: ${startData.questions.length}`);

  // Verify candidate sanitization: candidate should NOT see correct_answer
  const q1 = startData.questions[0];
  if (q1.correct_answer !== undefined || q1.explanation !== undefined) {
    throw new Error('Candidate was sent un-sanitized question with answers/explanations visible!');
  }
  console.log('✓ Candidate question is properly sanitized (correct_answer and explanation hidden).');

  // 6. Submit candidate answer for question 1
  console.log('\nStep 6: Submitting candidate answer via POST /api/attempts/:id/save-answer...');
  const answerRes = await fetch(`${APP_URL}/api/attempts/${httpAttemptId}/save-answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      question_id: q1.id,
      selected_option_key: 'A',
      time_spent_seconds: 25,
    }),
  });

  const answerData = await answerRes.json();
  if (!answerRes.ok || !answerData.success) {
    throw new Error(`Failed to save candidate answer: ${JSON.stringify(answerData)}`);
  }
  console.log('✓ Candidate answer persisted successfully in attempt_answers.');

  // 7. Submit the attempt for server-side authoritative grading
  console.log('\nStep 7: Submitting attempt for server-side authoritative scoring...');
  const submitRes = await fetch(`${APP_URL}/api/attempts/${httpAttemptId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
  });

  const submittedAttempt = await submitRes.json();
  if (!submitRes.ok || submittedAttempt.status !== 'SUBMITTED') {
    throw new Error(`Failed to submit attempt: ${JSON.stringify(submittedAttempt)}`);
  }

  console.log(`✓ Attempt scored: Score ${submittedAttempt.score}/${submittedAttempt.max_score} (${submittedAttempt.percentage}%)`);
  console.log(`✓ Status: ${submittedAttempt.status}`);

  // 8. Verify dynamic generator dispatch via runtime registry injection
  console.log('\nStep 8: Testing dynamic plugin injection without changing attemptService...');
  let dynamicGeneratorCalled = false;
  const mockGenerator: QuestionGenerator = {
    generatorType: 'MOCK_INJECTED_TYPE',
    version: '2.0.0',
    generate: (params: GenerateQuestionParams) => {
      dynamicGeneratorCalled = true;
      const mockQ: Question = {
        id: `mock-${Date.now()}`,
        tenant_id: params.tenantId,
        exam_id: params.examId,
        section_id: params.sectionId,
        question_type: 'SINGLE_MCQ',
        difficulty: params.difficulty,
        question_text: 'Dynamic injected question through registry',
        question_data: {},
        correct_answer: 'B',
        source_type: 'GENERATED',
        generator_type: 'MOCK_INJECTED_TYPE',
        status: 'PUBLISHED',
        estimated_time_seconds: 30,
        options: [
          { id: 'opt-a', question_id: 'q', option_key: 'A', option_text: 'Alpha', display_order: 1 },
          { id: 'opt-b', question_id: 'q', option_key: 'B', option_text: 'Beta', display_order: 2 },
        ],
      };
      return {
        question: mockQ,
        validation: {
          isValid: true,
          seed: params.seed,
          version: '2.0.0',
          generatorType: 'MOCK_INJECTED_TYPE',
          parameters: {},
          checks: [],
        },
      };
    },
  };

  questionPluginRegistry.registerPlugin({
    type: 'MOCK_INJECTED_TYPE',
    displayName: 'Mock Injected Generator',
    generator: mockGenerator,
  });

  // Call questionPluginRegistry.generate with the dynamically registered type
  const dynamicResult = questionPluginRegistry.generate({
    questionType: 'MOCK_INJECTED_TYPE',
    seed: 'test-seed',
    difficulty: 'EASY',
    examId: dmatExamId,
    sectionId: dmatSectionId,
    tenantId: dmatTenantId,
  });

  if (!dynamicGeneratorCalled || dynamicResult.question.question_text !== 'Dynamic injected question through registry') {
    throw new Error('Dynamic generator injection test failed');
  }
  console.log('✓ Dynamic generator injection succeeded: question produced without changing engine code.');

  // Clean up dynamic plugin
  questionPluginRegistry.unregisterPlugin('MOCK_INJECTED_TYPE');

  // 9. Cleanup test data
  console.log('\n--- CLEANUP ---');
  await adminClient.from('attempt_answers').delete().eq('attempt_id', httpAttemptId);
  await adminClient.from('attempts').delete().eq('id', httpAttemptId);
  await adminClient.from('attempt_answers').delete().eq('attempt_id', directAttemptResult.attempt_id);
  await adminClient.from('attempts').delete().eq('id', directAttemptResult.attempt_id);
  await adminClient.from('practice_tests').delete().eq('id', generatedPracticeTestId);
  await adminClient.auth.admin.deleteUser(studentUserId);
  console.log('✓ Cleaned up test attempts, practice test, and auth student.');

  console.log('\n================================================================');
  console.log('ALL ATTEMPT SERVICE GENERATOR FLOW TESTS PASSED (100% GREEN)!');
  console.log('================================================================\n');
}

runAttemptGeneratorFlowTests().catch((err) => {
  console.error('\n❌ ATTEMPT SERVICE GENERATOR FLOW TEST FAILED:', err);
  process.exit(1);
});
