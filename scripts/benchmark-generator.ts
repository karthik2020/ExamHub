import { generateFigureSequence, validateGeneratedQuestion, GENERATOR_VERSION } from '../src/generator/figureSequenceEngine';
import { Difficulty, FigureSequenceQuestionData, Question } from '../src/types';

interface BenchmarkStats {
  difficulty: Difficulty;
  attempts: number;
  valid: number;
  rejected: number;
  rejectionPct: number;
  duplicateOptionCount: number;
  ambiguousAnswerCount: number;
  renderingFailureCount: number;
  ruleDistribution: Record<string, number>;
  symbolCountDistribution: Record<number, number>;
  avgGenerationTimeMs: number;
}

export function runGeneratorBenchmark(sampleSizePerDiff = 100): {
  results: Record<Difficulty, BenchmarkStats>;
  deterministicCheckPassed: boolean;
  totalValid: number;
  totalAttempts: number;
} {
  const difficulties: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
  const results: Record<Difficulty, BenchmarkStats> = {} as any;

  let overallAttempts = 0;
  let overallValid = 0;

  for (const diff of difficulties) {
    let validCount = 0;
    let rejectedCount = 0;
    let duplicateOptions = 0;
    let ambiguousAnswers = 0;
    let renderingFailures = 0;
    const ruleDistribution: Record<string, number> = {};
    const symbolCountDistribution: Record<number, number> = {};
    const times: number[] = [];

    for (let i = 0; i < sampleSizePerDiff; i++) {
      const seed = `bench-${diff.toLowerCase()}-${i}-${Date.now() % 100000}`;
      const start = performance.now();
      
      const { question, validation } = generateFigureSequence(
        seed,
        diff,
        'e0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001'
      );
      const elapsed = performance.now() - start;
      times.push(elapsed);

      const qData = question.question_data as FigureSequenceQuestionData;
      const ruleType = qData?.ruleType || 'unknown';
      ruleDistribution[ruleType] = (ruleDistribution[ruleType] || 0) + 1;

      const symCount = qData?.steps?.[0]?.symbols?.length || 0;
      symbolCountDistribution[symCount] = (symbolCountDistribution[symCount] || 0) + 1;

      // Check duplicates
      const optSignatures = new Set(
        question.options.map(o => JSON.stringify(o.option_data?.grid5?.symbols) + JSON.stringify(o.option_data?.grid6?.symbols))
      );
      if (optSignatures.size < 4) {
        duplicateOptions++;
      }

      // Check ambiguous
      const correctOpts = question.options.filter(o => o.is_correct);
      if (correctOpts.length !== 1 || !question.correct_answer) {
        ambiguousAnswers++;
      }

      // Check rendering bounds
      let renderFailed = false;
      if (!qData?.steps || qData.steps.length !== 6 || qData.dimension !== 4) {
        renderFailed = true;
      } else {
        for (const st of qData.steps) {
          for (const s of st.symbols) {
            if (s.row < 0 || s.row > 3 || s.col < 0 || s.col > 3) {
              renderFailed = true;
            }
          }
        }
      }
      if (renderFailed) {
        renderingFailures++;
      }

      if (validation.isValid && !renderFailed && optSignatures.size === 4 && correctOpts.length === 1) {
        validCount++;
      } else {
        rejectedCount++;
      }
    }

    results[diff] = {
      difficulty: diff,
      attempts: sampleSizePerDiff,
      valid: validCount,
      rejected: rejectedCount,
      rejectionPct: (rejectedCount / sampleSizePerDiff) * 100,
      duplicateOptionCount: duplicateOptions,
      ambiguousAnswerCount: ambiguousAnswers,
      renderingFailureCount: renderingFailures,
      ruleDistribution,
      symbolCountDistribution,
      avgGenerationTimeMs: times.reduce((a, b) => a + b, 0) / times.length,
    };

    overallAttempts += sampleSizePerDiff;
    overallValid += validCount;
  }

  // Check determinism: same seed generates exact same data
  const testSeed = 'deterministic-verification-seed-xyz-987';
  const gen1 = generateFigureSequence(testSeed, 'MEDIUM', 'e1', 's1', 't1');
  const gen2 = generateFigureSequence(testSeed, 'MEDIUM', 'e1', 's1', 't1');

  const deterministicCheckPassed =
    JSON.stringify(gen1.question) === JSON.stringify(gen2.question) &&
    JSON.stringify(gen1.validation) === JSON.stringify(gen2.validation);

  return {
    results,
    deterministicCheckPassed,
    totalValid: overallValid,
    totalAttempts: overallAttempts,
  };
}

// Self-run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('================================================================');
  console.log('FIGURE-SEQUENCE GENERATOR EMPIRICAL BENCHMARK');
  console.log('================================================================\n');

  const { results, deterministicCheckPassed, totalValid, totalAttempts } = runGeneratorBenchmark(100);

  console.log('| Difficulty | Attempts | Valid | Rejected | Rejection % | Duplicate Options | Ambiguous | Avg Time |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const [diff, stat] of Object.entries(results)) {
    console.log(
      `| ${diff.padEnd(10)} | ${stat.attempts.toString().padEnd(8)} | ${stat.valid.toString().padEnd(5)} | ${stat.rejected.toString().padEnd(8)} | ${(stat.rejectionPct.toFixed(1) + '%').padEnd(11)} | ${stat.duplicateOptionCount.toString().padEnd(17)} | ${stat.ambiguousAnswerCount.toString().padEnd(9)} | ${(stat.avgGenerationTimeMs.toFixed(2) + 'ms').padEnd(8)} |`
    );
  }

  console.log('\n--- RULE TYPE DISTRIBUTIONS ---');
  for (const [diff, stat] of Object.entries(results)) {
    console.log(`${diff}:`, stat.ruleDistribution, 'Symbol counts:', stat.symbolCountDistribution);
  }

  console.log('\n--- DETERMINISM CHECK ---');
  console.log(`Deterministic seed check: ${deterministicCheckPassed ? 'PASSED (Identical output on duplicate seed)' : 'FAILED'}`);

  console.log('\n--- OVERALL VALIDATION RATE ---');
  console.log(`Overall validity: ${totalValid} / ${totalAttempts} (${((totalValid / totalAttempts) * 100).toFixed(1)}%)\n`);
}
