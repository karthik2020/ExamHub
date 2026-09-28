import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  Compass,
  ArrowRight,
  BookOpen,
  Award,
  Users,
  Target,
} from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { useTenant } from '../../contexts/TenantContext';

export const AboutPage: React.FC = () => {
  const { studentPortalPath } = useTenant();

  return (
    <div className="space-y-20 py-10 sm:py-16">
      <SEOHead
        title="About dMATHub — Academic Mission & Examination Preparation"
        description="Learn about dMATHub's mission to provide mathematically rigorous, systematic preparation for Doctoral Management Aptitude Test candidates."
        canonical="https://dmathub.com/about"
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
            <span>Academic Mission & Pedagogy</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Built for Doctoral Quantitative Aptitude
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            dMATHub was founded on a simple observation: existing standardized test preparation tools fail to address
            the advanced spatial, topological, and symbolic logic required by doctoral management admissions.
          </p>
        </div>
      </section>

      {/* Mission & Principles */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Mathematical Precision</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              We reject ambiguous or subjective puzzle questions. Every problem in our curriculum and generator is
              grounded in formal mathematical coordinate invariants and unique deterministic solutions.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Pedagogical Transparency</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Learning requires understanding why an answer is correct. We deconstruct every figure sequence into
              isolated spatial displacement vectors, rotational steps, and boundary collision conditions.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Honesty & Integrity</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              We do not fabricate student testimonials, success rates, or university partnerships. We let our practice
              questions, timed examination engine, and empirical metrics stand on their own merits.
            </p>
          </div>
        </div>
      </section>

      {/* Focus on Doctoral Candidates */}
      <section className="bg-slate-50 border-y border-slate-200/80 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Why the dMAT Demands a Dedicated Platform
          </h2>

          <p>
            Doctoral programs in Management, Information Systems, Operations Research, and Quantitative Economics
            require researchers capable of high-density cognitive processing. Traditional MBA tests (such as GMAT or GRE)
            emphasize secondary-school algebra and standard reading comprehension.
          </p>

          <p>
            In contrast, the <strong>Doctoral Management Aptitude Test (dMAT)</strong> tests non-verbal matrix sequence
            extrapolation (4x4 Figure Sequences), modular equations under extreme time pressure, Latin square constraint
            satisfaction, and academic literature abstract synthesis.
          </p>

          <p>
            Preparing with static PDF files quickly leads to memorizing answer keys rather than internalizing the abstract
            transformation grammar. dMATHub was developed to provide both verified curriculum reference questions and an
            infinite procedural generation engine to build genuine cognitive fluency.
          </p>
        </div>
      </section>

      {/* Non-Affiliation Disclosure */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-2">
          <div className="font-bold flex items-center gap-2 text-amber-950">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Independent Academic Notice</span>
          </div>
          <p className="leading-relaxed text-amber-900/90">
            dMATHub is an independent test preparation software platform. It is not affiliated with, approved by,
            endorsed by, or sponsored by any doctoral program admission council, examination board, or university. The term
            "dMAT" is used strictly in an educational, nominative capacity to identify the curriculum format.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white space-y-4 shadow-md">
          <h3 className="text-2xl font-black">Experience Systematic dMAT Preparation</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            Try our 10-question diagnostic assessment today to evaluate your baseline spatial reasoning speed.
          </p>
          <div className="pt-2">
            <Link
              to={`${studentPortalPath || '/ems'}/practice`}
              className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors inline-flex items-center gap-2"
            >
              <span>Take Free Diagnostic Test</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
