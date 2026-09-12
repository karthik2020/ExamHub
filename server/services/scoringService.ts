import { AttemptAnswer, Question } from '../../src/types';

export interface ScoringResult {
  score: number;
  max_score: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  skipped_count: number;
  evaluatedAnswers: Record<string, AttemptAnswer>;
}

export class ScoringService {
  /**
   * Authoritatively evaluates attempt answers against database question records.
   * Client submissions are never trusted for score, correctness, or percentage.
   */
  evaluateAttempt(
    questions: Question[],
    savedAnswers: Record<string, Partial<AttemptAnswer>>
  ): ScoringResult {
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    let totalScore = 0;
    const marksPerQuestion = 1.0;
    const maxScore = questions.length * marksPerQuestion;
    const evaluatedAnswers: Record<string, AttemptAnswer> = {};

    for (const question of questions) {
      const saved = savedAnswers[question.id];
      const selected = saved?.selected_answer?.trim();

      if (!selected) {
        skippedCount++;
        evaluatedAnswers[question.id] = {
          attempt_id: saved?.attempt_id || '',
          question_id: question.id,
          selected_answer: undefined,
          is_correct: false,
          time_spent_seconds: saved?.time_spent_seconds || 0,
          marks_awarded: 0,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          solution: question.solution,
        };
        continue;
      }

      const isCorrect =
        Boolean(question.correct_answer) &&
        selected.toUpperCase() === question.correct_answer?.trim().toUpperCase();

      if (isCorrect) {
        correctCount++;
        totalScore += marksPerQuestion;
        evaluatedAnswers[question.id] = {
          attempt_id: saved?.attempt_id || '',
          question_id: question.id,
          selected_answer: selected,
          is_correct: true,
          time_spent_seconds: saved?.time_spent_seconds || 0,
          marks_awarded: marksPerQuestion,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          solution: question.solution,
        };
      } else {
        incorrectCount++;
        evaluatedAnswers[question.id] = {
          attempt_id: saved?.attempt_id || '',
          question_id: question.id,
          selected_answer: selected,
          is_correct: false,
          time_spent_seconds: saved?.time_spent_seconds || 0,
          marks_awarded: 0,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          solution: question.solution,
        };
      }
    }

    const rawPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const percentage = Math.round(rawPercentage * 100) / 100;

    return {
      score: Math.round(totalScore * 100) / 100,
      max_score: maxScore,
      percentage,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      skipped_count: skippedCount,
      evaluatedAnswers,
    };
  }
}

export const scoringService = new ScoringService();
