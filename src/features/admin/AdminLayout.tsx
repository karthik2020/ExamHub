import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  Cpu,
  Database,
  Eye,
  FileQuestion,
  GraduationCap,
  Home,
  Palette,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

export const AdminLayout: React.FC = () => {
  const { currentTenant, studentPortalPath } = useTenant();
  const { user, role } = useAuth();
  const location = useLocation();

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
              </div>
              <p className="text-[11px] text-slate-400">
                Authoritative platform administration & procedural generation engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={studentPortalPath}
              className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Preview Student Portal</span>
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
      </div>
    </div>
  );
};
