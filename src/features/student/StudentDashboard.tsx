import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
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
import { Attempt, ExamSection, PracticeTest } from '../../types';

export const StudentDashboard: React.FC = () => {
  const { currentTenant, studentPortalPath, activeExam, exams, setActiveExamId } = useTenant();
  const { user, tier } = useAuth();
  const navigate = useNavigate();

  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [sections, setSections] = useState<ExamSection[]>([]);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const promises: [Promise<PracticeTest[]>, Promise<Attempt[]>, Promise<ExamSection[]>] = [
      examService.getPracticeTests(currentTenant?.id, activeExam?.id),
      attemptService.getUserHistory(user.id),
      activeExam?.id ? examService.getSections(activeExam.id) : Promise.resolve([]),
    ];

    Promise.all(promises)
      .then(([testList, historyList, sectionList]) => {
        if (isMounted) {
          setTests(testList);
          setHistory(historyList);
          setSections(sectionList);
        }
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentTenant?.id, activeExam?.id, user.id]);

  // Filter history for the active exam/tenant if applicable
  const examHistory = history.filter((a) => {
    if (activeExam?.id && a.exam_id && a.exam_id !== activeExam.id) return false;
    if (currentTenant?.id && a.tenant_id && a.tenant_id !== currentTenant.id) return false;
    return true;
  });

  const totalAttempts = examHistory.length;
  const avgAccuracy =
    totalAttempts > 0
      ? (examHistory.reduce((acc, a) => acc + a.percentage, 0) / totalAttempts).toFixed(1)
      : null;

  const targetPassingScore = activeExam?.passing_score || 70;

  // Derive readiness score mathematically based on completed attempts and passing threshold
  const readinessScore =
    avgAccuracy !== null
      ? Math.min(
          99,
          Math.max(
            30,
            Math.round(
              (Number(avgAccuracy) / targetPassingScore) * 65 +
                Math.min(totalAttempts * 5, 25) +
                (Number(avgAccuracy) >= targetPassingScore ? 10 : 0)
            )
          )
        )
      : null;

  const diagnosticTest =
    tests.find((t) => t.test_type === 'PRACTICE' || t.name.toLowerCase().includes('diagnostic')) ||
    tests[0];
  const primaryMock = tests.find((t) => t.test_type === 'MOCK') || null;

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Dynamic Exam Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                {currentTenant?.name || 'ExamHub Portal'}
              </span>
              {activeExam && (
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {activeExam.exam_type}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {activeExam
                ? `${activeExam.name} Preparation Dashboard`
                : `Welcome back, ${user.name}`}
            </h1>

            <p className="text-xs text-slate-500">
              Welcome back, <span className="font-semibold text-slate-700">{user.name}</span> •{' '}
              Access Tier: <span className="font-semibold text-slate-700">{tier}</span>
              {activeExam && (
                <>
                  {' '}
                  • Target Pass Rate:{' '}
                  <span className="font-bold text-teal-700">{targetPassingScore}%</span> •{' '}
                  Simulation: <span className="font-semibold text-slate-700">{activeExam.duration_minutes} min</span>
                </>
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {diagnosticTest && (
              <Link
                to={`${studentPortalPath}/practice?test_id=${diagnosticTest.id}`}
                id="dashboard-start-practice"
                className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 transition-colors flex items-center gap-2 shadow-xs"
              >
                <span>Start Diagnostic Drill</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <Link
              to={`${studentPortalPath}/mock-tests`}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Mock Exams</span>
            </Link>
          </div>
        </div>

        {/* Multi-Exam Switcher Bar if tenant has more than 1 exam */}
        {exams.length > 1 && (
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Select Target Exam:</span>
            <div className="relative inline-block">
              <select
                id="select-dashboard-exam"
                value={activeExam?.id || ''}
                onChange={(e) => setActiveExamId(e.target.value)}
                className="bg-slate-50 text-slate-800 font-semibold rounded-lg px-3 py-1.5 border border-slate-300 hover:border-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer pr-8"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.duration_minutes} min • Pass: {ex.passing_score}%)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Metric Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Questions Attempted */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Completed Tests</span>
            <Clock className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalAttempts}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalAttempts === 0 ? 'No attempts recorded yet' : 'Total graded sessions'}
          </p>
        </div>

        {/* Overall Accuracy */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Avg Accuracy</span>
            <Target className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {avgAccuracy !== null ? `${avgAccuracy}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {avgAccuracy !== null ? `Target: ${targetPassingScore}%` : 'Complete a drill to measure'}
          </p>
        </div>

        {/* Sections Covered */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Curriculum Sections</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{sections.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {sections.length > 0 ? 'Structured exam modules' : 'Exam sections pending'}
          </p>
        </div>

        {/* Readiness Index */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">
              {activeExam ? `${activeExam.name.split('—')[0].trim()} Readiness` : 'Exam Readiness'}
            </span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-teal-700">
            {readinessScore !== null ? `${readinessScore} / 100` : '—'}
          </div>
          <p className="text-[11px] text-teal-600/90 font-medium mt-1">
            {readinessScore !== null
              ? readinessScore >= 75
                ? 'Target Threshold Met'
                : 'Formative Practice Phase'
              : 'Take a test to calculate'}
          </p>
        </div>
      </div>

      {/* 3. Recommended Practice Drills & Curriculum Section Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Available Practice Tests */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recommended Examination Modules</h3>
              <p className="text-xs text-slate-500">
                Practice drills and official mock simulations for {activeExam?.name || 'this exam'}
              </p>
            </div>
            <Link
              to={`${studentPortalPath}/practice`}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading modules...</div>
          ) : tests.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-slate-500">No practice tests currently published for this exam.</p>
              <Link
                to={`${studentPortalPath}/study-plan`}
                className="text-xs font-semibold text-teal-700 underline"
              >
                Review Curriculum Study Plan
              </Link>
            </div>
          ) : (
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
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          test.test_type === 'MOCK'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-teal-50 text-teal-700'
                        }`}
                      >
                        {test.test_type}
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
                    onClick={() =>
                      navigate(
                        test.test_type === 'MOCK'
                          ? `${studentPortalPath}/mock-tests?test_id=${test.id}`
                          : `${studentPortalPath}/practice?test_id=${test.id}`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shrink-0 transition-colors"
                  >
                    {test.test_type === 'MOCK' ? 'Start Mock' : 'Start Drill'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 cols: Dynamic Curriculum Section Breakdown */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Curriculum Section Breakdown</h3>
              <p className="text-xs text-slate-500">
                Structure & coverage for {activeExam?.name || 'this exam'}
              </p>
            </div>
            <Link
              to={`${studentPortalPath}/study-plan`}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Full Plan
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading sections...</div>
          ) : sections.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-slate-500">No sections configured for this exam yet.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {sections.map((section, idx) => (
                <div key={section.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{section.name}</span>
                      </div>
                      {section.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{section.description}</p>
                      )}
                    </div>
                    <Link
                      to={`${studentPortalPath}/practice?section_id=${section.id}`}
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-800 shrink-0 bg-white px-2 py-1 rounded border border-slate-200"
                    >
                      Practice
                    </Link>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                    <span>{section.question_count} Questions per session</span>
                    <span>{section.time_limit_minutes ? `${section.time_limit_minutes} Min Limit` : 'Untimed'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dynamic Study Recommendation Callout */}
          <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <p>
              <strong>Study Recommendation:</strong>{' '}
              {totalAttempts === 0
                ? 'Begin with a diagnostic practice drill to establish your baseline accuracy across curriculum sections.'
                : Number(avgAccuracy) >= targetPassingScore
                ? 'You have met the target accuracy threshold. Schedule a timed full mock simulation under strict exam conditions.'
                : 'Review incorrect items from recent attempts and focus on your lowest-scoring sectional modules.'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Recent Attempt History */}
      {examHistory.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Test Attempts</h3>
              <p className="text-xs text-slate-500">Review your past performance and item answers</p>
            </div>
            <Link
              to={`${studentPortalPath}/progress`}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Full Analytics
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-2">Test Name</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Score</th>
                  <th className="pb-2">Accuracy</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {examHistory.slice(0, 5).map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900">{attempt.test_name || 'Practice Drill'}</td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                        {attempt.test_type}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {attempt.score} / {attempt.total_questions}
                    </td>
                    <td className="py-2.5 font-bold text-teal-700">{attempt.percentage}%</td>
                    <td className="py-2.5 text-slate-400">
                      {new Date(attempt.completed_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 text-right">
                      <Link
                        to={`${studentPortalPath}/results/${attempt.id}`}
                        className="text-teal-700 font-semibold hover:underline"
                      >
                        Results & Analysis
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
