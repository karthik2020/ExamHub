import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  FileCheck2,
  GraduationCap,
  Layers,
  Lock,
  RotateCw,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { useTenant } from '../../contexts/TenantContext';

export const FeaturesPage: React.FC = () => {
  const { studentPortalPath } = useTenant();

  return (
    <div className="space-y-20 py-10 sm:py-16">
      <SEOHead
        title="dMATHub Features & Capabilities — Built for dMAT Precision"
        description="Explore the technical capabilities of dMATHub: deterministic procedural generation, authoritative server-side scoring, and the empirical Readiness Index."
        canonical="https://dmathub.com/features"
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-teal-700" />
            <span>Platform Capabilities</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Engineered for Precision & Real Exam Stamina
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Every feature in dMATHub is calibrated to reflect the exact demands of the dMAT.
            From mathematical grid generation to server-authoritative scoring and explainable readiness metrics.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`${studentPortalPath || '/ems'}/practice`}
              className="px-6 py-3.5 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800 transition-all shadow-md flex items-center gap-2"
            >
              <span>Test The Engine in Practice</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* 1. Procedural Generation */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 hover:border-teal-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-teal-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Deterministic Procedural Generator</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Our algorithmic engine generates endless valid 4x4 matrix sequences. A 10-point validation suite guarantees
              exactly one unique correct solution, no duplicate distractors, and verifiable seeded reproducibility.
            </p>
            <div className="pt-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
              PRO Tier Capability
            </div>
          </div>

          {/* 2. Authoritative Scoring */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 hover:border-sky-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-center">
              <Lock className="w-6 h-6 text-sky-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Authoritative Server Scoring</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Correct answers and solution explanations remain strictly concealed on the server until formal submission.
              Attempt timing, answers, and scores are verified and stored in PostgreSQL with state recovery on reload.
            </p>
            <div className="pt-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
              Core Security Architecture
            </div>
          </div>

          {/* 3. Readiness Index */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 hover:border-amber-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-amber-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Empirical Readiness Index</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              A transparent, mathematical 0–100 preparedness index scaled directly against the 65% target passing threshold.
              Integrates historical accuracy and attempt volume without subjective vanity metrics.
            </p>
            <div className="pt-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
              Registered & PRO
            </div>
          </div>

          {/* 4. Timed Full Simulation */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 hover:border-indigo-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center justify-center">
              <Clock className="w-6 h-6 text-indigo-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Full Timed Exam Simulation</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Experience authentic test pressure with our 25-question, 45-minute timed simulation across all 4 curriculum
              sections. Enforces strict per-section countdowns and complete end-of-test diagnostic summaries.
            </p>
            <div className="pt-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Registered & PRO
            </div>
          </div>

          {/* 5. Detailed SVG Explanations */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 hover:border-teal-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Step-by-Step SVG Solutions</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Post-submission review reveals complete vector breakdowns with crisp vector illustrations, showing exactly
              how translation, reflection, and rotation rules combine to dictate the missing grid.
            </p>
            <div className="pt-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Entitled Candidates
            </div>
          </div>

          {/* 6. Dynamic Study Recommendations */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 hover:border-rose-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-center">
              <FileCheck2 className="w-6 h-6 text-rose-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Targeted Study Guidance</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              The portal analyzes your completed sessions to determine whether you need initial baseline calibration,
              focused sectional drills in weaker topics, or full-length endurance mocks.
            </p>
            <div className="pt-2 text-xs font-bold text-rose-700 uppercase tracking-wider">
              Adaptive Feedback
            </div>
          </div>
        </div>
      </section>

      {/* Technical Standards Bar */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Technical Standards</span>
            <h2 className="text-2xl sm:text-3xl font-black">Built for High Concurrency & Integrity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700">
              <div className="text-2xl font-black text-teal-400">&lt; 1 ms</div>
              <div className="text-xs text-slate-400 mt-1">Generation Latency per Question</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700">
              <div className="text-2xl font-black text-teal-400">100%</div>
              <div className="text-xs text-slate-400 mt-1">Deterministic Seed Reproducibility</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700">
              <div className="text-2xl font-black text-teal-400">Zero</div>
              <div className="text-xs text-slate-400 mt-1">Client Answer Exposure Before Submit</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700">
              <div className="text-2xl font-black text-teal-400">PostgreSQL</div>
              <div className="text-xs text-slate-400 mt-1">ACID Session & Attempt Persistence</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-4">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Experience the Engine in Action</h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Take the free 10-question diagnostic test to explore our live exam interface and scoring system.
          </p>
          <div className="pt-2">
            <Link
              to={`${studentPortalPath || '/ems'}/practice`}
              className="px-7 py-3.5 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800 transition-colors inline-flex items-center gap-2 shadow-md"
            >
              <span>Launch Free Diagnostic</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
