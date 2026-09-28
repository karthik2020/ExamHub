import { getSupabaseAdminClient } from '../server/supabase';
import { Question, QuestionOption, FigureSequenceQuestionData } from '../src/types';

interface QuestionAuditResult {
  id: string;
  question_type: string;
  difficulty: string;
  section_id: string;
  topic_id: string | null;
  has_valid_structure: boolean;
  option_count: number;
  has_single_correct_answer: boolean;
  correct_answer: string;
  has_duplicate_options: boolean;
  has_explanation: boolean;
  has_solution: boolean;
  is_fs_4x4_valid?: boolean;
  fs_steps_count?: number;
  fs_rule_type?: string;
  issues: string[];
}

async function runQuestionAudit() {
  const db = getSupabaseAdminClient();
  if (!db) {
    console.error('Database client not available');
    process.exit(1);
  }

  const { data: questions, error } = await db
    .from('questions')
    .select('*, question_options(*)')
    .eq('exam_id', 'e0000000-0000-0000-0000-000000000001');

  if (error) {
    console.error('Failed to fetch questions:', error);
    process.exit(1);
  }

  console.log(`Auditing ${questions.length} questions for dMAT...\n`);

  const results: QuestionAuditResult[] = [];
  let totalIssues = 0;

  for (const q of questions) {
    const issues: string[] = [];
    const options = (q.question_options || []) as QuestionOption[];
    
    // Check 1: Options count
    if (options.length < 4) {
      issues.push(`Insufficient options: ${options.length} (expected 4+)`);
    }

    // Check 2: Correct answer exists and is single
    const correctOptions = options.filter(o => o.is_correct);
    if (correctOptions.length !== 1) {
      issues.push(`Expected exactly 1 correct option, found ${correctOptions.length}`);
    }
    if (!q.correct_answer || !options.some(o => o.option_key === q.correct_answer)) {
      issues.push(`correct_answer field '${q.correct_answer}' does not match any valid option`);
    }

    // Check 3: Duplicate options
    const optionTexts = new Set<string>();
    let hasDuplicate = false;
    for (const opt of options) {
      const hasOptionData = opt.option_data && Object.keys(opt.option_data).length > 0;
      const sig = hasOptionData 
        ? JSON.stringify(opt.option_data) 
        : (opt.option_text || '').trim().toLowerCase();
      if (optionTexts.has(sig)) {
        hasDuplicate = true;
        issues.push(`Duplicate option detected for key ${opt.option_key}`);
      }
      optionTexts.add(sig);
    }

    // Check 4: Explanations & Solutions
    const hasExp = Boolean(q.explanation && q.explanation.trim().length > 10);
    const hasSol = Boolean(q.solution && q.solution.trim().length > 10);
    if (!hasExp) issues.push('Missing or terse explanation');
    if (!hasSol) issues.push('Missing or terse solution');

    // Check 5: Topic assignment
    if (!q.topic_id) {
      issues.push('Missing topic_id (unassigned topic)');
    }

    // Check 6: Figure sequence specific checks
    let isFsValid = undefined;
    let fsStepsCount = undefined;
    let fsRuleType = undefined;

    if (q.question_type === 'FIGURE_SEQUENCE') {
      const qData = q.question_data as FigureSequenceQuestionData;
      fsStepsCount = qData?.steps?.length;
      fsRuleType = qData?.ruleType;

      if (!qData || !qData.steps) {
        issues.push('Missing question_data or steps array');
        isFsValid = false;
      } else if (qData.dimension !== 4) {
        issues.push(`Invalid dimension ${qData.dimension} (expected 4)`);
        isFsValid = false;
      } else if (qData.steps.length !== 6) {
        issues.push(`Invalid step count ${qData.steps.length} (expected 6)`);
        isFsValid = false;
      } else {
        // Check 4x4 coordinate bounds
        let outOfBounds = false;
        qData.steps.forEach((st, sIdx) => {
          st.symbols.forEach((sym) => {
            if (sym.row < 0 || sym.row > 3 || sym.col < 0 || sym.col > 3) {
              outOfBounds = true;
            }
          });
        });
        if (outOfBounds) {
          issues.push('Symbols placed outside 4x4 matrix bounds');
          isFsValid = false;
        } else {
          isFsValid = true;
        }
      }
    }

    if (issues.length > 0) {
      totalIssues += issues.length;
    }

    results.push({
      id: q.id,
      question_type: q.question_type,
      difficulty: q.difficulty,
      section_id: q.section_id,
      topic_id: q.topic_id,
      has_valid_structure: issues.length === 0,
      option_count: options.length,
      has_single_correct_answer: correctOptions.length === 1,
      correct_answer: q.correct_answer,
      has_duplicate_options: hasDuplicate,
      has_explanation: hasExp,
      has_solution: hasSol,
      is_fs_4x4_valid: isFsValid,
      fs_steps_count: fsStepsCount,
      fs_rule_type: fsRuleType,
      issues,
    });
  }

  // Summary
  console.log('=== AUDIT SUMMARY ===');
  console.log(`Total questions audited: ${results.length}`);
  const fullyValid = results.filter(r => r.issues.length === 0);
  console.log(`Fully valid (0 issues): ${fullyValid.length} / ${results.length}`);

  // Issue breakdown
  const issueTypes: Record<string, number> = {};
  results.forEach(r => {
    r.issues.forEach(iss => {
      const key = iss.split(':')[0].split('(')[0].trim();
      issueTypes[key] = (issueTypes[key] || 0) + 1;
    });
  });
  console.log('Issue breakdown:', issueTypes);

  // Group by question_type
  const byType: Record<string, number> = {};
  results.forEach(r => {
    byType[r.question_type] = (byType[r.question_type] || 0) + 1;
  });
  console.log('By question type:', byType);

  // Group by difficulty
  const byDiff: Record<string, number> = {};
  results.forEach(r => {
    byDiff[r.difficulty] = (byDiff[r.difficulty] || 0) + 1;
  });
  console.log('By difficulty:', byDiff);
}

runQuestionAudit();
