import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Cpu,
  FileQuestion,
  GraduationCap,
  Palette,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { adminService, AdminOverviewStats } from '../../services/adminService';

export const AdminOverview: React.FC = () => {
  const { currentTenant } = useTenant();
  const { role, switchDemoProfile, setLoginModalOpen } = useAuth();
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = () => {
    setLoading(true);
    setError(null);
    adminService
      .getOverview(currentTenant?.id)
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to load administrator metrics');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOverview();
  }, [currentTenant?.id, role]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-medium">Loading authoritative metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto my-12 p-6 bg-slate-950/80 border border-slate-800 rounded-2xl text-center shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3.5">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1.5">Administrative Metric Access</h2>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">{error}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              switchDemoProfile('PAID', 'SUPER_ADMIN');
              fetchOverview();
            }}
            className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enable Demo Admin</span>
          </button>
          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Sign In with Supabase
          </button>
          <button
            type="button"
            onClick={fetchOverview}
            className="w-full sm:w-auto px-3.5 py-2 text-slate-400 hover:text-white text-xs inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-2xl font-black text-white tracking-tight">System Overview</h1>
        <p className="text-xs text-slate-400 mt-1">
          Active Tenant: <span className="font-semibold text-teal-400">{currentTenant?.name}</span> ({currentTenant?.domain})
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-semibold uppercase">Total Users</span>
          <div className="text-2xl font-black text-white mt-1">{stats.totalStudents}</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-semibold uppercase">Questions Bank</span>
          <div className="text-2xl font-black text-teal-400 mt-1">{stats.totalQuestions}</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-semibold uppercase">Practice Tests</span>
          <div className="text-2xl font-black text-white mt-1">{stats.totalTests}</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-semibold uppercase">Exam Attempts</span>
          <div className="text-2xl font-black text-sky-400 mt-1">{stats.totalAttempts}</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-semibold uppercase">Average Score</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{stats.avgScore}%</div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/branding"
          className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl hover:border-teal-500 transition-colors group flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-3">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm group-hover:text-teal-400 transition-colors">
              Tenant Branding & Colors
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Customize primary & secondary theme colors, logos, domain mappings, and student portal paths.
            </p>
          </div>
          <span className="text-xs text-teal-400 font-bold flex items-center gap-1 mt-4">
            Manage Branding <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          to="/admin/generator"
          className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl hover:border-teal-500 transition-colors group flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors">
              Figure Generator Workbench
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Test PRNG seeds, visually inspect 4x4 matrix sequences, run the 10-point validator, and push items to the bank.
            </p>
          </div>
          <span className="text-xs text-purple-400 font-bold flex items-center gap-1 mt-4">
            Open Workbench <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          to="/admin/questions"
          className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl hover:border-teal-500 transition-colors group flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
              <FileQuestion className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm group-hover:text-sky-400 transition-colors">
              Question Bank & Preview
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Author and filter multi-choice and figure sequence questions with instant side-by-side graphical preview.
            </p>
          </div>
          <span className="text-xs text-sky-400 font-bold flex items-center gap-1 mt-4">
            Manage Questions <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {/* Recent Attempts Activity */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Recent Examination Attempts</h3>
          <span className="text-xs text-slate-400">Live platform logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Attempt ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Accuracy</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {stats.recentAttempts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-slate-400">{a.id.slice(0, 10)}...</td>
                  <td className="py-3 px-4 font-medium text-white">{a.user_id}</td>
                  <td className="py-3 px-4 font-bold">
                    {a.score} / {a.total_questions}
                  </td>
                  <td className="py-3 px-4 text-teal-400 font-bold">{a.percentage}%</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {a.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(a.started_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
