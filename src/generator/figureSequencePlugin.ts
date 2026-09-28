import { Question } from '../types';
import {
  generateFigureSequence,
  validateGeneratedQuestion,
  GENERATOR_TYPE,
  GENERATOR_VERSION,
} from './figureSequenceEngine';
import {
  EvaluationResult,
  GenerateQuestionParams,
  GenerateQuestionResult,
  QuestionEvaluator,
  QuestionGenerator,
  QuestionTypePlugin,
  QuestionValidator,
  ValidationOptions,
} from './types';

export class FigureSequenceGenerator implements QuestionGenerator {
  readonly generatorType = GENERATOR_TYPE;
  readonly version = GENERATOR_VERSION;

  generate(params: GenerateQuestionParams): GenerateQuestionResult {
    return generateFigureSequence(
      params.seed,
      params.difficulty,
      params.examId,
      params.sectionId,
      params.tenantId
    );
  }
}

export class FigureSequenceValidator implements QuestionValidator {
  validate(question: Question, options?: ValidationOptions) {
    return validateGeneratedQuestion(
      question,
      options?.version || GENERATOR_VERSION,
      options?.seed || 'validation-check',
      options?.parameters || {}
    );
  }
}

export class FigureSequenceEvaluator implements QuestionEvaluator {
  evaluate(question: Question, selectedAnswer?: string): EvaluationResult {
    const selected = selectedAnswer?.trim().toUpperCase();
    const correct = question.correct_answer?.trim().toUpperCase();

    if (!selected) {
      return {
        isCorrect: false,
        marksAwarded: 0,
        feedback: 'No answer selected',
      };
    }

    const isCorrect = Boolean(correct && selected === correct);
    return {
      isCorrect,
      marksAwarded: isCorrect ? 1.0 : 0,
      feedback: isCorrect ? 'Correct answer' : 'Incorrect answer',
    };
  }
}

export const figureSequenceGenerator = new FigureSequenceGenerator();
export const figureSequenceValidator = new FigureSequenceValidator();
export const figureSequenceEvaluator = new FigureSequenceEvaluator();

export const figureSequencePlugin: QuestionTypePlugin = {
  type: 'FIGURE_SEQUENCE',
  displayName: 'Figure Sequence',
  generator: figureSequenceGenerator,
  validator: figureSequenceValidator,
  evaluator: figureSequenceEvaluator,
  metadata: {
    description: 'Deterministic 4x4 matrix figure progression sequences with multi-symbol transformations.',
    version: GENERATOR_VERSION,
  },
};
