import { config } from 'dotenv';
config();

process.env.TEST_DEMO_HEADER = 'SUPER_ADMIN';

import { adminService } from '../src/services/adminService';
import { examService } from '../src/services/examService';
import { tenantService } from '../src/services/tenantService';
import { questionPluginRegistry } from '../src/generator';

async function runAdminGenericizationTests() {
  console.log('================================================================');
  console.log('EXAMHUB PHASE 2D: ADMIN WORKBENCH GENERICIZATION VERIFICATION');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Discover all tenants dynamically
    console.log('\n--- TEST 1: Tenant Discovery ---');
    const tenants = await tenantService.getTenants();
    assert(Array.isArray(tenants) && tenants.length > 0, `Discovered ${tenants.length} tenants`);
    const primaryTenant = tenants[0];
    console.log(`Primary tenant: ${primaryTenant.name} (${primaryTenant.id})`);

    // 2. Discover exams for primary tenant
    console.log('\n--- TEST 2: Dynamic Exam Discovery per Tenant ---');
    const exams = await examService.getExams(primaryTenant.id);
    assert(Array.isArray(exams) && exams.length > 0, `Discovered ${exams.length} exams for tenant ${primaryTenant.name}`);
    const activeExam = exams[0];
    console.log(`Selected Exam: ${activeExam.name} (${activeExam.slug}) - ID: ${activeExam.id}`);

    // 3. Dynamic Sections and Topics Discovery
    console.log('\n--- TEST 3: Dynamic Section & Topic Hierarchy ---');
    const sections = await examService.getSections(activeExam.id);
    assert(Array.isArray(sections) && sections.length > 0, `Discovered ${sections.length} sections for exam ${activeExam.name}`);
    const activeSection = sections[0];
    console.log(`Selected Section: ${activeSection.name} - ID: ${activeSection.id}`);

    const topics = await examService.getTopics(activeSection.id);
    assert(Array.isArray(topics), `Queried topics for section: found ${topics.length} topics`);
    const activeTopic = topics[0] || undefined;
    if (activeTopic) {
      console.log(`Selected Topic: ${activeTopic.name} - ID: ${activeTopic.id}`);
    }

    // 4. Generator Workbench Plugin Registry with Dynamic Scoping
    console.log('\n--- TEST 4: Procedural Generator Workbench with Registry ---');
    const availablePlugins = questionPluginRegistry.getAllPlugins().filter((p) => Boolean(p.generator));
    assert(availablePlugins.length > 0, `Discovered ${availablePlugins.length} generator plugins in registry`);

    const generatorResult = questionPluginRegistry.generate({
      generatorType: 'FIGURE_SEQUENCE',
      seed: 'dmat-test-seed-4x4-alpha',
      difficulty: 'MEDIUM',
      tenantId: primaryTenant.id,
      examId: activeExam.id,
      sectionId: activeSection.id,
      topicId: activeTopic?.id,
    });

    assert(Boolean(generatorResult.question), 'Generated question object successfully');
    assert(generatorResult.question.tenant_id === primaryTenant.id, 'Question properly scoped to selected tenant');
    assert(generatorResult.question.exam_id === activeExam.id, 'Question properly scoped to selected exam');
    assert(generatorResult.question.section_id === activeSection.id, 'Question properly scoped to selected section');
    const isValidationPassed = generatorResult.validation.isValid ?? (generatorResult.validation as any).passed ?? generatorResult.validation.checks?.every((c: any) => c.passed);
    assert(isValidationPassed === true, '10-point mathematical validation suite passed');
    console.log(`Generated Question ID: ${generatorResult.question.id}, Correct Answer: ${generatorResult.question.correct_answer}`);

    // 5. Question Bank Management with Dynamic Filters
    console.log('\n--- TEST 5: Question Bank Scoped Querying ---');
    const examQuestions = await adminService.getQuestions({
      tenant_id: primaryTenant.id,
      exam_id: activeExam.id,
    });
    assert(Array.isArray(examQuestions), `Fetched ${examQuestions.length} questions scoped to exam ${activeExam.name}`);

    // 6. Question Authoring with Dynamic Context (No hardcoded IDs)
    console.log('\n--- TEST 6: Authoring Question with Dynamic Hierarchy Context ---');
    const authoringPayload = {
      tenant_id: primaryTenant.id,
      exam_id: activeExam.id,
      section_id: activeSection.id,
      topic_id: activeTopic?.id,
      question_text: 'Phase 2D Automated Admin Verification Item: Which law governs dynamic multi-tenant exam configuration?',
      question_type: 'SINGLE_MCQ' as const,
      difficulty: 'MEDIUM' as const,
      correct_answer: 'B',
      explanation: 'Tenant-to-Exam contextual scoping ensures clean decoupling across administrative boundaries.',
      options: [
        { id: 'opt-a', question_id: '', option_key: 'A' as const, option_text: 'Hardcoded dMAT UUIDs', display_order: 1, is_correct: false },
        { id: 'opt-b', question_id: '', option_key: 'B' as const, option_text: 'Dynamic tenant/exam context resolution', display_order: 2, is_correct: true },
        { id: 'opt-c', question_id: '', option_key: 'C' as const, option_text: 'Static routing tables', display_order: 3, is_correct: false },
        { id: 'opt-d', question_id: '', option_key: 'D' as const, option_text: 'Client-side spoofed parameters', display_order: 4, is_correct: false },
      ],
    };

    const createdQuestion = await adminService.createQuestion(authoringPayload);
    assert(Boolean(createdQuestion && createdQuestion.id), `Question created successfully with ID: ${createdQuestion.id}`);
    assert(createdQuestion.tenant_id === primaryTenant.id, 'Saved question tenant_id matches context');
    assert(createdQuestion.exam_id === activeExam.id, 'Saved question exam_id matches context');
    assert(createdQuestion.section_id === activeSection.id, 'Saved question section_id matches context');

    // Verify it appears in filtered bank
    const refetched = await adminService.getQuestions({
      tenant_id: primaryTenant.id,
      exam_id: activeExam.id,
      section_id: activeSection.id,
    });
    assert(refetched.some((q) => q.id === createdQuestion.id), 'Newly created question returned in scoped bank queries');

    // Clean up created question
    await adminService.deleteQuestion(createdQuestion.id);
    const afterDelete = await adminService.getQuestions({
      tenant_id: primaryTenant.id,
      exam_id: activeExam.id,
    });
    assert(!afterDelete.some((q) => q.id === createdQuestion.id), 'Cleaned up created question successfully');

    // 7. Dynamic Admin Overview Metrics
    console.log('\n--- TEST 7: Dynamic Admin Overview Stats ---');
    const overviewStats = await adminService.getOverview(primaryTenant.id);
    assert(overviewStats !== null && typeof overviewStats.totalStudents === 'number', 'Retrieved tenant-scoped overview statistics');
    console.log(`Tenant stats: Students=${overviewStats.totalStudents}, Questions=${overviewStats.totalQuestions}, Tests=${overviewStats.totalTests}`);

  } catch (error: any) {
    console.error('Fatal error during test execution:', error);
    process.exitCode = 1;
  }

  console.log('\n================================================================');
  console.log(`PHASE 2D TEST RESULTS: ${passed}/${total} ASSERTIONS PASSED (${passed === total ? '100% GREEN' : 'FAILED'})`);
  console.log('================================================================');
}

runAdminGenericizationTests();
