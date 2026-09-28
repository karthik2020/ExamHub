// Question Engine Plugin Architecture & Registry

export * from './types';
export * from './registry';
export * from './figureSequencePlugin';

// Backward compatibility re-exports from figureSequenceEngine
export {
  generateFigureSequence,
  validateGeneratedQuestion,
  SeededPRNG,
  GENERATOR_TYPE,
  GENERATOR_VERSION,
} from './figureSequenceEngine';
