import { Question } from '../types';
import { figureSequencePlugin } from './figureSequencePlugin';
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

export interface GenerateRequest extends GenerateQuestionParams {
  questionType?: string;
  generatorType?: string;
}

export class QuestionPluginRegistry {
  private plugins: Map<string, QuestionTypePlugin> = new Map();

  constructor(registerDefaults = false) {
    if (registerDefaults) {
      this.registerPlugin(figureSequencePlugin);
    }
  }

  /**
   * Registers a question type plugin into the registry.
   */
  registerPlugin(plugin: QuestionTypePlugin): void {
    if (!plugin || !plugin.type) {
      throw new Error('Invalid plugin: plugin and plugin.type are required.');
    }
    this.plugins.set(plugin.type, plugin);
  }

  /**
   * Unregisters a question type plugin.
   */
  unregisterPlugin(type: string): boolean {
    return this.plugins.delete(type);
  }

  /**
   * Retrieves a plugin by its question type.
   */
  getPlugin(type: string): QuestionTypePlugin | undefined {
    return this.plugins.get(type);
  }

  /**
   * Checks if a plugin is registered for a given question type.
   */
  hasPlugin(type: string): boolean {
    return this.plugins.has(type);
  }

  /**
   * Returns all currently registered plugins.
   */
  getAllPlugins(): QuestionTypePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Returns plugin metadata descriptors for all registered plugins.
   */
  getRegisteredPlugins() {
    return this.getAllPlugins().map((p) => ({
      pluginId: p.type,
      type: p.type,
      name: p.displayName,
      description: p.metadata?.description || '',
      version: p.metadata?.version || '1.0.0',
      supportedDifficulties: ['EASY', 'MEDIUM', 'HARD'],
      generator: p.generator,
      validator: p.validator,
      evaluator: p.evaluator,
      metadata: p.metadata,
    }));
  }

  /**
   * Finds a generator by question type or generator type identifier.
   */
  getGenerator(typeOrGenerator: string): QuestionGenerator | undefined {
    // 1. Check direct match by question type
    const plugin = this.plugins.get(typeOrGenerator);
    if (plugin?.generator) {
      return plugin.generator;
    }

    // 2. Check if any plugin has a generator whose generatorType matches
    for (const p of this.plugins.values()) {
      if (p.generator && p.generator.generatorType === typeOrGenerator) {
        return p.generator;
      }
    }

    return undefined;
  }

  /**
   * Checks whether a generator exists for the given question type or generator type.
   */
  hasGenerator(typeOrGenerator: string): boolean {
    return Boolean(this.getGenerator(typeOrGenerator));
  }

  /**
   * Finds a validator by question type.
   */
  getValidator(type: string): QuestionValidator | undefined {
    return this.plugins.get(type)?.validator;
  }

  /**
   * Finds an evaluator by question type.
   */
  getEvaluator(type: string): QuestionEvaluator | undefined {
    return this.plugins.get(type)?.evaluator;
  }

  /**
   * Dispatches question generation through the appropriate generator plugin.
   * AttemptService and other consumers call this instead of directly importing engines.
   */
  generate(request: GenerateRequest): GenerateQuestionResult {
    const targetType = request.generatorType || request.questionType;
    if (!targetType) {
      throw new Error('Generation failed: Either questionType or generatorType must be specified.');
    }

    const generator = this.getGenerator(targetType);
    if (!generator) {
      throw new Error(
        `Generation failed: No generator plugin registered for question/generator type '${targetType}'. Registered types: [${Array.from(this.plugins.keys()).join(', ')}]`
      );
    }

    return generator.generate(request);
  }

  /**
   * Dispatches validation through the appropriate validator plugin.
   */
  validate(question: Question, options?: ValidationOptions) {
    const validator = this.getValidator(question.question_type);
    if (validator) {
      return validator.validate(question, options);
    }

    // Fallback basic structural validation if no custom validator is registered
    const isValid = Boolean(
      question.id &&
      question.question_text &&
      question.options &&
      question.options.length > 0
    );

    return {
      isValid,
      seed: options?.seed || '',
      version: options?.version || '1.0.0',
      generatorType: question.generator_type || question.question_type,
      parameters: options?.parameters || {},
      checks: [
        {
          name: 'Basic structural check',
          passed: isValid,
          details: isValid ? 'Standard question fields present' : 'Missing required question fields',
        },
      ],
    };
  }

  /**
   * Dispatches evaluation through the appropriate evaluator plugin, or falls back to standard option comparison.
   */
  evaluate(question: Question, selectedAnswer?: string): EvaluationResult {
    const evaluator = this.getEvaluator(question.question_type);
    if (evaluator) {
      return evaluator.evaluate(question, selectedAnswer);
    }

    const selected = selectedAnswer?.trim().toUpperCase();
    const correct = question.correct_answer?.trim().toUpperCase();
    const isCorrect = Boolean(selected && correct && selected === correct);

    return {
      isCorrect,
      marksAwarded: isCorrect ? 1.0 : 0.0,
      feedback: isCorrect ? 'Correct' : 'Incorrect',
    };
  }

  /**
   * Resets the registry to initial state with defaults.
   */
  reset(): void {
    this.plugins.clear();
    this.registerPlugin(figureSequencePlugin);
  }
}

/**
 * Factory function to create an isolated registry (useful for unit tests and custom runners).
 */
export function createQuestionPluginRegistry(registerDefaults = true): QuestionPluginRegistry {
  return new QuestionPluginRegistry(registerDefaults);
}

/**
 * Singleton registry instance for application-wide question plugins and generators.
 */
export const questionPluginRegistry = createQuestionPluginRegistry(true);
