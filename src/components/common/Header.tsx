import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  Globe,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

interface HeaderProps {
  onOpenProfileModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProfileModal }) => {
  const { currentTenant, availableTenants, switchTenant, studentPortalPath } = useTenant();
  const { user, role, tier } = useAuth();
  const location = useLocation();

  const isStudentArea = location.pathname.startsWith(studentPortalPath);
  const isAdminArea = location.pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top micro-bar for Tenant Switcher & Global Engine status */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold tracking-wider uppercase text-[11px] text-slate-200">
              ExamHub Engine
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Active Tenant:</span>
            {/* Multi-Tenant Switcher */}
            <div className="relative inline-block">
              <select
                id="select-active-tenant"
                value={currentTenant?.slug || 'dmathub'}
                onChange={(e) => switchTenant(e.target.value)}
                className="bg-slate-800 text-white font-medium rounded px-2 py-0.5 border border-slate-700 hover:border-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer"
              >
                {availableTenants.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name} ({t.domain})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Tier indicator */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Tier:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  tier === 'PAID'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : tier === 'REGISTERED'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {tier === 'PAID' ? 'Pro Unlimited' : tier === 'REGISTERED' ? 'Registered' : 'Guest (10 Fixed)'}
              </span>
            </div>

            {/* Quick Profile Switcher */}
            <button
              id="btn-switch-profile"
              onClick={onOpenProfileModal}
              className="text-teal-400 hover:text-teal-300 font-medium underline-offset-2 hover:underline flex items-center gap-1 text-[11px]"
            >
              <UserIcon className="w-3 h-3" />
              <span>{user.name.split(' ')[0]} ({role === 'SUPER_ADMIN' ? 'Admin' : role})</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Tenant Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          {currentTenant?.logo_url ? (
            <img
              src={currentTenant.logo_url}
              alt={currentTenant.name}
              className="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-xs"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold">
              {currentTenant?.name?.charAt(0) || 'E'}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">
              {currentTenant?.name || 'ExamHub Engine'}
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
              {currentTenant?.slug === 'dmathub' ? 'Deutsche Master Admission Test' : 'Certification Preparation'}
            </span>
          </div>
        </Link>

        {/* Center Public Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
          <Link
            to="/"
            className={`px-3 py-2 rounded-lg transition-colors ${
              location.pathname === '/' && !isStudentArea && !isAdminArea
                ? 'text-teal-800 font-semibold bg-teal-50'
                : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Home
          </Link>
          <Link
            to="/about"
            className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            About
          </Link>
          <Link
            to="/exam"
            className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Exam Structure
          </Link>
          <Link
            to="/syllabus"
            className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Syllabus
          </Link>
          <Link
            to="/preparation"
            className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Strategy
          </Link>
          <Link
            to="/pricing"
            className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Pricing
          </Link>
          <Link
            to="/faq"
            className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            FAQ
          </Link>
        </nav>

        {/* Right CTA / Portal Access */}
        <div className="flex items-center gap-2.5">
          {/* Link to Student Portal */}
          <Link
            to={studentPortalPath}
            id="link-student-portal"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold text-sm transition-all shadow-xs ${
              isStudentArea
                ? 'bg-teal-700 text-white'
                : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Portal</span>
          </Link>

          {/* Admin Portal button */}
          <Link
            to="/admin"
            id="link-admin-portal"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs transition-all ${
              isAdminArea
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
