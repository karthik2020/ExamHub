import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

export const Footer: React.FC = () => {
  const { currentTenant, studentPortalPath } = useTenant();

  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">{currentTenant?.name || 'ExamHub Engine'}</span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-1.5 py-0.5 rounded uppercase">
                {currentTenant?.slug}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configurable, high-concurrency online examination engine supporting deterministic figure sequence drills,
              sectional mocks, and automated assessment scoring.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Multi-Tenant Architecture • Supabase PostgreSQL</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Examination</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About the Exam
                </Link>
              </li>
              <li>
                <Link to="/exam" className="hover:text-white transition-colors">
                  Structure & Timing
                </Link>
              </li>
              <li>
                <Link to="/syllabus" className="hover:text-white transition-colors">
                  Official Syllabus
                </Link>
              </li>
              <li>
                <Link to="/preparation" className="hover:text-white transition-colors">
                  Preparation Guide
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Student Portal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to={studentPortalPath} className="hover:text-white transition-colors">
                  Portal Dashboard
                </Link>
              </li>
              <li>
                <Link to={`${studentPortalPath}/practice`} className="hover:text-white transition-colors">
                  Practice Drills
                </Link>
              </li>
              <li>
                <Link to={`${studentPortalPath}/mock-tests`} className="hover:text-white transition-colors">
                  Timed Mock Exams
                </Link>
              </li>
              <li>
                <Link to={`${studentPortalPath}/progress`} className="hover:text-white transition-colors">
                  Analytics & History
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Engine & Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">
                  Access Plans & Tiers
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-white transition-colors">
                  Admin Portal
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Support & FAQ
                </Link>
              </li>
              <li className="pt-2">
                <span className="text-[11px] text-slate-500">
                  Domain: <code className="text-slate-400">{currentTenant?.domain}</code>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} ExamHub Engine • Configured for {currentTenant?.name}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Powered by ExamHub Core</span>
            <span>•</span>
            <span>REST API & PostgreSQL</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
