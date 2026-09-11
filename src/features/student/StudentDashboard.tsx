import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { attemptService } from '../../services/attemptService';
import { examService } from '../../services/examService';
import { Attempt, PracticeTest } from '../../types';

export const StudentDashboard: React.FC = () => {
  const { currentTenant, studentPortalPath } = useTenant();
  const { user, tier } = useAuth();
  const navigate = useNavigate();

  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      examService.getPracticeTests(currentTenant?.id),
      attemptService.getUserHistory(user.id),
    ])
      .then(([testList, historyList]) => {
        if (isMounted) {
          setTests(testList);
          setHistory(historyList);
        }
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentTenant?.id, user.id]);

  const totalAttempts = history.length;
  const avgAccuracy =
    history.length > 0
      ? (history.reduce((acc, a) => acc + a.percentage, 0) / history.length).toFixed(1)
      : '0.0';

  const readinessScore = Math.min(
    98,
    Math.max(45, Math.round(Number(avgAccuracy) * 0.85 + (totalAttempts > 0 ? 15 : 0)))
  );

  return (
    <div className="space-y-6">
      {/* 1. Welcome Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
            Candidate Portal • {currentTenant?.name}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Access Tier: <span className="font-semibold text-slate-700">{tier}</span> • Mode:{' '}
            {tier === 'PAID'
              ? 'Unlimited Procedural Generation'
              : tier === 'REGISTERED'
              ? 'Verified 20-Question Pool'
              : 'Fixed 10-Question Guest Pass'}
          </p>
        </div>

        <Link
          to={`${studentPortalPath}/practice`}
          className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
        >
          <span>Start Practice Drill</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. Top Metric Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Questions Attempted */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Attempts</span>
            <Clock className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalAttempts}</div>
          <p className="text-[11px] text-slate-500 mt-1">Total completed tests</p>
        </div>

        {/* Overall Accuracy */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Accuracy</span>
            <Target className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{avgAccuracy}%</div>
          <p className="text-[11px] text-slate-500 mt-1">Average scoring rate</p>
        </div>

        {/* Daily Streak */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Active Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">3 Days</div>
          <p className="text-[11px] text-slate-500 mt-1">Keep practicing daily</p>
        </div>

        {/* Readiness Index */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Readiness Score</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-teal-700">{readinessScore} / 100</div>
          <p className="text-[11px] text-teal-600/90 font-medium mt-1">
            {readinessScore > 75 ? 'Strong Admission Track' : 'Baseline Diagnostic Phase'}
          </p>
        </div>
      </div>

      {/* 3. Recommended Practice Drills & Weak Topic Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Available Practice Tests */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recommended Examination Modules</h3>
              <p className="text-xs text-slate-500">Select a structured drill or start full mock simulation</p>
            </div>
            <Link
              to={`${studentPortalPath}/practice`}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {tests.slice(0, 4).map((test) => (
              <div
                key={test.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 transition-all flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{test.name}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {test.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{test.description}</p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>{test.question_count} Questions</span>
                    <span>•</span>
                    <span>{test.time_limit_minutes} Minutes</span>
                    <span>•</span>
                    <span className="capitalize">{test.question_selection_mode.toLowerCase()} Pool</span>
                  </div>
                </div>

                <button
                  type="button"
                  id={`btn-launch-${test.id}`}
                  onClick={() => navigate(`${studentPortalPath}/practice?test_id=${test.id}`)}
                  className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shrink-0 transition-colors"
                >
                  Start Drill
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 cols: Weak Topics & Adaptive Focus */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Curriculum Accuracy Breakdown</h3>
            <p className="text-xs text-slate-500">Track competency across official dMAT dimensions</p>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Figure Sequences: Vector Motion & Bounce</span>
                <span className="text-teal-700">82%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-600 h-full rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Figure Sequences: Rotational Symmetry</span>
                <span className="text-teal-700">74%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-600 h-full rounded-full" style={{ width: '74%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Multi-Symbol System Interactions</span>
                <span className="text-amber-700">55% (Focus Area)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '55%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Mathematical Equations: Modular Systems</span>
                <span className="text-sky-700">68%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-sky-600 h-full rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              <strong>Study Recommendation:</strong> Dedicate 20 minutes to Figure Sequence drills with Medium difficulty to strengthen multi-symbol boundary tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
