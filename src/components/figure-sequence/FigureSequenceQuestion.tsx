import React from 'react';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { FigureSequenceGrid } from './FigureSequenceGrid';
import { AttemptAnswer, FigureSequenceQuestionData, Question } from '../../types';

interface FigureSequenceQuestionProps {
  question: Question;
  selectedOptionKey?: string;
  onSelectOption: (key: string) => void;
  result?: AttemptAnswer; // if checked in practice mode or submitted
  disabled?: boolean;
}

export const FigureSequenceQuestion: React.FC<FigureSequenceQuestionProps> = ({
  question,
  selectedOptionKey,
  onSelectOption,
  result,
  disabled = false,
}) => {
  const data = question.question_data as FigureSequenceQuestionData;
  const givenSteps = data?.steps?.slice(0, 4) || [];

  return (
    <div className="space-y-6">
      {/* 1. Problem Statement */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-100/70 px-2.5 py-0.5 rounded-full">
            Figure Sequence • 4x4 Grid Matrix
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Difficulty: <span className="text-slate-800 font-bold">{question.difficulty}</span>
          </span>
        </div>
        <p className="text-slate-800 font-medium text-base sm:text-lg leading-relaxed">
          {question.question_text}
        </p>
      </div>

      {/* 2. Given Sequence: Grids 1 to 4 + Missing Grids 5 & 6 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Problem Sequence (Steps 1 → 6)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center justify-center">
          {givenSteps.map((grid, idx) => (
            <React.Fragment key={`given-${idx}`}>
              <div className="flex flex-col items-center">
                <FigureSequenceGrid grid={grid} label={`Grid ${idx + 1}`} size="md" />
              </div>
            </React.Fragment>
          ))}
          {/* Missing Step 5 */}
          <div className="flex flex-col items-center">
            <FigureSequenceGrid grid={{} as any} label="Grid 5" size="md" isMissing />
          </div>
          {/* Missing Step 6 */}
          <div className="flex flex-col items-center">
            <FigureSequenceGrid grid={{} as any} label="Grid 6" size="md" isMissing />
          </div>
        </div>
      </div>

      {/* 3. Options Choices: A, B, C, D */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Select the Matching Pair for [Grid 5, Grid 6]:
          </h3>
          {selectedOptionKey && !result && (
            <span className="text-xs text-teal-700 font-medium">Selected: Choice {selectedOptionKey}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.options.map((opt) => {
            const isSelected = selectedOptionKey === opt.option_key;
            const grid5 = opt.option_data?.grid5;
            const grid6 = opt.option_data?.grid6;

            // Result indicators
            let borderClass = 'border-slate-200 hover:border-teal-500 hover:bg-slate-50/60';
            if (isSelected) {
              borderClass = 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-500/20';
            }

            if (result) {
              if (result.correct_answer === opt.option_key) {
                borderClass = 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/30';
              } else if (isSelected && !result.is_correct) {
                borderClass = 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/30';
              }
            }

            return (
              <button
                key={opt.id}
                type="button"
                id={`btn-option-${opt.option_key}`}
                onClick={() => !disabled && onSelectOption(opt.option_key)}
                disabled={disabled}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex flex-col gap-3 ${borderClass} cursor-pointer`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                        isSelected
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {opt.option_key}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">Option {opt.option_key}</span>
                  </div>

                  {result && result.correct_answer === opt.option_key && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer
                    </span>
                  )}
                  {result && isSelected && !result.is_correct && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                      <XCircle className="w-3.5 h-3.5" /> Your Choice
                    </span>
                  )}
                </div>

                {/* Candidate Grids 5 & 6 */}
                <div className="flex items-center justify-center gap-4 py-1 bg-white rounded-lg border border-slate-100">
                  {grid5 && <FigureSequenceGrid grid={grid5} label="Grid 5" size="sm" />}
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                  {grid6 && <FigureSequenceGrid grid={grid6} label="Grid 6" size="sm" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Explanation & Solution (Revealed when result exists) */}
      {result && (
        <div
          className={`rounded-xl border p-5 ${
            result.is_correct ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {result.is_correct ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-emerald-800">Correct! Choice {result.correct_answer} is the exact sequence.</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-amber-700" />
                <span className="font-bold text-amber-900">
                  Incorrect. The correct answer is Choice {result.correct_answer}.
                </span>
              </>
            )}
          </div>

          {result.explanation && (
            <div className="mt-3 text-sm text-slate-800 space-y-2 whitespace-pre-line bg-white/80 p-4 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-900">Mathematical & Geometric Explanation:</div>
              <p>{result.explanation}</p>
            </div>
          )}

          {result.solution && (
            <div className="mt-2 text-xs text-slate-600 bg-white/50 p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800">Step-by-step Solution: </span>
              {result.solution}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
