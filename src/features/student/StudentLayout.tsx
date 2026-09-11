import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookMarked,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  GraduationCap,
  Home,
  Layers,
  Menu,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

export const StudentLayout: React.FC = () => {
  const { currentTenant, studentPortalPath } = useTenant();
  const { user, tier } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = [
    { label: 'Dashboard', path: studentPortalPath, icon: Home },
    { label: 'Practice Drills', path: `${studentPortalPath}/practice`, icon: Compass },
    { label: 'Mock Exams', path: `${studentPortalPath}/mock-tests`, icon: Clock },
    { label: 'Analytics & History', path: `${studentPortalPath}/progress`, icon: BarChart3 },
    { label: 'Study Plan', path: `${studentPortalPath}/study-plan`, icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs sticky top-24 space-y-6">
            {/* User Profile Info */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-slate-900 text-sm truncate">{user.name}</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      tier === 'PAID' ? 'bg-amber-500' : tier === 'REGISTERED' ? 'bg-sky-500' : 'bg-slate-400'
                    }`}
                  ></span>
                  <span>{tier === 'PAID' ? 'Pro Member' : tier === 'REGISTERED' ? 'Registered' : 'Guest Tier'}</span>
                </div>
              </div>
            </div>

            {/* Navigation List */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === studentPortalPath}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Access Tier Callout */}
            <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200/80 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-teal-900">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>{tier === 'PAID' ? 'Unlimited Generation Active' : 'Access Limit Notice'}</span>
              </div>
              <p className="text-[11px] text-teal-800/80 leading-relaxed">
                {tier === 'PAID'
                  ? 'Procedural Figure Sequence generator is unlocked without cap.'
                  : tier === 'REGISTERED'
                  ? '20 fixed questions available in your verified bank.'
                  : '10 fixed questions in Guest mode. Register to unlock 20.'}
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
