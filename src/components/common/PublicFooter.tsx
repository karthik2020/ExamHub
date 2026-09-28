import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, GraduationCap, Mail, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

export const PublicFooter: React.FC = () => {
  const { studentPortalPath } = useTenant();

  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Col 1 & 2: Brand Identity */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-lg">
                dM
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl text-white tracking-tight">dMATHub</span>
                <span className="text-[10px] font-bold text-teal-400 tracking-wider uppercase">
                  Learn • Practise • Track • Master
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              The dedicated preparation and simulation platform for the Doctoral Management Aptitude Test (dMAT).
              Designed for quantitative rigor, abstract spatial reasoning, and timed exam stamina.
            </p>

            <div className="pt-2 flex flex-col space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Deterministic 4x4 matrix Figure Sequence engine</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Authoritative server-side scoring & zero client answer exposure</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Comprehensive candidate readiness index scaled to 65% target</span>
              </div>
            </div>
          </div>

          {/* Col 3: Practice & Modules */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Curriculum Modules</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/practice" className="hover:text-teal-300 transition-colors">
                  Figure Sequences
                </Link>
              </li>
              <li>
                <Link to="/practice" className="hover:text-teal-300 transition-colors">
                  Mathematical Equations
                </Link>
              </li>
              <li>
                <Link to="/practice" className="hover:text-teal-300 transition-colors">
                  Latin Squares
                </Link>
              </li>
              <li>
                <Link to="/practice" className="hover:text-teal-300 transition-colors">
                  Academic Reasoning
                </Link>
              </li>
              <li className="pt-2">
                <Link
                  to={`${studentPortalPath || '/ems'}/practice`}
                  className="text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Launch Free Diagnostic</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link
                  to={`${studentPortalPath || '/ems'}/mock-tests`}
                  className="text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Timed Full Simulation</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform & Methodology */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Preparation</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/how-it-works" className="hover:text-teal-300 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-teal-300 transition-colors">
                  Engine & Capabilities
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-teal-300 transition-colors">
                  Access Tiers & Pricing
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-teal-300 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-teal-300 transition-colors">
                  About the Examination
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-teal-300 transition-colors">
                  Support & Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Candidate Access */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Portals</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  to={studentPortalPath || '/ems'}
                  className="text-white font-bold hover:text-teal-300 transition-colors flex items-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-teal-400" />
                  <span>Student Portal</span>
                </Link>
              </li>
              <li>
                <Link to={`${studentPortalPath || '/ems'}/progress`} className="hover:text-teal-300 transition-colors">
                  Performance Dashboard
                </Link>
              </li>
              <li>
                <Link to={`${studentPortalPath || '/ems'}/study-plan`} className="hover:text-teal-300 transition-colors">
                  Study Plan & Guidance
                </Link>
              </li>
              <li className="pt-3 border-t border-slate-800">
                <Link to="/admin" className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Proctor & Admin Console</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Independent Academic Preparation Notice:</strong> dMATHub is an independent
            educational test preparation and simulation platform. It is not affiliated with, authorized by, sponsored by, or
            endorsed by any doctoral degree awarding institution, university admissions committee, or official test
            administration board. All trademarks and test designations belong to their respective holders.
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              © {new Date().getFullYear()} dMATHub (dmathub.com). All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link to="/about" className="hover:text-white transition-colors">
                Methodology
              </Link>
              <Link to="/pricing" className="hover:text-white transition-colors">
                Plans
              </Link>
              <Link to="/faq" className="hover:text-white transition-colors">
                FAQ
              </Link>
              <Link to="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
