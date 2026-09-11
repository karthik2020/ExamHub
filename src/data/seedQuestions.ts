import { Question } from '../types';
import { generateFigureSequence } from '../generator/figureSequenceEngine';

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
const EXAM_ID = 'e0000000-0000-0000-0000-000000000001';
const SEC_FIGURES = 's0000000-0000-0000-0000-000000000001';
const SEC_EQUATIONS = 's0000000-0000-0000-0000-000000000002';
const SEC_LATIN = 's0000000-0000-0000-0000-000000000003';
const SEC_ACADEMIC = 's0000000-0000-0000-0000-000000000004';

// Deterministically pre-generate 20 verified fixed questions
// 10 for Guest, 10 additional for Registered (total 20 fixed pool)
export function getSeedQuestions(): Question[] {
  const questions: Question[] = [];

  // 1 to 6: Figure Sequences (Easy, Medium, Hard)
  const figSeeds = [
    { seed: 'dmat-fixed-01-bounce', diff: 'EASY' as const, pool: 'GUEST' as const },
    { seed: 'dmat-fixed-02-rotate', diff: 'EASY' as const, pool: 'GUEST' as const },
    { seed: 'dmat-fixed-03-diag', diff: 'EASY' as const, pool: 'GUEST' as const },
    { seed: 'dmat-fixed-04-spiral', diff: 'MEDIUM' as const, pool: 'GUEST' as const },
    { seed: 'dmat-fixed-05-dual', diff: 'MEDIUM' as const, pool: 'GUEST' as const },
    { seed: 'dmat-fixed-06-complex', diff: 'HARD' as const, pool: 'GUEST' as const },
    // Registered additions for figure sequence
    { seed: 'dmat-fixed-11-vector', diff: 'MEDIUM' as const, pool: 'REGISTERED' as const },
    { seed: 'dmat-fixed-12-inversion', diff: 'HARD' as const, pool: 'REGISTERED' as const },
    { seed: 'dmat-fixed-13-bounce3', diff: 'HARD' as const, pool: 'REGISTERED' as const },
  ];

  figSeeds.forEach((item, idx) => {
    const { question } = generateFigureSequence(item.seed, item.diff, EXAM_ID, SEC_FIGURES, TENANT_ID);
    question.id = `q-fixed-${idx + 1}`;
    question.is_fixed_pool = true;
    question.pool_access = item.pool;
    questions.push(question);
  });

  // 7, 8, 9, 10: Guest Pool Non-Figure Questions (Equations, Latin Squares, Academic Module)
  questions.push({
    id: 'q-fixed-7',
    tenant_id: TENANT_ID,
    exam_id: EXAM_ID,
    section_id: SEC_EQUATIONS,
    topic_id: 't0000000-0000-0000-0000-000000000004',
    question_type: 'SINGLE_MCQ',
    difficulty: 'EASY',
    question_text:
      'Given the system: 3x + 2y = 19 and 2x - y = 8. What is the value of 5x + y?',
    question_data: {},
    correct_answer: 'B',
    explanation: 'Multiply the second equation by 2: 4x - 2y = 16. Adding to the first: 7x = 35 => x = 5. Substituting back: 2(5) - y = 8 => y = 2. Hence, 5x + y = 5(5) + 2 = 27.',
    solution: 'Step 1: Eliminate y by scalar multiplication. Step 2: Obtain x=5, y=2. Step 3: Compute 5(5)+2 = 27.',
    source_type: 'MANUAL',
    status: 'PUBLISHED',
    estimated_time_seconds: 60,
    is_fixed_pool: true,
    pool_access: 'GUEST',
    options: [
      { id: 'opt-q7-A', question_id: 'q-fixed-7', option_key: 'A', option_text: '24', display_order: 1, is_correct: false },
      { id: 'opt-q7-B', question_id: 'q-fixed-7', option_key: 'B', option_text: '27', display_order: 2, is_correct: true },
      { id: 'opt-q7-C', question_id: 'q-fixed-7', option_key: 'C', option_text: '29', display_order: 3, is_correct: false },
      { id: 'opt-q7-D', question_id: 'q-fixed-7', option_key: 'D', option_text: '31', display_order: 4, is_correct: false },
    ],
  });

  questions.push({
    id: 'q-fixed-8',
    tenant_id: TENANT_ID,
    exam_id: EXAM_ID,
    section_id: SEC_EQUATIONS,
    question_type: 'SINGLE_MCQ',
    difficulty: 'MEDIUM',
    question_text:
      'If a ⋆ b = (a² - b²) / (a + b) for all a ≠ -b, compute: (12 ⋆ 4) ⋆ (9 ⋆ 3).',
    question_data: {},
    correct_answer: 'C',
    explanation: 'Since (a² - b²) / (a + b) = (a - b)(a + b) / (a + b) = a - b. Therefore: 12 ⋆ 4 = 12 - 4 = 8, and 9 ⋆ 3 = 9 - 3 = 6. Finally: 8 ⋆ 6 = 8 - 6 = 2.',
    solution: 'Factor the algebraic identity: a ⋆ b simplifies directly to (a - b). 8 ⋆ 6 = 2.',
    source_type: 'MANUAL',
    status: 'PUBLISHED',
    estimated_time_seconds: 75,
    is_fixed_pool: true,
    pool_access: 'GUEST',
    options: [
      { id: 'opt-q8-A', question_id: 'q-fixed-8', option_key: 'A', option_text: '1', display_order: 1, is_correct: false },
      { id: 'opt-q8-B', question_id: 'q-fixed-8', option_key: 'B', option_text: '4', display_order: 2, is_correct: false },
      { id: 'opt-q8-C', question_id: 'q-fixed-8', option_key: 'C', option_text: '2', display_order: 3, is_correct: true },
      { id: 'opt-q8-D', question_id: 'q-fixed-8', option_key: 'D', option_text: '6', display_order: 4, is_correct: false },
    ],
  });

  questions.push({
    id: 'q-fixed-9',
    tenant_id: TENANT_ID,
    exam_id: EXAM_ID,
    section_id: SEC_LATIN,
    question_type: 'SINGLE_MCQ',
    difficulty: 'MEDIUM',
    question_text:
      'In a 4x4 Latin Square with symbols {1, 2, 3, 4}, each row and each column must contain each symbol exactly once. If Row 1 is [1, 2, 3, 4], Row 2 is [2, 1, 4, 3], and Row 3 starts with [3, 4, ?, ?], which value MUST occupy position (3, 3)?',
    question_data: {},
    correct_answer: 'A',
    explanation: 'Column 3 already contains 3 (from Row 1) and 4 (from Row 2). The remaining symbols available for Column 3 are {1, 2}. Row 3 already contains 3 and 4 in columns 1 and 2. Because Column 4 already has 4 and 3 in rows 1 and 2, position (3,3) must be 1 to preserve Latin square uniqueness across Row 4.',
    solution: 'Column 3 requires {1, 2}. Cross-checking orthogonal constraints fixes (3, 3) to 1.',
    source_type: 'MANUAL',
    status: 'PUBLISHED',
    estimated_time_seconds: 90,
    is_fixed_pool: true,
    pool_access: 'GUEST',
    options: [
      { id: 'opt-q9-A', question_id: 'q-fixed-9', option_key: 'A', option_text: '1', display_order: 1, is_correct: true },
      { id: 'opt-q9-B', question_id: 'q-fixed-9', option_key: 'B', option_text: '2', display_order: 2, is_correct: false },
      { id: 'opt-q9-C', question_id: 'q-fixed-9', option_key: 'C', option_text: '3', display_order: 3, is_correct: false },
      { id: 'opt-q9-D', question_id: 'q-fixed-9', option_key: 'D', option_text: '4', display_order: 4, is_correct: false },
    ],
  });

  questions.push({
    id: 'q-fixed-10',
    tenant_id: TENANT_ID,
    exam_id: EXAM_ID,
    section_id: SEC_ACADEMIC,
    question_type: 'SINGLE_MCQ',
    difficulty: 'MEDIUM',
    question_text:
      'Academic deduction: In a clinical cohort study, "Every participant with phenotype alpha exhibited biomarker gamma. No participant with biomarker gamma tested positive for antibody delta." Which conclusion logically follows?',
    question_data: {},
    correct_answer: 'D',
    explanation: 'Let A = alpha, G = gamma, D = antibody delta. Statement 1: A ⊆ G. Statement 2: G ∩ D = ∅. Therefore, A ∩ D = ∅ (No participant with phenotype alpha tested positive for antibody delta).',
    solution: 'Standard categorical syllogism: All A are G. No G are D. Therefore, No A are D.',
    source_type: 'MANUAL',
    status: 'PUBLISHED',
    estimated_time_seconds: 70,
    is_fixed_pool: true,
    pool_access: 'GUEST',
    options: [
      { id: 'opt-q10-A', question_id: 'q-fixed-10', option_key: 'A', option_text: 'Some participants with antibody delta exhibit phenotype alpha.', display_order: 1, is_correct: false },
      { id: 'opt-q10-B', question_id: 'q-fixed-10', option_key: 'B', option_text: 'All participants with biomarker gamma exhibit phenotype alpha.', display_order: 2, is_correct: false },
      { id: 'opt-q10-C', question_id: 'q-fixed-10', option_key: 'C', option_text: 'Biomarker gamma causes resistance to antibody delta.', display_order: 3, is_correct: false },
      { id: 'opt-q10-D', question_id: 'q-fixed-10', option_key: 'D', option_text: 'No participant with phenotype alpha tested positive for antibody delta.', display_order: 4, is_correct: true },
    ],
  });

  // Questions 14..20: Additional Registered pool questions
  questions.push({
    id: 'q-fixed-14',
    tenant_id: TENANT_ID,
    exam_id: EXAM_ID,
    section_id: SEC_EQUATIONS,
    question_type: 'SINGLE_MCQ',
    difficulty: 'HARD',
    question_text:
      'For positive integers a, b, c, if a × b = 48, b × c = 72, and a × c = 96, determine the value of a + b + c.',
    question_data: {},
    correct_answer: 'B',
    explanation: 'Multiply all three equations: (a × b × c)² = 48 × 72 × 96 = (16 × 3) × (9 × 8) × (16 × 6) = 331,776. So a × b × c = 576. Then c = (abc)/(ab) = 576/48 = 12. a = (abc)/(bc) = 576/72 = 8. b = (abc)/(ac) = 576/96 = 6. a + b + c = 8 + 6 + 12 = 26.',
    solution: 'Multiply the pairwise products to extract (abc)², then divide individually: a=8, b=6, c=12. Sum = 26.',
    source_type: 'MANUAL',
    status: 'PUBLISHED',
    estimated_time_seconds: 90,
    is_fixed_pool: true,
    pool_access: 'REGISTERED',
    options: [
      { id: 'opt-q14-A', question_id: 'q-fixed-14', option_key: 'A', option_text: '24', display_order: 1, is_correct: false },
      { id: 'opt-q14-B', question_id: 'q-fixed-14', option_key: 'B', option_text: '26', display_order: 2, is_correct: true },
      { id: 'opt-q14-C', question_id: 'q-fixed-14', option_key: 'C', option_text: '28', display_order: 3, is_correct: false },
      { id: 'opt-q14-D', question_id: 'q-fixed-14', option_key: 'D', option_text: '30', display_order: 4, is_correct: false },
    ],
  });

  questions.push({
    id: 'q-fixed-15',
    tenant_id: TENANT_ID,
    exam_id: EXAM_ID,
    section_id: SEC_LATIN,
    question_type: 'SINGLE_MCQ',
    difficulty: 'HARD',
    question_text:
      'A 5x5 Latin Square uses symbols {A, B, C, D, E}. If the main diagonal consists solely of symbol A, which of the following statements MUST be true?',
    question_data: {},
    correct_answer: 'C',
    explanation: 'A Latin Square in which the main diagonal entries are all identical is an idempotent quasigroup (or idempotent Latin square). No other entry in any row or column can be A because each row and column already contains A on the diagonal.',
    solution: 'Since each row i contains A at column i, symbol A appears 0 times in non-diagonal cells.',
    source_type: 'MANUAL',
    status: 'PUBLISHED',
    estimated_time_seconds: 90,
    is_fixed_pool: true,
    pool_access: 'REGISTERED',
    options: [
      { id: 'opt-q15-A', question_id: 'q-fixed-15', option_key: 'A', option_text: 'Symbol B must occupy all anti-diagonal cells.', display_order: 1, is_correct: false },
      { id: 'opt-q15-B', question_id: 'q-fixed-15', option_key: 'B', option_text: 'The matrix must be symmetric about the diagonal.', display_order: 2, is_correct: false },
      { id: 'opt-q15-C', question_id: 'q-fixed-15', option_key: 'C', option_text: 'Symbol A appears zero times in any off-diagonal position.', display_order: 3, is_correct: true },
      { id: 'opt-q15-D', question_id: 'q-fixed-15', option_key: 'D', option_text: 'Every row sum of indices must be prime.', display_order: 4, is_correct: false },
    ],
  });

  questions.push({
    id: 'q-fixed-16',
    tenant_id: TENANT_ID,
    exam_id: EXAM_ID,
    section_id: SEC_ACADEMIC,
    question_type: 'SINGLE_MCQ',
    difficulty: 'MEDIUM',
    question_text:
      'Data Sufficiency: Is integer n divisible by 12?\nStatement (1): n is divisible by 4.\nStatement (2): n is divisible by 6.',
    question_data: {},
    correct_answer: 'C',
    explanation: 'Statement (1) alone: n could be 4 (not divisible by 12) or 12 (divisible). Insufficient. Statement (2) alone: n could be 6 (not divisible by 12) or 12 (divisible). Insufficient. Together: n is a common multiple of 4 and 6. The LCM of 4 and 6 is 12. Therefore, any common multiple of 4 and 6 must be a multiple of 12. Together sufficient.',
    solution: 'LCM(4, 6) = 12. Combining both statements guarantees n is a multiple of 12.',
    source_type: 'MANUAL',
    status: 'PUBLISHED',
    estimated_time_seconds: 75,
    is_fixed_pool: true,
    pool_access: 'REGISTERED',
    options: [
      { id: 'opt-q16-A', question_id: 'q-fixed-16', option_key: 'A', option_text: 'Statement (1) ALONE is sufficient, but Statement (2) is not.', display_order: 1, is_correct: false },
      { id: 'opt-q16-B', question_id: 'q-fixed-16', option_key: 'B', option_text: 'Statement (2) ALONE is sufficient, but Statement (1) is not.', display_order: 2, is_correct: false },
      { id: 'opt-q16-C', question_id: 'q-fixed-16', option_key: 'C', option_text: 'BOTH statements TOGETHER are sufficient, but NEITHER alone is sufficient.', display_order: 3, is_correct: true },
      { id: 'opt-q16-D', question_id: 'q-fixed-16', option_key: 'D', option_text: 'Statements (1) and (2) TOGETHER are NOT sufficient.', display_order: 4, is_correct: false },
    ],
  });

  return questions;
}
