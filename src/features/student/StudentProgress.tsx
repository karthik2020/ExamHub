import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Layers,
  RotateCcw,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { attemptService } from '../../services/attemptService';
import { examService } from '../../services/examService';
import { Attempt, ExamSection } from '../../types';

export const StudentProgress: React.FC = () => {
  const { currentTenant, studentPortalPath, activeExam } = useTenant();
  const { user } = useAuth();
  const [history, setHistory] = useState<Attempt[]>([]);
  const [sections, setSections] = useState<ExamSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const promises = [
      attemptService.getUserHistory(user.id).catch(() => [] as Attempt[]),
      activeExam?.id ? examService.getSections(activeExam.id).catch(() => [] as ExamSection[]) : Promise.resolve([]),
    ];

    Promise.all(promises)
      .then(([attempts, secList]) => {
        if (!isMounted) return;
        setHistory(attempts as Attempt[]);
        setSections(secList as ExamSection[]);
      })
      .catch((err) => console.error('Error loading student progress:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user.id, activeExam?.id]);

  const completedAttempts = history.filter(
    (a) => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED'
  );

  const avgAccuracy =
    completedAttempts.length > 0
      ? Math.round(
          completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedAttempts.length
        )
      : 0;

  const totalQuestionsAnswered = completedAttempts.reduce(
    (sum, a) => sum + (a.correct_count || 0) + (a.incorrect_count || 0),
    0
  );

  const bestScore =
    completedAttempts.length > 0
      ? Math.max(...completedAttempts.map((a) => a.percentage || 0))
      : 0;

  const passingThreshold = activeExam?.passing_score || 65;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
            Performance Analytics • {activeExam?.name || currentTenant?.name}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Analytics & Progress Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your performance trajectories, section proficiencies, and complete historical examination attempts.
          </p>
        </div>

        <Link
          to={`${studentPortalPath}/practice`}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <span>New Practice Drill</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed Tests</span>
            <BarChart3 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{completedAttempts.length}</div>
          <div className="text-[11px] text-slate-500">Graded submissions</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Average Accuracy</span>
            <Target className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{avgAccuracy}%</div>
          <div className="text-[11px] text-slate-500">Pass mark: {passingThreshold}%</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Items Solved</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalQuestionsAnswered}</div>
          <div className="text-[11px] text-slate-500">Total responses</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Peak Accuracy</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{bestScore}%</div>
          <div className="text-[11px] text-slate-500">Highest attempt score</div>
        </div>
      </div>

      {/* Section Proficiency Grid if sections exist */}
      {sections.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Layers className="w-4 h-4 text-teal-700" />
              <span>Exam Section Breakdown</span>
            </div>
            <span className="text-xs text-slate-500">{sections.length} Syllabus Modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="truncate">{sec.name}</span>
                    <span className="text-[10px] text-slate-400">Section {idx + 1}</span>
                  </div>
                  {sec.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{sec.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  <span className="text-[11px] text-slate-500">
                    {sec.question_count ? `${sec.question_count} items` : 'Curriculum standard'}
                  </span>
                  <Link
                    to={`${studentPortalPath}/practice?section_id=${sec.id}`}
                    className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                  >
                    <span>Practice</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attempt History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Complete Attempt History</h3>
          <span className="text-xs text-slate-500">{history.length} total sessions</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading attempt records...</div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <BarChart3 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium">No recorded attempts found for your profile yet.</p>
            <Link
              to={`${studentPortalPath}/practice`}
              className="inline-block px-4 py-2 bg-teal-700 text-white font-semibold text-xs rounded-xl hover:bg-teal-800 transition-colors"
            >
              Take Your First Practice Drill
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Examination / Module</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.map((att) => {
                  const isPassed = (att.percentage || 0) >= passingThreshold;
                  const dateStr = new Date(att.submitted_at || att.started_at).toLocaleDateString();

                  return (
                    <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {att.practice_test_name || 'Practice Examination'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{dateStr}</td>
                      <td className="py-3.5 px-4 font-semibold">
                        {att.score} / {att.max_score || att.correct_count + att.incorrect_count + att.skipped_count}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-teal-700">{att.percentage}%</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPassed ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{isPassed ? 'Passed' : 'Needs Practice'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`${studentPortalPath}/results/${att.id}`}
                          className="text-teal-700 hover:text-teal-900 font-bold hover:underline"
                        >
                          Review Answers →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
