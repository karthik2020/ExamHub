import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { QuestionRenderer } from '../../components/questions/QuestionRenderer';
import { useTenant } from '../../contexts/TenantContext';
import { attemptService } from '../../services/attemptService';
import { Attempt } from '../../types';

export const AttemptResults: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { studentPortalPath } = useTenant();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'INCORRECT' | 'CORRECT'>('ALL');

  useEffect(() => {
    if (!attemptId) return;
    attemptService
      .getAttempt(attemptId)
      .then((data) => setAttempt(data))
      .catch((err) => console.error('Error fetching attempt:', err))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-slate-500">Grading and compiling attempt analytics...</p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Attempt Not Found</h2>
        <Link to={studentPortalPath} className="text-teal-700 font-semibold underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isPassed = attempt.percentage >= 70;
  const questions = attempt.questions || [];

  const filteredQuestions = questions.filter((q) => {
    const ans = attempt.answers?.[q.id];
    if (filter === 'CORRECT') return ans?.is_correct === true;
    if (filter === 'INCORRECT') return ans?.is_correct === false || !ans?.selected_answer;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 1. Score Summary Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
              Assessment Report
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {attempt.test_name || 'Practice Drill Results'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Completed on {new Date(attempt.completed_at || Date.now()).toLocaleDateString()} at{' '}
              {new Date(attempt.completed_at || Date.now()).toLocaleTimeString()}
            </p>
          </div>

          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
            }`}
          >
            {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{isPassed ? 'Qualified / Target Met' : 'Review Required'}</span>
          </div>
        </div>

        {/* Big Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase">Score</span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {attempt.score} / {attempt.total_questions}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase">Accuracy</span>
            <div className="text-3xl font-black text-teal-700 mt-1">{attempt.percentage}%</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center">
            <span className="text-xs font-semibold text-emerald-700 uppercase">Correct</span>
            <div className="text-3xl font-black text-emerald-800 mt-1">{attempt.correct_count}</div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 text-center">
            <span className="text-xs font-semibold text-rose-700 uppercase">Incorrect / Skipped</span>
            <div className="text-3xl font-black text-rose-800 mt-1">
              {attempt.incorrect_count + attempt.skipped_count}
            </div>
          </div>
        </div>

        {/* Action CTA Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <Link
            to={studentPortalPath}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>

          <Link
            to={`${studentPortalPath}/practice`}
            className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Start Another Drill</span>
          </Link>
        </div>
      </div>

      {/* 2. Question By Question Detailed Review */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Detailed Answer Review</h2>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
            {(['ALL', 'INCORRECT', 'CORRECT'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filter === f
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {f === 'ALL' ? 'All Items' : f === 'INCORRECT' ? 'Mistakes Only' : 'Correct Only'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {filteredQuestions.map((q, idx) => {
            const answer = attempt.answers?.[q.id];
            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700">Question #{idx + 1}</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${
                      answer?.is_correct
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {answer?.is_correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <QuestionRenderer
                  question={q}
                  selectedAnswer={answer?.selected_answer}
                  onSelectAnswer={() => {}}
                  result={answer}
                  disabled
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
