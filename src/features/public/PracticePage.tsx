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
  Zap,
} from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { FigureSequenceShowcase } from '../../components/figure-sequence/FigureSequenceShowcase';
import { useTenant } from '../../contexts/TenantContext';

export const PracticePage: React.FC = () => {
  const { studentPortalPath } = useTenant();

  return (
    <div className="space-y-20 py-10 sm:py-16">
      <SEOHead
        title="dMAT Practice Modules & Curriculum — dMATHub"
        description="Comprehensive curriculum overview and practice formats for the Doctoral Management Aptitude Test. Explore Figure Sequences, Mathematical Logic, and Latin Squares."
        canonical="https://dmathub.com/practice"
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-teal-700" />
            <span>Curriculum & Practice Framework</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Master Every Section of the dMAT
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            The dMAT evaluates four distinct intellectual domains. Our practice drills and simulation tests are
            calibrated to mirror official timing, section constraints, and deduction rules.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`${studentPortalPath || '/ems'}/practice`}
              className="px-6 py-3.5 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800 transition-all shadow-md flex items-center gap-2"
            >
              <span>Launch Free Diagnostic Test</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#modules"
              className="px-5 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all"
            >
              Explore Section Modules
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FigureSequenceShowcase />
      </section>

      {/* Curriculum Modules In-Depth */}
      <section id="modules" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Detailed Syllabus</span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900">The 4 Core Examination Sections</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            A comprehensive breakdown of syllabus content, rules, and question formats.
          </p>
        </div>

        <div className="space-y-8">
          {/* Section 1 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-teal-700 text-white font-black text-sm flex items-center justify-center">
                  1
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Figure Sequences & Spatial Reasoning
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Candidates analyze a sequence of 4x4 coordinate grids containing multiple geometric figures (circles,
                triangles, squares, diamonds). Symbols traverse the matrix following deterministic spatial vectors,
                reflection upon encountering grid perimeters, rotational transformations, and topological overlaps.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span><strong>Vector Movement:</strong> Fixed coordinate translations (Δr, Δc)</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span><strong>Perimeter Bounces:</strong> Specular angle reflections at border bounds</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span><strong>Rotational States:</strong> 90°, 180°, and 270° clockwise/counter-clockwise</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span><strong>Multi-Symbol Collisions:</strong> Priority layering and direction shifts</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Section Specifications</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Standard Question Count:</span>
                  <span className="font-bold text-slate-900">20 Questions</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Time Allocation:</span>
                  <span className="font-bold text-slate-900">25 Minutes (~75s / item)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Practice Formats:</span>
                  <span className="font-bold text-slate-900">Fixed + Procedural Generator</span>
                </div>
              </div>
              <Link
                to={`${studentPortalPath || '/ems'}/practice`}
                className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs text-center block hover:bg-teal-800 transition-colors mt-2"
              >
                Practice Figure Sequences →
              </Link>
            </div>
          </div>

          {/* Section 2 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-700 text-white font-black text-sm flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Mathematical Equations & Symbolic Deduction
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Evaluates quantitative problem-solving without calculators. Questions present non-standard operator
                definitions, modular congruence relations, and simultaneous algebraic systems where missing values or
                boundary inequalities must be discovered under strict pacing.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span><strong>Operator Definition:</strong> Custom arithmetic functions (a ⊕ b)</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span><strong>Constraint Systems:</strong> Multi-variable inequality satisfaction</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span><strong>Modular Arithmetic:</strong> Parity preservation and prime factors</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span><strong>Mental Math Efficiency:</strong> Estimation and bounds checking</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Section Specifications</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Standard Question Count:</span>
                  <span className="font-bold text-slate-900">20 Questions</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Time Allocation:</span>
                  <span className="font-bold text-slate-900">25 Minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Calculator Policy:</span>
                  <span className="font-bold text-slate-900">Strictly Prohibited</span>
                </div>
              </div>
              <Link
                to={`${studentPortalPath || '/ems'}/practice`}
                className="w-full py-2.5 rounded-xl bg-sky-700 text-white font-bold text-xs text-center block hover:bg-sky-800 transition-colors mt-2"
              >
                Practice Mathematical Logic →
              </Link>
            </div>
          </div>

          {/* Section 3 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-700 text-white font-black text-sm flex items-center justify-center">
                  3
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Latin Squares & Combinatorial Grids
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Tests constraint satisfaction and combinatorial deduction. Candidates complete n×n orthogonal grids where
                symbols or numbers must appear exactly once in each row and column, taking into account additional
                inequality clues and diagonal conditions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span><strong>Orthogonal Constraints:</strong> Zero duplicates across rows and columns</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span><strong>Inequality Boundaries:</strong> Between adjacent cell values (&gt;, &lt;)</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span><strong>Pigeonhole Logic:</strong> Elimination of contradictory candidates</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span><strong>Partial Matrix Deduction:</strong> Finding the unique target entry</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Section Specifications</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Standard Question Count:</span>
                  <span className="font-bold text-slate-900">15 Questions</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Time Allocation:</span>
                  <span className="font-bold text-slate-900">20 Minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Grid Sizes:</span>
                  <span className="font-bold text-slate-900">4x4, 5x5 Matrix Layouts</span>
                </div>
              </div>
              <Link
                to={`${studentPortalPath || '/ems'}/practice`}
                className="w-full py-2.5 rounded-xl bg-indigo-700 text-white font-bold text-xs text-center block hover:bg-indigo-800 transition-colors mt-2"
              >
                Practice Latin Squares →
              </Link>
            </div>
          </div>

          {/* Section 4 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-700 text-white font-black text-sm flex items-center justify-center">
                  4
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  General Academic & Scientific Reasoning
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Reflects the academic literature focus of doctoral programs. Questions present research methodology
                descriptions, statistical abstracts, and multi-variable chart interpretations requiring sound inferential
                reasoning and logical consistency checks.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Research Abstracts:</strong> Critical inference and hypothesis evaluation</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Scientific Data:</strong> Reading multivariate bar, scatter, and box plots</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Methodology Flaws:</strong> Confounding variables and sampling bias</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Formal Syllogisms:</strong> Valid vs invalid deductive arguments</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Section Specifications</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Standard Question Count:</span>
                  <span className="font-bold text-slate-900">15 Questions</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Time Allocation:</span>
                  <span className="font-bold text-slate-900">20 Minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Focus:</span>
                  <span className="font-bold text-slate-900">Academic & Statistical Logic</span>
                </div>
              </div>
              <Link
                to={`${studentPortalPath || '/ems'}/practice`}
                className="w-full py-2.5 rounded-xl bg-amber-700 text-white font-bold text-xs text-center block hover:bg-amber-800 transition-colors mt-2"
              >
                Practice Academic Reasoning →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Formats & Modes */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Preparation Modes</span>
            <h2 className="text-3xl font-black">Choose How You Practice</h2>
            <p className="text-xs sm:text-sm text-slate-400">Different test modalities designed for progressive skill acquisition.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="font-bold text-white text-base">Diagnostic Evaluation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                10 curated questions across core figure sequences to identify your starting baseline in 15 minutes.
              </p>
              <div className="text-[11px] font-semibold text-teal-300">Free for all visitors</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="font-bold text-white text-base">Curriculum Drills</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Targeted 20-item sets focused on specific rules: reflections, rotational symmetries, or algebraic systems.
              </p>
              <div className="text-[11px] font-semibold text-sky-300">Registered Candidates</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="font-bold text-white text-base">Procedural Generator</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Algorithmic generation with custom difficulty (Easy, Medium, Hard) and session lengths from 5 to 30 items.
              </p>
              <div className="text-[11px] font-semibold text-indigo-300">PRO Membership Required</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                4
              </div>
              <h4 className="font-bold text-white text-base">Full-Length Mock Test</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full timed examination under official conditions with sectional countdowns and final readiness scoring.
              </p>
              <div className="text-[11px] font-semibold text-amber-300">Registered & PRO</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-teal-50 border border-teal-200 rounded-3xl p-8 sm:p-12 space-y-4 max-w-3xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-black text-teal-950">
            Ready to Begin Sectional Practice?
          </h3>
          <p className="text-xs sm:text-sm text-teal-800 max-w-lg mx-auto">
            Launch our practice session immediately. No installation or registration required for the initial diagnostic.
          </p>
          <div className="pt-2">
            <Link
              to={`${studentPortalPath || '/ems'}/practice`}
              className="px-7 py-3.5 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800 transition-colors inline-flex items-center gap-2 shadow-md"
            >
              <span>Start Free Diagnostic Test</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
