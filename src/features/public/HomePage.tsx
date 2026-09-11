import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { FigureSequenceGrid } from '../../components/figure-sequence/FigureSequenceGrid';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { generateFigureSequence } from '../../generator/figureSequenceEngine';

export const HomePage: React.FC = () => {
  const { currentTenant, studentPortalPath } = useTenant();
  const { tier } = useAuth();
  const navigate = useNavigate();

  // Interactive micro-drill preview for the landing page
  const [interactiveQuestion] = useState(() => {
    const { question } = generateFigureSequence(
      'home-interactive-demo',
      'EASY',
      'e0000000-0000-0000-0000-000000000001',
      's0000000-0000-0000-0000-000000000001',
      currentTenant?.id || 'a0000000-0000-0000-0000-000000000001'
    );
    return question;
  });

  const [selectedDemoOption, setSelectedDemoOption] = useState<string | null>(null);
  const [demoChecked, setDemoChecked] = useState(false);

  const givenSteps = interactiveQuestion.question_data?.steps?.slice(0, 4) || [];

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* 1. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Standardized Examination Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Master the <span className="text-teal-700">{currentTenant?.name}</span> with Mathematical Precision.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Engineered specifically for competitive admission and certification candidates. Practice with
              deterministic 4x4 matrix figure sequences, timed sectional simulations, and authoritative step-by-step
              analytical solutions.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                to={`${studentPortalPath}/practice`}
                id="hero-start-practice"
                className="px-6 py-3.5 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800 transition-all shadow-md flex items-center gap-2"
              >
                <span>Start Free Diagnostic Test</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/exam"
                className="px-5 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all"
              >
                View Exam Format & Syllabus
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 max-w-lg">
              <div>
                <div className="text-2xl font-black text-slate-900">4x4</div>
                <div className="text-xs text-slate-500 font-medium">Matrix Sequences</div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">90 Min</div>
                <div className="text-xs text-slate-500 font-medium">Official Simulation</div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">100%</div>
                <div className="text-xs text-slate-500 font-medium">Deterministic Logic</div>
              </div>
            </div>
          </div>

          {/* Right Hero Card: Live Interactive Preview */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Live Sample: 4x4 Grid Drill
                  </span>
                </div>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                  Difficulty: {interactiveQuestion.difficulty}
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  Deduce the position transition across Grids 1 to 4. What must Grids 5 & 6 be?
                </p>

                {/* 4 Given Grids */}
                <div className="grid grid-cols-4 gap-2 items-center justify-center p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                  {givenSteps.map((grid, idx) => (
                    <FigureSequenceGrid key={idx} grid={grid} label={`G${idx + 1}`} size="sm" />
                  ))}
                </div>

                {/* Missing prompt */}
                <div className="flex items-center justify-center gap-3 py-2 bg-teal-50/50 rounded-lg border border-dashed border-teal-300 text-xs text-teal-800 font-medium">
                  <span>Grid 5 = ?</span>
                  <span>•</span>
                  <span>Grid 6 = ?</span>
                </div>

                {/* Options preview */}
                <div className="grid grid-cols-2 gap-2">
                  {interactiveQuestion.options.map((opt) => {
                    const isSel = selectedDemoOption === opt.option_key;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedDemoOption(opt.option_key);
                          setDemoChecked(false);
                        }}
                        className={`p-2 rounded-lg border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                          isSel
                            ? 'border-teal-600 bg-teal-50 font-bold text-teal-900'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span>Option {opt.option_key}</span>
                        {demoChecked && opt.option_key === interactiveQuestion.correct_answer && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!selectedDemoOption}
                    onClick={() => setDemoChecked(true)}
                    className="flex-1 py-2 rounded-lg bg-teal-700 text-white font-semibold text-xs disabled:opacity-40 hover:bg-teal-800 transition-colors"
                  >
                    Check Answer
                  </button>

                  <Link
                    to={`${studentPortalPath}/practice`}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors"
                  >
                    Full Practice →
                  </Link>
                </div>

                {demoChecked && (
                  <div
                    className={`p-2.5 rounded-lg text-xs ${
                      selectedDemoOption === interactiveQuestion.correct_answer
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {selectedDemoOption === interactiveQuestion.correct_answer ? (
                      <span className="font-bold">Correct! Well done!</span>
                    ) : (
                      <span>The correct choice is Option {interactiveQuestion.correct_answer}.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Core Modules / Exam Sections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            {currentTenant?.slug === 'dmathub' ? 'dMAT Official 4-Section Curriculum' : 'Curriculum Structure'}
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Structured modules designed to test abstract spatial reasoning, modular algebra, and academic deduction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black mb-4">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Figure Sequences</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Identify 4x4 matrix vector movements, border reflections, rotational symmetries, and multi-symbol collisions.
            </p>
            <div className="text-xs font-semibold text-teal-700 flex items-center gap-1">
              <span>20 Questions • 25 Mins</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-black mb-4">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Mathematical Equations</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Solve complex algebraic systems, unknown operator definitions, and modular arithmetic constraints under time pressure.
            </p>
            <div className="text-xs font-semibold text-sky-700 flex items-center gap-1">
              <span>20 Questions • 25 Mins</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black mb-4">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Latin Squares</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Orthogonal deduction puzzles where every symbol must appear exactly once across rows and columns.
            </p>
            <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
              <span>15 Questions • 20 Mins</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black mb-4">
              4
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Academic Reasoning</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Critically analyze research abstracts, evaluate hypothesis validity, and assess scientific syllogisms.
            </p>
            <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
              <span>15 Questions • 20 Mins</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Reusable Platform Highlights */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Procedural Deterministic Generator</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                10-point mathematical validation ensures every generated figure sequence has exactly one unique logical
                solution, no duplicate distractors, and reproducible seeds.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Authoritative Server Scoring</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero client-side trust. Countdown timers, question answers, and results are computed and persisted in
                PostgreSQL with state recovery on page refresh.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Multi-Tenant SaaS Foundation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Create new examination portals (NISM, ISTQB, University Admissions) without touching core engine code.
                All branding, questions, and configs are isolated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bottom CTA banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-3xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl sm:text-3xl font-black">Ready to test your analytical readiness?</h3>
            <p className="text-sm text-teal-100">
              Try the 10-question fixed diagnostic test immediately as a Guest, or register to unlock the full 20-item
              bank and performance dashboard.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`${studentPortalPath}/practice`}
              className="px-6 py-3.5 rounded-xl bg-white text-teal-900 font-bold text-sm hover:bg-teal-50 transition-colors shadow-md"
            >
              Start Free Practice →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
