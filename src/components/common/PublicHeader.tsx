import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  LogIn,
  LogOut,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

interface PublicHeaderProps {
  onOpenAuthModal: () => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ onOpenAuthModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { studentPortalPath } = useTenant();
  const { isAuthenticated, user, entitlement, signOut } = useAuth();
  const location = useLocation();

  const navLinks = [
    { label: 'Practice', href: '/practice' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'FAQ', href: '/faq' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* 1. Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-xl shadow-md group-hover:bg-teal-800 transition-colors">
              dM
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">
                  dMATHub
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              </div>
              <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Learn • Practise • Track • Master
              </span>
            </div>
          </Link>

          {/* 2. Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-600">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-3.5 py-2 rounded-lg transition-all ${
                    active
                      ? 'text-teal-800 bg-teal-50/80 font-bold'
                      : 'hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* 3. Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                    {user.name || user.email}
                  </div>
                  <span className="inline-block text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                    {entitlement.displayName}
                  </span>
                </div>
                <Link
                  to={studentPortalPath || '/ems'}
                  id="header-btn-portal"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs hover:bg-teal-800 transition-all shadow-sm"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student Portal</span>
                </Link>
                <button
                  onClick={signOut}
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  id="header-btn-signin"
                  onClick={onOpenAuthModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-teal-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
                <Link
                  to={`${studentPortalPath || '/ems'}/practice`}
                  id="header-btn-start-practice"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs hover:bg-teal-800 transition-all shadow-md"
                >
                  <span>Start Practising</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* 4. Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            {!isAuthenticated && (
              <Link
                to={`${studentPortalPath || '/ems'}/practice`}
                className="px-3 py-1.5 rounded-lg bg-teal-700 text-white font-bold text-xs sm:hidden"
              >
                Practise
              </Link>
            )}
            <button
              type="button"
              id="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${
                    active
                      ? 'bg-teal-50 text-teal-800 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{link.label}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-4 py-2 bg-slate-50 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{user.name || user.email}</div>
                    <div className="text-[11px] text-teal-700 font-semibold">{entitlement.displayName}</div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    Log Out
                  </button>
                </div>
                <Link
                  to={studentPortalPath || '/ems'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl bg-teal-700 text-white font-bold text-center block text-sm shadow-sm"
                >
                  Open Student Portal
                </Link>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full py-3 rounded-xl border border-slate-300 text-slate-800 font-bold text-center text-sm hover:bg-slate-50"
                >
                  Sign In
                </button>
                <Link
                  to={`${studentPortalPath || '/ems'}/practice`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl bg-teal-700 text-white font-bold text-center text-sm shadow-sm"
                >
                  Start Practice
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
