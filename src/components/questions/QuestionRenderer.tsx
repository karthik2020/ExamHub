import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { FigureSequenceQuestion } from '../figure-sequence/FigureSequenceQuestion';
import { AttemptAnswer, Question } from '../../types';

interface QuestionRendererProps {
  question: Question;
  selectedAnswer?: string;
  onSelectAnswer: (val: string) => void;
  result?: AttemptAnswer;
  disabled?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  selectedAnswer,
  onSelectAnswer,
  result,
  disabled = false,
}) => {
  if (question.question_type === 'FIGURE_SEQUENCE') {
    return (
      <FigureSequenceQuestion
        question={question}
        selectedOptionKey={selectedAnswer}
        onSelectOption={onSelectAnswer}
        result={result}
        disabled={disabled}
      />
    );
  }

  // Standard MCQ / Passage / Numerical
  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-800 bg-sky-100/70 px-2.5 py-0.5 rounded-full">
            {question.question_type.replace('_', ' ')}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Difficulty: <span className="text-slate-800 font-bold">{question.difficulty}</span>
          </span>
        </div>
        <p className="text-slate-800 font-medium text-base sm:text-lg leading-relaxed whitespace-pre-line">
          {question.question_text}
        </p>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-bold uppercase tracking-wider text-slate-700">Choose One Option:</div>
        <div className="space-y-2.5">
          {question.options.map((opt) => {
            const isSelected = selectedAnswer === opt.option_key;

            let borderClass = 'border-slate-200 hover:border-teal-500 hover:bg-slate-50';
            if (isSelected) {
              borderClass = 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-500/20';
            }

            if (result) {
              if (result.correct_answer === opt.option_key) {
                borderClass = 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30';
              } else if (isSelected && !result.is_correct) {
                borderClass = 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/30';
              }
            }

            return (
              <button
                key={opt.id}
                type="button"
                id={`mcq-opt-${opt.option_key}`}
                disabled={disabled}
                onClick={() => !disabled && onSelectAnswer(opt.option_key)}
                className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${borderClass} cursor-pointer`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      isSelected
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {opt.option_key}
                  </span>
                  <span className="text-slate-800 font-medium text-base">{opt.option_text}</span>
                </div>

                {result && result.correct_answer === opt.option_key && (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                  </span>
                )}
                {result && isSelected && !result.is_correct && (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                    <XCircle className="w-3.5 h-3.5" /> Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {result && (
        <div
          className={`rounded-xl border p-5 ${
            result.is_correct ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2 font-bold">
            {result.is_correct ? (
              <span className="text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Correct! Choice {result.correct_answer} is
                the right answer.
              </span>
            ) : (
              <span className="text-amber-900 flex items-center gap-1.5">
                <XCircle className="w-5 h-5 text-amber-700" /> Incorrect. The correct answer is Choice{' '}
                {result.correct_answer}.
              </span>
            )}
          </div>

          {result.explanation && (
            <div className="mt-3 text-sm text-slate-800 space-y-1 bg-white/80 p-4 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-900">Explanation:</div>
              <p>{result.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
