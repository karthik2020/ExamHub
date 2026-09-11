import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, Compass, Sparkles } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

export const StudyPlanView: React.FC = () => {
  const { studentPortalPath } = useTenant();

  const roadmap = [
    {
      week: 'Week 1: Fundamentals of 4x4 Grid Symmetries',
      status: 'COMPLETED',
      days: [
        { day: 'Day 1', task: 'Single-symbol vector motion and boundary collision rules', done: true },
        { day: 'Day 2', task: '90° and 180° rotation sequences with shape fill permutations', done: true },
        { day: 'Day 3', task: '10-question diagnostic drill on Basic Figure Sequences', done: true },
      ],
    },
    {
      week: 'Week 2: Multi-Symbol Systems & Interference',
      status: 'IN_PROGRESS',
      days: [
        { day: 'Day 4', task: 'Independent movement vectors for 2+ symbols simultaneously', done: true },
        { day: 'Day 5', task: 'Symbol stacking, layering, and occlusion rules', done: false },
        { day: 'Day 6', task: '20-question Medium difficulty timed drill', done: false },
      ],
    },
    {
      week: 'Week 3: Mathematical Equations & Modulo Operations',
      status: 'UPCOMING',
      days: [
        { day: 'Day 7', task: 'Non-standard operator definitions and modular arithmetic', done: false },
        { day: 'Day 8', task: 'Solving systems of constraints under strict time limits', done: false },
        { day: 'Day 9', task: 'Sectional simulation on mathematical deduction', done: false },
      ],
    },
    {
      week: 'Week 4: Full-Length Timed Mock Simulations',
      status: 'UPCOMING',
      days: [
        { day: 'Day 10', task: 'Official 90-minute timed mock simulation', done: false },
        { day: 'Day 11', task: 'Deep dive analytical review of incorrect questions', done: false },
        { day: 'Day 12', task: 'Final confidence drill on Hard difficulty procedural sets', done: false },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
            Structured Preparation Pathway
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">dMAT Preparation Schedule</h1>
          <p className="text-xs text-slate-500 mt-1">
            Follow our 4-week structured curriculum to systematically master every examination dimension.
          </p>
        </div>

        <Link
          to={`${studentPortalPath}/practice`}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors"
        >
          Resume Practice
        </Link>
      </div>

      <div className="space-y-4">
        {roadmap.map((week, wIdx) => (
          <div key={wIdx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-slate-900 text-sm">{week.week}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  week.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : week.status === 'IN_PROGRESS'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {week.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {week.days.map((d, dIdx) => (
                <div
                  key={dIdx}
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-2 ${
                    d.done ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span>{d.day}</span>
                      {d.done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{d.task}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
