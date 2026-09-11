import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { attemptService } from '../../services/attemptService';
import { Attempt } from '../../types';

export const StudentProgress: React.FC = () => {
  const { studentPortalPath } = useTenant();
  const { user } = useAuth();
  const [history, setHistory] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attemptService
      .getUserHistory(user.id)
      .then((data) => setHistory(data))
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics & Past Attempts</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your historic test performances, question choices, and accuracy trends over time.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Attempt History</h3>
          <span className="text-xs text-slate-500">{history.length} completed records</span>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <BarChart3 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium">No recorded attempts found for your profile yet.</p>
            <Link
              to={`${studentPortalPath}/practice`}
              className="inline-block px-4 py-2 bg-teal-700 text-white font-semibold text-xs rounded-xl"
            >
              Take Your First Practice Drill
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Test Title</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{att.test_name}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(att.completed_at || att.started_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      {att.score} / {att.total_questions}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-teal-700">{att.percentage}%</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
                          att.percentage >= 70
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {att.percentage >= 70 ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{att.percentage >= 70 ? 'Passed' : 'Needs Work'}</span>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
