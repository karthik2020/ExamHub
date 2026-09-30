import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { useTenant } from '../../contexts/TenantContext';

interface FAQItem {
  q: string;
  a: string;
  category: string;
}

export const FAQPage: React.FC = () => {
  const { studentPortalPath } = useTenant();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const faqs: FAQItem[] = [
    {
      category: 'About dMAT',
      q: 'What is the Doctoral Management Aptitude Test (dMAT)?',
      a: 'The dMAT is a rigorous standardized examination utilized to evaluate candidate readiness for doctoral and advanced research programs in management, quantitative business analysis, and decision sciences. It assesses abstract spatial reasoning, symbolic mathematical deduction, combinatorial constraint handling, and academic data inference.',
    },
    {
      category: 'About dMAT',
      q: 'What are the official examination sections and time limits?',
      a: 'The examination comprises four sections: 1. Figure Sequences (20 questions, 25 minutes); 2. Mathematical Equations & Logic (20 questions, 25 minutes); 3. Latin Squares (15 questions, 20 minutes); and 4. General Academic Reasoning (15 questions, 20 minutes). Calculators and external aids are strictly prohibited.',
    },
    {
      category: 'Curriculum & Format',
      q: 'What are Figure Sequences and why are they so important?',
      a: 'Figure Sequences present a progression of 4x4 coordinate grids containing multiple geometric symbols. Candidates must deduce the underlying motion rules—such as linear translation vectors, boundary reflections, cyclic rotational states, and symbol collisions—to identify the missing grid in the sequence.',
    },
    {
      category: 'Curriculum & Format',
      q: 'How does procedural Figure Sequence generation work?',
      a: 'Our algorithmic generator mathematically constructs new 4x4 matrix sequences using deterministic rules. A 10-point mathematical validation suite ensures that every generated puzzle has exactly one valid solution, zero duplicate distractors, and a reproducible seed for review.',
    },
    {
      category: 'Curriculum & Format',
      q: 'Is there an official full-length simulation?',
      a: 'Yes. dMATHub includes a 25-question, 45-minute timed mock simulation spanning all four curriculum modules. It enforces strict sectional countdown clocks, question flagging, and an end-of-exam diagnostic debrief.',
    },
    {
      category: 'Plans & Access',
      q: 'Can I practice without creating an account?',
      a: 'Yes. The Free Guest tier allows any visitor to immediately take a 10-question diagnostic test without registration or credit card requirements. Your results are calculated on the server and displayed instantly.',
    },
    {
      category: 'Plans & Access',
      q: 'What is the difference between Free, Registered, and PRO?',
      a: 'Free Guest provides the 10-question diagnostic. Registered Member (free) grants full access to the published verified question bank, detailed step-by-step SVG solutions, attempt history, and the Readiness Index. PRO (₹2,499 one-time for 90 days) unlocks the unlimited procedural generator with Easy/Medium/Hard controls and full mock simulations.',
    },
    {
      category: 'Plans & Access',
      q: 'How do detailed step-by-step solutions work?',
      a: 'For registered and PRO candidates, after submitting a test or practice set, the system reveals a comprehensive vector-by-vector breakdown. You see individual rules for each symbol (e.g., Circle: diagonal translation with boundary bounce; Triangle: 90° clockwise rotation).',
    },
    {
      category: 'Scoring & Readiness',
      q: 'What is the passing or target readiness score?',
      a: 'The platform benchmarks candidate performance against an empirical 65% target accuracy threshold. The Readiness Index (0–100) measures your historical accuracy and volume across all four curriculum areas, alerting you to topics requiring further practice.',
    },
    {
      category: 'Scoring & Readiness',
      q: 'What should I do first when starting preparation?',
      a: 'We recommend taking the free 10-question diagnostic test first. It establishes your baseline spatial reasoning speed and identifies whether you need conceptual review or timing practice.',
    },
    {
      category: 'Institutional & Legal',
      q: 'Is dMATHub officially affiliated with any university or test administrator?',
      a: 'No. dMATHub is an independent test preparation and educational simulation platform. It is not affiliated with, endorsed by, or sponsored by any doctoral degree awarding institution or official test administration committee.',
    },
    {
      category: 'Plans & Access',
      q: 'How does PRO billing work and is it a recurring subscription?',
      a: 'The PRO access pass is ₹2,499 as a one-time purchase granting 90 days of complete examination access. There is no recurring subscription or automatic renewal. Payments are processed securely via Razorpay Test Mode with backend-authoritative verification.',
    },
  ];

  const categories = ['All', 'About dMAT', 'Curriculum & Format', 'Plans & Access', 'Scoring & Readiness', 'Institutional & Legal'];

  const filteredFaqs =
    activeCategory === 'All' ? faqs : faqs.filter((f) => f.category === activeCategory);

  return (
    <div className="space-y-16 py-10 sm:py-16">
      <SEOHead
        title="Frequently Asked Questions — dMAT Preparation & dMATHub"
        description="Factual answers regarding the Doctoral Management Aptitude Test, curriculum sections, Figure Sequences, access tiers, and scoring thresholds."
        canonical="https://dmathub.com/faq"
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
            <span>Candidate Knowledge Base</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Clear, honest answers regarding the dMAT format, platform access tiers, procedural generation,
            and preparation best practices.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat);
                setOpenIdx(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIdx === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-teal-700' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                    <p>{faq.a}</p>
                    <div className="mt-3 pt-2 text-[11px] font-semibold text-teal-800 uppercase tracking-wider">
                      Category: {faq.category}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Need more guidance CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-3xl bg-slate-900 text-white text-center space-y-4 shadow-md">
          <h3 className="text-xl sm:text-2xl font-black">Have a Question Not Answered Here?</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            Our academic support team is available to assist candidates with curriculum inquiries and platform guidance.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors"
            >
              Contact Support
            </Link>
            <Link
              to={`${studentPortalPath || '/ems'}/practice`}
              className="px-6 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Start Free Diagnostic
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
