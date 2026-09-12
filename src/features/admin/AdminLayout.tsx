import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Cpu,
  Database,
  Eye,
  FileQuestion,
  GraduationCap,
  Home,
  LogIn,
  LogOut,
  Palette,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

export const AdminLayout: React.FC = () => {
  const { currentTenant, studentPortalPath } = useTenant();
  const { user, role, authMode, isAuthenticated, switchDemoProfile, setLoginModalOpen } = useAuth();
  const location = useLocation();

  const isAdmin = role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN';

  const adminNav = [
    { label: 'Overview', path: '/admin', icon: Home },
    { label: 'Tenant Branding', path: '/admin/branding', icon: Palette },
    { label: 'Question Bank', path: '/admin/questions', icon: FileQuestion },
    { label: 'Generator Workbench', path: '/admin/generator', icon: Cpu },
    { label: 'User RBAC & Tiers', path: '/admin/users', icon: Users },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="border-b border-slate-800 bg-slate-950/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/40">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="font-black text-sm text-white flex items-center gap-2">
                <span>ExamHub Proctor Admin</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {currentTenant?.slug}
                </span>
                {isAdmin && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    {isAuthenticated ? 'Authenticated Admin' : 'Demo Super Admin'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Authoritative platform administration & procedural generation engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && !isAuthenticated && (
              <button
                onClick={() => switchDemoProfile('REGISTERED', 'STUDENT')}
                className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Exit Demo Admin
              </button>
            )}

            <Link
              to={studentPortalPath}
              className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Portal</span>
            </Link>

            <Link
              to="/"
              className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Public Website</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 gap-6">
        {isAdmin ? (
          <>
            {/* Admin Navigation Sidebar */}
            <aside className="w-60 shrink-0 hidden md:block">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 space-y-1 sticky top-6">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  System Operations
                </div>
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/admin'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </aside>

            {/* Content Outlet */}
            <main className="flex-1 min-w-0">
              <Outlet />
            </main>
          </>
        ) : (
          /* Role Gate when user is not an administrator */
          <div className="flex-1 max-w-xl mx-auto my-12">
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center backdrop-blur-md">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg">
                <ShieldAlert className="w-7 h-7" />
              </div>

              <h2 className="text-xl font-black text-white tracking-tight mb-2">
                Administrator Access Required
              </h2>

              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto mb-6">
                The ExamHub Proctor Admin console manages live question banks, PRNG generators, candidate RBAC records, and system audit trails. You are currently browsing with a <span className="text-slate-200 font-semibold uppercase">{role}</span> profile.
              </p>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-left mb-6 text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <span>Current User ID:</span>
                  <span className="font-mono text-slate-300">{user.id.slice(0, 16)}...</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <span>Current Mode:</span>
                  <span className="font-bold text-amber-400">{authMode}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Authorized Roles:</span>
                  <span className="font-mono text-teal-400 font-semibold">SUPER_ADMIN, TENANT_ADMIN</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  id="btn-activate-demo-admin"
                  onClick={() => switchDemoProfile('PAID', 'SUPER_ADMIN')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-md shadow-teal-900/30 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Activate Demo Super Admin</span>
                </button>

                <button
                  type="button"
                  id="btn-admin-login-modal"
                  onClick={() => setLoginModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Admin Account</span>
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <Link
                  to={studentPortalPath}
                  className="text-xs text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Return to Candidate Student Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
