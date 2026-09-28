import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  Shield,
  GraduationCap,
  Compass,
  FileCheck2,
  BarChart3,
  HelpCircle,
  Check,
} from 'lucide-react';
import { FigureSequenceShowcase } from '../../components/figure-sequence/FigureSequenceShowcase';
import { SEOHead } from '../../components/common/SEOHead';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';

export const HomePage: React.FC = () => {
  const { studentPortalPath } = useTenant();
  const { setLoginModalOpen, isAuthenticated } = useAuth();

  return (
    <div className="space-y-24 py-10 sm:py-16">
      <SEOHead
        title="dMATHub — Master the Doctoral Management Aptitude Test"
        description="The dedicated preparation platform for the dMAT. Master 4x4 figure sequences, modular algebra, Latin squares, and full-length timed mock exams."
        canonical="https://dmathub.com/"
      />

      {/* 1. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 text-teal-700" />
            <span>Dedicated dMAT Examination Preparation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Master the <span className="text-teal-700">dMAT</span> with Systematic Mathematical Rigor.
          </h1>

          <p className="text-base sm:text-xl text-slate-600 leading-relaxed font-normal">
            The focused preparation platform for Doctoral Management Aptitude Test candidates.
            Practice with deterministic 4x4 matrix figure sequences, timed sectional simulations,
            and authoritative step-by-step analytical solutions.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={`${studentPortalPath || '/ems'}/practice`}
              id="hero-cta-practice"
              className="px-7 py-4 rounded-xl bg-teal-700 text-white font-bold text-sm sm:text-base hover:bg-teal-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2.5"
            >
              <span>Start Free Diagnostic Test</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/practice"
              id="hero-cta-curriculum"
              className="px-6 py-4 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-sm sm:text-base hover:bg-slate-50 transition-all shadow-xs"
            >
              Explore Curriculum & Format
            </Link>
          </div>

          {/* Factual Core Metrics */}
          <div className="pt-10 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto text-left">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="text-2xl font-black text-slate-900">4 Modules</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Full Curriculum Coverage</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="text-2xl font-black text-slate-900">4x4 Grids</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Vector & Symmetry Invariants</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="text-2xl font-black text-slate-900">90 Mins</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Timed Full Simulation</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="text-2xl font-black text-slate-900">65% Target</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Empirical Readiness Index</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Figure Sequence Interactive Showcase */}
      <section id="demo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FigureSequenceShowcase />
      </section>

      {/* 3. The 4 Curriculum Sections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Official Curriculum Coverage</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
            Engineered for the Four dMAT Modules
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Each section targets specific cognitive competencies demanded by doctoral and graduate management admissions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-base">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Figure Sequences</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                4x4 matrix vector movements, border reflections, rotational symmetries, and multi-symbol collision bounds.
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-teal-800">20 Questions</span>
              <span className="text-slate-500">25 Mins Limit</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-sky-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-black text-base">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Mathematical Equations</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Modular arithmetic, operator replacements, linear and non-linear constraint systems under strict time limits.
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-sky-800">20 Questions</span>
              <span className="text-slate-500">25 Mins Limit</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-base">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Latin Squares</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Orthogonal deduction puzzles where every symbol must appear exactly once across all rows and columns.
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-800">15 Questions</span>
              <span className="text-slate-500">20 Mins Limit</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-base">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Academic Reasoning</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Critical analysis of research abstracts, scientific charts, hypothesis testing, and logical deductions.
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-amber-800">15 Questions</span>
              <span className="text-slate-500">20 Mins Limit</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Why Prepare with dMATHub */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Technical Precision & Pedagogy
            </span>
            <h2 className="text-3xl sm:text-4xl font-black">Why Candidates Choose dMATHub</h2>
            <p className="text-sm sm:text-base text-slate-400">
              Generic aptitude tools rely on static PDFs and unverified answer keys. dMATHub is engineered from the ground up for the specific dMAT format.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Deterministic Procedural Generator</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Our mathematical generator ensures that every procedural figure sequence has exactly one unique logical
                solution, no duplicate distractors, and verifiable reproducible seeds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Authoritative Server Scoring</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Zero client-side trust. Countdown timers, question answers, and scoring formulas are computed and persisted in
                PostgreSQL with state recovery on page refresh.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Empirical Readiness Index</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                No subjective star ratings. Your readiness score (0–100) measures your historical accuracy directly against
                the 65% target passing threshold, highlighting weak topics automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 5-Step Candidate Journey */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Methodical Framework</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">How It Works</h2>
          <p className="text-sm text-slate-600">A structured 5-step preparation framework to take you from initial evaluation to examination mastery.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[
            {
              step: '1',
              title: 'Diagnostic Test',
              desc: 'Take the free 10-question diagnostic to establish your initial sectional baseline without registration.',
            },
            {
              step: '2',
              title: 'Curriculum Drills',
              desc: 'Practice high-yield fixed drills in 4x4 matrix sequences, modular algebra, and Latin squares.',
            },
            {
              step: '3',
              title: 'Procedural Drill (PRO)',
              desc: 'Generate unlimited fresh variations to train pattern recognition without memorizing static keys.',
            },
            {
              step: '4',
              title: 'Timed Simulation',
              desc: 'Simulate full test pressure with strict countdown clocks, section navigation, and zero distractions.',
            },
            {
              step: '5',
              title: 'Readiness & Plan',
              desc: 'Inspect step-by-step SVG solutions and follow recommendations until your Readiness Index exceeds 65%.',
            },
          ].map((s) => (
            <div key={s.step} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 relative">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center font-black text-sm">
                {s.step}
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{s.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Pricing & Tier Progression */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Transparent Access Plans</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Choose Your Preparation Tier</h2>
          <p className="text-sm text-slate-600">
            Start immediately as a Free Guest, register for extended bank access and analytics, or subscribe to Pro for unlimited procedural generation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Tier 1: Free Guest */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tier 1</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Free Guest</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Evaluate the official format and difficulty without creating an account.
                </p>
              </div>

              <div className="text-3xl font-black text-slate-900">
                €0 <span className="text-xs font-medium text-slate-500">Free forever</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>10-question fixed diagnostic test</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Instant server-side score calculation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>No credit card or email required</span>
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  <span className="w-4 h-4 text-center shrink-0">✕</span>
                  <span>Attempt history & progress tracking</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <Link
                to={`${studentPortalPath || '/ems'}/practice`}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs text-center block transition-colors"
              >
                Start as Guest
              </Link>
            </div>
          </div>

          {/* Tier 2: Registered Member */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Tier 2</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Registered Member</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Full verified fixed question bank with progress dashboard and solutions.
                </p>
              </div>

              <div className="text-3xl font-black text-slate-900">
                €0 <span className="text-xs font-medium text-slate-500">Free with account</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Full fixed verified question bank</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Detailed step-by-step SVG solutions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Persistent attempt history & analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Readiness Index & topic recommendations</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center block transition-colors cursor-pointer"
              >
                Create Free Account
              </button>
            </div>
          </div>

          {/* Tier 3: Pro Unlimited Generator */}
          <div className="p-6 sm:p-8 rounded-3xl bg-teal-900 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Tier 3 • Full Access</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/40">
                  Most Comprehensive
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Pro Unlimited Generator</h3>
                <p className="text-xs text-teal-200 mt-1">
                  Algorithmic endless matrix generation with custom difficulty for complete mastery.
                </p>
              </div>

              <div className="text-3xl font-black text-white">
                €29 <span className="text-xs font-medium text-teal-300">/ month</span>
              </div>

              <ul className="space-y-3 text-xs text-teal-100">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Unlimited procedural Figure Sequence drills</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Configurable difficulty: Easy, Medium, Hard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Full 90-minute timed mock test simulation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Priority weak-topic recommendation engine</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-teal-800">
              <Link
                to="/pricing"
                className="w-full py-3 rounded-xl bg-white text-teal-950 hover:bg-teal-50 font-bold text-xs text-center block transition-colors shadow-md"
              >
                View Plan Details
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom Conversion Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-3xl p-8 sm:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-3 max-w-xl">
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
              Begin Your dMAT Preparation Today
            </h3>
            <p className="text-sm sm:text-base text-teal-100 leading-relaxed">
              Launch the 10-question diagnostic assessment immediately to evaluate your baseline spatial and analytical reasoning.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Link
              to={`${studentPortalPath || '/ems'}/practice`}
              className="px-7 py-3.5 rounded-xl bg-white text-teal-950 font-bold text-sm hover:bg-teal-50 transition-colors shadow-md"
            >
              Start Free Diagnostic →
            </Link>
            <Link
              to="/faq"
              className="px-5 py-3.5 rounded-xl border border-teal-400/40 text-teal-100 font-semibold text-sm hover:bg-teal-800/50 transition-colors"
            >
              Candidate FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
