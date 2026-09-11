import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Cpu,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { FigureSequenceGrid } from '../../components/figure-sequence/FigureSequenceGrid';
import { useTenant } from '../../contexts/TenantContext';
import { generateFigureSequence } from '../../generator/figureSequenceEngine';
import { adminService } from '../../services/adminService';
import { Difficulty, GenerationValidationResult, Question } from '../../types';

export const GeneratorWorkbench: React.FC = () => {
  const { currentTenant } = useTenant();

  const [seed, setSeed] = useState('dmat-workbench-alpha-77');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [generatedQuestion, setGeneratedQuestion] = useState<Question | null>(null);
  const [validation, setValidation] = useState<GenerationValidationResult | null>(null);
  const [savedToBank, setSavedToBank] = useState(false);
  const [loading, setLoading] = useState(false);

  // Run generator and 10-point mathematical validation suite
  const handleGenerateAndValidate = () => {
    setLoading(true);
    setSavedToBank(false);

    try {
      const result = generateFigureSequence(
        seed,
        difficulty,
        'e0000000-0000-0000-0000-000000000001',
        's0000000-0000-0000-0000-000000000001',
        currentTenant?.id || 'a0000000-0000-0000-0000-000000000001'
      );

      setGeneratedQuestion(result.question);
      setValidation(result.validation);
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRandomSeed = () => {
    const randomStr = `seed-${Math.random().toString(36).substring(2, 10)}`;
    setSeed(randomStr);
  };

  const handleSaveToBank = async () => {
    if (!generatedQuestion) return;
    try {
      await adminService.createQuestion(generatedQuestion);
      setSavedToBank(true);
      setTimeout(() => setSavedToBank(false), 3000);
    } catch (err: any) {
      alert(`Failed to save to bank: ${err.message}`);
    }
  };

  const givenSteps = generatedQuestion?.question_data?.steps?.slice(0, 4) || [];

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Figure Generator Workbench</h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic PRNG sequence synthesis with live 10-point automated mathematical validation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRandomSeed}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Randomize Seed</span>
          </button>

          <button
            type="button"
            id="btn-run-workbench"
            onClick={handleGenerateAndValidate}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Generate & Validate</span>
          </button>
        </div>
      </div>

      {/* Inputs Configuration Bar */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Deterministic PRNG Seed String
          </label>
          <input
            type="text"
            id="input-generator-seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="e.g. dmat-sequence-001"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-teal-300 focus:outline-none focus:border-teal-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Complexity / Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficulty(diff)}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  difficulty === diff
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Algorithm Metadata
          </label>
          <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span>Dimensions: 4x4 Grid Matrix • Steps: 6 Total</span>
          </div>
        </div>
      </div>

      {/* Workbench Visualizer & 10-Point Checklist */}
      {generatedQuestion && validation ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 cols: Interactive Visual Sequence */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 text-slate-900 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Synthesized 4x4 Sequence Visualizer
              </span>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded text-slate-700">
                Correct: Option {generatedQuestion.correct_answer}
              </span>
            </div>

            {/* Grids 1 to 4 */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Given Sequence (Steps 1 to 4):
              </div>
              <div className="grid grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {givenSteps.map((grid, idx) => (
                  <FigureSequenceGrid key={idx} grid={grid} label={`Step ${idx + 1}`} size="sm" />
                ))}
              </div>
            </div>

            {/* Generated Distractor Options A, B, C, D */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Candidate Option Pairs [Grid 5, Grid 6]:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {generatedQuestion.options.map((opt) => {
                  const isCorrect = opt.option_key === generatedQuestion.correct_answer;
                  return (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-xl border flex flex-col gap-2 ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>Option {opt.option_key}</span>
                        {isCorrect && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full font-bold">
                            Correct Solution
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-3 py-1 bg-slate-50 rounded-lg">
                        {opt.option_data?.grid5 && (
                          <FigureSequenceGrid grid={opt.option_data.grid5} label="G5" size="sm" />
                        )}
                        <span className="text-slate-400 font-bold">→</span>
                        {opt.option_data?.grid6 && (
                          <FigureSequenceGrid grid={opt.option_data.grid6} label="G6" size="sm" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation & Math Logic */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900">Mathematical Explanation:</div>
              <p className="text-slate-600 leading-relaxed">{generatedQuestion.explanation}</p>
            </div>

            {/* Action to Push into Question Bank */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Ready to be included in student diagnostic drills and mock exams.
              </span>
              <button
                type="button"
                id="btn-save-generated-question"
                onClick={handleSaveToBank}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {savedToBank ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{savedToBank ? 'Question Bank Updated!' : 'Add to Question Bank'}</span>
              </button>
            </div>
          </div>

          {/* Right 5 cols: 10-Point Mathematical Validation Checklist */}
          <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">10-Point Validator Suite</h3>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  validation.passed
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {validation.passed ? 'ALL CHECKS PASSED' : 'VALIDATION FAILED'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {validation.checks.map((c, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    c.passed
                      ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                      : 'bg-rose-950/40 border-rose-800 text-rose-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-2">
                      <span className="font-mono text-slate-500 text-[10px]">#{idx + 1}</span>
                      <span className="text-white">{c.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{c.details}</p>
                  </div>

                  <span className="shrink-0 mt-0.5">
                    {c.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-16 text-center text-slate-500 space-y-3">
          <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-medium">
            Click "Generate & Validate" above to synthesize a figure sequence with the seed "{seed}".
          </p>
        </div>
      )}
    </div>
  );
};
