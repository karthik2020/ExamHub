import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck2,
  GraduationCap,
  Layers,
  Sparkles,
  TrendingUp,
  Target,
  Brain,
  Lightbulb,
} from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { useTenant } from '../../contexts/TenantContext';

export const HowItWorksPage: React.FC = () => {
  const { studentPortalPath } = useTenant();

  const steps = [
    {
      num: '01',
      title: 'Take the Diagnostic Assessment',
      subtitle: 'Establish your quantitative and spatial baseline',
      desc: 'Start with our free 10-question diagnostic test without creating an account. The system evaluates your initial accuracy and time-per-question across core Figure Sequence patterns.',
      detail: 'Free for all candidates • 15 minutes limit • Immediate score report',
    },
    {
      num: '02',
      title: 'Target Sectional Deficiencies',
      subtitle: 'Drill specific spatial and deductive rules',
      desc: 'Create a free member account to access 20+ verified practice drills covering vector reflections, rotational transformations, modular arithmetic, and Latin square deduction.',
      detail: 'Detailed step-by-step SVG solutions • Persistent attempt records',
    },
    {
      num: '03',
      title: 'Unlock Unlimited Procedural Generation',
      subtitle: 'Internalize abstract rules instead of memorizing questions',
      desc: 'PRO members access our deterministic procedural engine, generating endless fresh 4x4 matrix sequences across Easy, Medium, and Hard difficulties with zero duplicate patterns.',
      detail: 'Configurable test lengths • Custom difficulty targeting • Unique puzzles every drill',
    },
    {
      num: '04',
      title: 'Simulate Full-Length Examination Conditions',
      subtitle: 'Build test-day stamina and timing discipline',
      desc: 'Sit for complete timed mock examinations mirroring the official 90-minute structure with active countdown timers, sectional boundaries, and strict non-calculator policy.',
      detail: 'Full curriculum simulation • Section-by-section transition • Test-day interface',
    },
    {
      num: '05',
      title: 'Track Readiness Index to 65% Target',
      subtitle: 'Data-driven readiness modeling',
      desc: 'Our Readiness Index tracks your empirical accuracy and attempt volume directly against the official 65% threshold, giving actionable recommendations on when you are exam-ready.',
      detail: '0–100 Readiness Index • Weak topic alerts • Progress trajectory',
    },
  ];

  return (
    <div className="space-y-20 py-10 sm:py-16">
      <SEOHead
        title="How dMATHub Works — The dMAT Preparation Framework"
        description="A systematic 5-step preparation framework for the Doctoral Management Aptitude Test. From baseline diagnostic to timed simulation and readiness modeling."
        canonical="https://dmathub.com/how-it-works"
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-teal-700" />
            <span>Preparation Methodology</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            How Candidates Prepare with dMATHub
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            A structured, pedagogical path designed specifically for candidates targeting doctoral admissions.
            Progress systematically from initial evaluation to full exam mastery.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`${studentPortalPath || '/ems'}/practice`}
              className="px-6 py-3.5 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800 transition-all shadow-md flex items-center gap-2"
            >
              <span>Step 1: Start Free Diagnostic</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5 Steps Roadmap */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {steps.map((s, idx) => (
            <div
              key={s.num}
              className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-6 items-start md:items-center justify-between hover:border-teal-300 transition-all"
            >
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                  {s.num}
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    {s.subtitle}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">{s.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                    {s.desc}
                  </p>
                </div>
              </div>

              <div className="shrink-0 w-full md:w-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium space-y-2">
                <div className="flex items-center gap-2 text-teal-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Key Deliverable</span>
                </div>
                <div className="text-slate-600">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Pedagogical Principles */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Pedagogical Philosophy</span>
            <h2 className="text-3xl font-black">Four Principles of High Scoring</h2>
            <p className="text-xs sm:text-sm text-slate-400">Rules derived from cognitive science and competitive aptitude testing.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
              <Brain className="w-8 h-8 text-teal-400" />
              <h4 className="font-bold text-white text-base">Invariance Over Speed</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Speed without systematic rule extraction yields mistakes. Always isolate the constant vector displacement
                before evaluating secondary rotations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
              <Target className="w-8 h-8 text-sky-400" />
              <h4 className="font-bold text-white text-base">Elimination Strategy</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                In multi-symbol sequences, eliminating 3 incorrect options via one invariant is faster than solving all 4
                symbols simultaneously.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
              <Clock className="w-8 h-8 text-amber-400" />
              <h4 className="font-bold text-white text-base">75-Second Budget</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                With 20 questions in 25 minutes, train with strict per-question timers. Flag tough questions after 60
                seconds and return during the review window.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
              <Lightbulb className="w-8 h-8 text-indigo-400" />
              <h4 className="font-bold text-white text-base">Solution Deconstruction</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Never just check if an answer was right or wrong. Inspect the full vector breakdown to learn the underlying
                transformation grammar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-4">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
            Start Your Systematic Preparation Now
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Take the free 10-question diagnostic test to benchmark your current level against the dMAT standard.
          </p>
          <div className="pt-2">
            <Link
              to={`${studentPortalPath || '/ems'}/practice`}
              className="px-7 py-3.5 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800 transition-colors inline-flex items-center gap-2 shadow-md"
            >
              <span>Take Free Diagnostic Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
