import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Cpu,
  Layers,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { FigureSequenceGrid } from '../../components/figure-sequence/FigureSequenceGrid';
import { QuestionRenderer } from '../../components/questions/QuestionRenderer';
import { useTenant } from '../../contexts/TenantContext';
import { questionPluginRegistry } from '../../generator';
import { adminService } from '../../services/adminService';
import { examService } from '../../services/examService';
import { Difficulty, ExamSection, GenerationValidationResult, Question, Topic } from '../../types';

export const GeneratorWorkbench: React.FC = () => {
  const { currentTenant, activeExam } = useTenant();

  // Dynamic Generator Plugin Discovery
  const availableGenerators = useMemo(() => {
    return questionPluginRegistry.getAllPlugins().filter((p) => Boolean(p.generator));
  }, []);

  const [selectedGeneratorType, setSelectedGeneratorType] = useState<string>(() => {
    return availableGenerators[0]?.type || 'FIGURE_SEQUENCE';
  });

  const [sections, setSections] = useState<ExamSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [loadingSections, setLoadingSections] = useState(false);

  const [seed, setSeed] = useState('workbench-seed-01');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [generatedQuestion, setGeneratedQuestion] = useState<Question | null>(null);
  const [validation, setValidation] = useState<GenerationValidationResult | null>(null);
  const [savedToBank, setSavedToBank] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync selected generator type if available generators change
  useEffect(() => {
    if (availableGenerators.length > 0 && !availableGenerators.some((g) => g.type === selectedGeneratorType)) {
      setSelectedGeneratorType(availableGenerators[0].type);
    }
  }, [availableGenerators, selectedGeneratorType]);

  // Load sections when activeExam changes
  useEffect(() => {
    let isCancelled = false;
    setGeneratedQuestion(null);
    setValidation(null);
    setSavedToBank(false);

    if (!activeExam) {
      setSections([]);
      setSelectedSectionId('');
      setTopics([]);
      setSelectedTopicId('');
      return;
    }

    setLoadingSections(true);
    examService
      .getSections(activeExam.id)
      .then((sList) => {
        if (isCancelled) return;
        setSections(sList);
        if (sList.length > 0) {
          setSelectedSectionId(sList[0].id);
        } else {
          setSelectedSectionId('');
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load sections for active exam:', err);
          setSections([]);
          setSelectedSectionId('');
        }
      })
      .finally(() => {
        if (!isCancelled) setLoadingSections(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeExam?.id]);

  // Load topics when selectedSectionId changes
  useEffect(() => {
    let isCancelled = false;
    if (!selectedSectionId) {
      setTopics([]);
      setSelectedTopicId('');
      return;
    }

    examService
      .getTopics(selectedSectionId)
      .then((tList) => {
        if (isCancelled) return;
        setTopics(tList);
        if (tList.length > 0) {
          setSelectedTopicId(tList[0].id);
        } else {
          setSelectedTopicId('');
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load topics for section:', err);
          setTopics([]);
          setSelectedTopicId('');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedSectionId]);

  // Run generator via Phase 2B QuestionPluginRegistry
  const handleGenerateAndValidate = () => {
    if (!currentTenant || !activeExam) {
      alert('Please select an active tenant and examination first.');
      return;
    }
    if (!selectedSectionId) {
      alert('Please select a section for this examination.');
      return;
    }

    setLoading(true);
    setSavedToBank(false);

    try {
      const result = questionPluginRegistry.generate({
        generatorType: selectedGeneratorType,
        seed,
        difficulty,
        tenantId: currentTenant.id,
        examId: activeExam.id,
        sectionId: selectedSectionId,
        topicId: selectedTopicId || undefined,
      });

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

  if (!activeExam) {
    return (
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">No Active Examination Configured</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The selected tenant ({currentTenant?.name || 'Unknown'}) does not currently have an active examination.
          Please switch to an active tenant or configure an examination to access the procedural generator workbench.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">Generator Workbench</h1>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
              {activeExam.slug}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Deterministic PRNG algorithmic question synthesis with plugin validation and live preview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRandomSeed}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Randomize Seed</span>
          </button>

          <button
            type="button"
            id="btn-run-workbench"
            disabled={loading || !selectedSectionId}
            onClick={handleGenerateAndValidate}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{loading ? 'Synthesizing...' : 'Generate & Validate'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Hierarchy Selection Bar */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Generator Type Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Generator Plugin</span>
          </label>
          <select
            id="workbench-generator-type"
            value={selectedGeneratorType}
            onChange={(e) => setSelectedGeneratorType(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-hidden focus:border-teal-400 cursor-pointer"
          >
            {availableGenerators.map((gen) => (
              <option key={gen.type} value={gen.type}>
                {gen.displayName} ({gen.type})
              </option>
            ))}
          </select>
        </div>

        {/* Section Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Target Exam Section</span>
          </label>
          <select
            id="workbench-section-selector"
            value={selectedSectionId}
            disabled={loadingSections || sections.length === 0}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-hidden focus:border-teal-400 cursor-pointer disabled:opacity-50"
          >
            {sections.length === 0 ? (
              <option value="">No sections available</option>
            ) : (
              sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Topic Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span>Topic (Optional)</span>
          </label>
          <select
            id="workbench-topic-selector"
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-hidden focus:border-teal-400 cursor-pointer"
          >
            <option value="">General Section Level</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Synthesis Inputs: Seed and Difficulty */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Deterministic PRNG Seed String
          </label>
          <input
            type="text"
            id="input-generator-seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="e.g. workbench-seed-01"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-teal-300 focus:outline-hidden focus:border-teal-400"
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
                className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
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
      </div>

      {/* Workbench Visualizer & 10-Point Checklist */}
      {generatedQuestion && validation ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Visual Question Preview */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 text-slate-900 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Synthesized Question Preview ({generatedQuestion.question_type})
              </span>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded text-slate-700">
                Correct: Option {generatedQuestion.correct_answer}
              </span>
            </div>

            {/* Custom Figure Sequence Visualizer if FIGURE_SEQUENCE */}
            {generatedQuestion.question_type === 'FIGURE_SEQUENCE' ? (
              <div className="space-y-6">
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
              </div>
            ) : (
              /* Generic Question Preview for other generator types */
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <QuestionRenderer
                  question={generatedQuestion}
                  selectedAnswer={generatedQuestion.correct_answer}
                  onSelectAnswer={() => {}}
                  result={{
                    attempt_id: 'workbench-preview',
                    question_id: generatedQuestion.id,
                    selected_answer: generatedQuestion.correct_answer,
                    is_correct: true,
                    correct_answer: generatedQuestion.correct_answer,
                    explanation: generatedQuestion.explanation,
                    solution: generatedQuestion.solution,
                    time_spent_seconds: 0,
                    marks_awarded: 1,
                  }}
                />
              </div>
            )}

            {/* Explanation & Math Logic */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900">Explanation & Validation Notes:</div>
              <p className="text-slate-600 leading-relaxed">{generatedQuestion.explanation}</p>
            </div>

            {/* Action to Push into Question Bank */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Ready to be included in student practice tests and diagnostic drills.
              </span>
              <button
                type="button"
                id="btn-save-generated-question"
                onClick={handleSaveToBank}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {savedToBank ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{savedToBank ? 'Saved to Question Bank!' : 'Add to Question Bank'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Validation Checklist */}
          <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Automated Validation Suite</h3>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  (validation.isValid ?? (validation as any).passed ?? validation.checks.every((c) => c.passed))
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {(validation.isValid ?? (validation as any).passed ?? validation.checks.every((c) => c.passed))
                  ? 'ALL CHECKS PASSED'
                  : 'VALIDATION FAILED'}
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
            Click &quot;Generate &amp; Validate&quot; above to synthesize a question item with the seed &quot;{seed}&quot;.
          </p>
        </div>
      )}
    </div>
  );
};
