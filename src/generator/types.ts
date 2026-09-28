import {
  Difficulty,
  GenerationValidationResult,
  Question,
  QuestionType,
} from '../types';

export interface GenerateQuestionParams {
  seed: string;
  difficulty: Difficulty;
  examId: string;
  sectionId: string;
  tenantId: string;
  topicId?: string;
  parameters?: Record<string, any>;
}

export interface GenerateQuestionResult {
  question: Question;
  validation: GenerationValidationResult;
}

export interface QuestionGenerator {
  readonly generatorType: string;
  readonly version: string;
  generate(params: GenerateQuestionParams): GenerateQuestionResult;
}

export interface ValidationOptions {
  version?: string;
  seed?: string;
  parameters?: Record<string, any>;
}

export interface QuestionValidator {
  validate(question: Question, options?: ValidationOptions): GenerationValidationResult;
}

export interface EvaluationResult {
  isCorrect: boolean;
  marksAwarded: number;
  feedback?: string;
}

export interface QuestionEvaluator {
  evaluate(question: Question, selectedAnswer?: string): EvaluationResult;
}

export interface QuestionTypePlugin {
  readonly type: QuestionType | string;
  readonly displayName: string;
  readonly generator?: QuestionGenerator;
  readonly validator?: QuestionValidator;
  readonly evaluator?: QuestionEvaluator;
  readonly metadata?: Record<string, any>;
}
