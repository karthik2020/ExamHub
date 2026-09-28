import dotenv from 'dotenv';
dotenv.config();

import {
  createQuestionPluginRegistry,
  figureSequencePlugin,
  FigureSequenceGenerator,
  FigureSequenceValidator,
  FigureSequenceEvaluator,
  questionPluginRegistry,
  GenerateQuestionParams,
  QuestionTypePlugin,
  QuestionGenerator,
  QuestionValidator,
} from '../src/generator';
import { Difficulty, Question } from '../src/types';

async function runGeneratorRegistryTests() {
  console.log('================================================================');
  console.log('EXAMHUB PHASE 2B: QUESTION ENGINE & GENERATOR REGISTRY TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✓ [PASS] ${testName}${details ? ` — ${details}` : ''}`);
    } else {
      console.error(`✗ [FAIL] ${testName}${details ? ` — ${details}` : ''}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // ----------------------------------------------------------------
  // TEST 1: Default registry initialization & FIGURE_SEQUENCE plugin
  // ----------------------------------------------------------------
  console.log('--- TEST 1: Default registry initialization & retrieval ---');
  assert(
    questionPluginRegistry.hasPlugin('FIGURE_SEQUENCE'),
    'Registry contains FIGURE_SEQUENCE plugin by default'
  );

  const fsPlugin = questionPluginRegistry.getPlugin('FIGURE_SEQUENCE');
  assert(
    fsPlugin !== undefined && fsPlugin.type === 'FIGURE_SEQUENCE',
    'Retrieved FIGURE_SEQUENCE plugin with correct type',
    `DisplayName: "${fsPlugin?.displayName}"`
  );

  assert(
    Boolean(fsPlugin?.generator && fsPlugin?.validator && fsPlugin?.evaluator),
    'FIGURE_SEQUENCE plugin defines generator, validator, and evaluator'
  );

  assert(
    questionPluginRegistry.hasGenerator('FIGURE_SEQUENCE'),
    'Registry confirms hasGenerator("FIGURE_SEQUENCE")'
  );

  // ----------------------------------------------------------------
  // TEST 2: Dynamic registration of custom generator plugin
  // ----------------------------------------------------------------
  console.log('\n--- TEST 2: Register custom generator plugin ---');
  const isolatedRegistry = createQuestionPluginRegistry(false);
  assert(!isolatedRegistry.hasPlugin('FIGURE_SEQUENCE'), 'Empty registry has no initial plugins');

  const customGenerator: QuestionGenerator = {
    generatorType: 'CUSTOM_ALGEBRA',
    version: '1.0.0',
    generate: (params: GenerateQuestionParams) => {
      const q: Question = {
        id: `custom-q-${Date.now()}`,
        tenant_id: params.tenantId,
        exam_id: params.examId,
        section_id: params.sectionId,
        question_type: 'NUMERICAL',
        difficulty: params.difficulty,
        question_text: `What is 2x + 5 if x = 3? (Seed: ${params.seed})`,
        question_data: { equation: '2x + 5', x: 3 },
        correct_answer: '11',
        source_type: 'GENERATED',
        generator_type: 'CUSTOM_ALGEBRA',
        status: 'PUBLISHED',
        estimated_time_seconds: 45,
        options: [
          { id: 'opt-1', question_id: 'q1', option_key: 'A', option_text: '11', display_order: 1, is_correct: true },
          { id: 'opt-2', question_id: 'q1', option_key: 'B', option_text: '10', display_order: 2, is_correct: false },
        ],
      };
      return {
        question: q,
        validation: {
          isValid: true,
          seed: params.seed,
          version: '1.0.0',
          generatorType: 'CUSTOM_ALGEBRA',
          parameters: params.parameters || {},
          checks: [{ name: 'Equation check', passed: true, details: 'Verified algebraically' }],
        },
      };
    },
  };

  const customPlugin: QuestionTypePlugin = {
    type: 'NUMERICAL',
    displayName: 'Algebraic Equation Generator',
    generator: customGenerator,
  };

  isolatedRegistry.registerPlugin(customPlugin);
  assert(isolatedRegistry.hasPlugin('NUMERICAL'), 'Isolated registry has NUMERICAL plugin');
  assert(isolatedRegistry.hasGenerator('CUSTOM_ALGEBRA'), 'Isolated registry finds generator by generatorType');
  assert(isolatedRegistry.hasGenerator('NUMERICAL'), 'Isolated registry finds generator by questionType');

  const generatedCustom = isolatedRegistry.generate({
    questionType: 'NUMERICAL',
    seed: 'seed-custom-1',
    difficulty: 'EASY',
    examId: 'exam-1',
    sectionId: 'sec-1',
    tenantId: 'ten-1',
  });
  assert(
    generatedCustom.question.correct_answer === '11',
    'Custom generator successfully dispatched and generated question'
  );

  // ----------------------------------------------------------------
  // TEST 3: Registry rejects unknown question/generator type
  // ----------------------------------------------------------------
  console.log('\n--- TEST 3: Unknown question type rejection ---');
  let threwExpected = false;
  try {
    questionPluginRegistry.generate({
      questionType: 'NON_EXISTENT_QUESTION_TYPE',
      seed: 'seed-fail',
      difficulty: 'MEDIUM',
      examId: 'exam-1',
      sectionId: 'sec-1',
      tenantId: 'ten-1',
    });
  } catch (err: any) {
    threwExpected = true;
    assert(
      err.message.includes('No generator plugin registered'),
      'Appropriate descriptive error message when generator is missing',
      err.message
    );
  }
  assert(threwExpected, 'Registry safely threw on unknown question type');

  // ----------------------------------------------------------------
  // TEST 4: Figure Sequence generator output structure through registry
  // ----------------------------------------------------------------
  console.log('\n--- TEST 4: Figure Sequence generator produces valid question ---');
  const dmatExamId = 'e0000000-0000-0000-0000-000000000001';
  const dmatSectionId = 'b0000000-0000-0000-0000-000000000001';
  const dmatTenantId = 'a0000000-0000-0000-0000-000000000001';

  const testSeed = 'dmat-test-seed-4x4-alpha';
  const genResult = questionPluginRegistry.generate({
    questionType: 'FIGURE_SEQUENCE',
    seed: testSeed,
    difficulty: 'MEDIUM',
    examId: dmatExamId,
    sectionId: dmatSectionId,
    tenantId: dmatTenantId,
  });

  const q = genResult.question;
  assert(q.question_type === 'FIGURE_SEQUENCE', 'Question type is FIGURE_SEQUENCE');
  assert(q.options.length === 4, 'Question has exactly 4 options (A, B, C, D)');
  assert(Boolean(q.correct_answer), 'Question has correct_answer designated', `Answer: ${q.correct_answer}`);
  assert(q.question_data?.dimension === 4, 'Matrix dimension is 4 (4x4)');
  assert(q.question_data?.totalSteps === 6, 'Total steps is 6');
  assert(q.question_data?.givenSteps === 4, 'Given steps is 4');
  assert(
    genResult.validation.isValid,
    '10-point mathematical validation suite passed',
    `${genResult.validation.checks.length} checks passed`
  );

  // ----------------------------------------------------------------
  // TEST 5: Deterministic seed guarantee
  // ----------------------------------------------------------------
  console.log('\n--- TEST 5: Deterministic seed reproducibility ---');
  const genResult2 = questionPluginRegistry.generate({
    questionType: 'FIGURE_SEQUENCE',
    seed: testSeed,
    difficulty: 'MEDIUM',
    examId: dmatExamId,
    sectionId: dmatSectionId,
    tenantId: dmatTenantId,
  });

  const q2 = genResult2.question;
  assert(q.correct_answer === q2.correct_answer, 'Identical seeds produce identical correct answer');
  assert(q.explanation === q2.explanation, 'Identical seeds produce identical explanation');
  assert(
    JSON.stringify(q.question_data.steps) === JSON.stringify(q2.question_data.steps),
    'Identical seeds produce identical grid steps and coordinates'
  );
  assert(
    JSON.stringify(q.options.map((o) => o.option_data)) === JSON.stringify(q2.options.map((o) => o.option_data)),
    'Identical seeds produce identical option distractors and grid pairs'
  );

  // ----------------------------------------------------------------
  // TEST 6: Validation rejects invalid questions
  // ----------------------------------------------------------------
  console.log('\n--- TEST 6: Validation rejects malformed questions ---');
  const malformedQ: Question = {
    ...q,
    // Corrupt options: make 2 options marked correct
    options: q.options.map((opt) => ({ ...opt, is_correct: true })),
  };

  const malformedValidation = questionPluginRegistry.validate(malformedQ, {
    seed: testSeed,
    version: '1.2.0',
  });
  assert(
    !malformedValidation.isValid,
    'Validator correctly identifies and rejects question with multiple correct answers'
  );

  // ----------------------------------------------------------------
  // TEST 7: Difficulty behavior intact
  // ----------------------------------------------------------------
  console.log('\n--- TEST 7: Difficulty scaling ---');
  const difficulties: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
  for (const diff of difficulties) {
    const res = questionPluginRegistry.generate({
      questionType: 'FIGURE_SEQUENCE',
      seed: `difficulty-test-${diff}`,
      difficulty: diff,
      examId: dmatExamId,
      sectionId: dmatSectionId,
      tenantId: dmatTenantId,
    });
    assert(
      res.question.difficulty === diff,
      `Difficulty '${diff}' matches configured level`,
      `Rule: ${res.question.question_data.ruleType}, Symbol count: ${res.question.question_data.steps[0].symbols.length}`
    );
    assert(res.validation.isValid, `Validation passed for ${diff} difficulty`);
  }

  // ----------------------------------------------------------------
  // TEST 8: Evaluator plugin functionality
  // ----------------------------------------------------------------
  console.log('\n--- TEST 8: Evaluator plugin interface ---');
  const evalCorrect = questionPluginRegistry.evaluate(q, q.correct_answer);
  assert(evalCorrect.isCorrect && evalCorrect.marksAwarded === 1.0, 'Evaluator scores correct answer with 1.0 mark');

  const wrongAnswerKey = q.correct_answer === 'A' ? 'B' : 'A';
  const evalWrong = questionPluginRegistry.evaluate(q, wrongAnswerKey);
  assert(!evalWrong.isCorrect && evalWrong.marksAwarded === 0.0, 'Evaluator scores incorrect answer with 0 marks');

  console.log('\n================================================================');
  console.log(`ALL ${totalTests} GENERATOR REGISTRY TESTS PASSED SUCCESSFULLY! (${passedTests}/${totalTests})`);
  console.log('================================================================\n');
}

runGeneratorRegistryTests().catch((err) => {
  console.error('\n❌ GENERATOR REGISTRY TESTS FAILED:', err);
  process.exit(1);
});
