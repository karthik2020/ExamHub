import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Sparkles, HelpCircle, Compass, RotateCw, Move } from 'lucide-react';
import { FigureSequenceGrid } from './FigureSequenceGrid';
import { FigureGrid } from '../../types';
import { useTenant } from '../../contexts/TenantContext';

export const FigureSequenceShowcase: React.FC = () => {
  const { studentPortalPath } = useTenant();

  // Curated, pedagogically clear public demo sequence:
  // Rule 1: Circle moves along primary diagonal (r+1, c+1) with border bounce.
  // Rule 2: Triangle rotates 90 deg clockwise at each step.
  const sampleSteps: FigureGrid[] = [
    {
      dimension: 4,
      symbols: [
        { id: 's1-c', shape: 'circle', color: '#0f766e', fill: 'filled', row: 0, col: 0, rotation: 0 },
        { id: 's1-t', shape: 'triangle', color: '#0284c7', fill: 'outline', row: 3, col: 1, rotation: 0 },
      ],
    },
    {
      dimension: 4,
      symbols: [
        { id: 's2-c', shape: 'circle', color: '#0f766e', fill: 'filled', row: 1, col: 1, rotation: 0 },
        { id: 's2-t', shape: 'triangle', color: '#0284c7', fill: 'outline', row: 2, col: 2, rotation: 90 },
      ],
    },
    {
      dimension: 4,
      symbols: [
        { id: 's3-c', shape: 'circle', color: '#0f766e', fill: 'filled', row: 2, col: 2, rotation: 0 },
        { id: 's3-t', shape: 'triangle', color: '#0284c7', fill: 'outline', row: 1, col: 3, rotation: 180 },
      ],
    },
    {
      dimension: 4,
      symbols: [
        { id: 's4-c', shape: 'circle', color: '#0f766e', fill: 'filled', row: 3, col: 3, rotation: 0 },
        { id: 's4-t', shape: 'triangle', color: '#0284c7', fill: 'outline', row: 0, col: 2, rotation: 270 },
      ],
    },
  ];

  // Options for Missing Grid 5:
  // Circle bounces from (3,3) -> reverses vector or wraps -> (2,2)
  // Triangle moves to (1,1) with rotation 0 deg.
  const sampleOptions = [
    {
      key: 'A',
      label: 'Grid 5: Circle at (2,2), Triangle at (1,1) [Rot 0°]',
      isCorrect: true,
      grid: {
        dimension: 4,
        symbols: [
          { id: 'opt-a-c', shape: 'circle', color: '#0f766e', fill: 'filled', row: 2, col: 2, rotation: 0 },
          { id: 'opt-a-t', shape: 'triangle', color: '#0284c7', fill: 'outline', row: 1, col: 1, rotation: 0 },
        ],
      },
    },
    {
      key: 'B',
      label: 'Grid 5: Circle at (0,0), Triangle at (0,1) [Rot 90°]',
      isCorrect: false,
      grid: {
        dimension: 4,
        symbols: [
          { id: 'opt-b-c', shape: 'circle', color: '#0f766e', fill: 'filled', row: 0, col: 0, rotation: 0 },
          { id: 'opt-b-t', shape: 'triangle', color: '#0284c7', fill: 'outline', row: 0, col: 1, rotation: 90 },
        ],
      },
    },
    {
      key: 'C',
      label: 'Grid 5: Circle at (3,2), Triangle at (2,0) [Rot 180°]',
      isCorrect: false,
      grid: {
        dimension: 4,
        symbols: [
          { id: 'opt-c-c', shape: 'circle', color: '#0f766e', fill: 'filled', row: 3, col: 2, rotation: 0 },
          { id: 'opt-c-t', shape: 'triangle', color: '#0284c7', fill: 'outline', row: 2, col: 0, rotation: 180 },
        ],
      },
    },
    {
      key: 'D',
      label: 'Grid 5: Circle at (1,3), Triangle at (1,2) [Rot 270°]',
      isCorrect: false,
      grid: {
        dimension: 4,
        symbols: [
          { id: 'opt-d-c', shape: 'circle', color: '#0f766e', fill: 'filled', row: 1, col: 3, rotation: 0 },
          { id: 'opt-d-t', shape: 'triangle', color: '#0284c7', fill: 'outline', row: 1, col: 2, rotation: 270 },
        ],
      },
    },
  ];

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Demonstration</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            How Figure Sequence Deductions Work
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            In the dMAT, questions present a 4x4 matrix progression governed by spatial vectors, border reflections,
            and rotational states. Your objective is to discover the missing step.
          </p>
        </div>

        <div className="shrink-0">
          <Link
            to={`${studentPortalPath || '/ems'}/practice`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 transition-colors shadow-sm"
          >
            <span>Take Full Diagnostic</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Sequence Grids Display */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Progression: Grids 1 Through 4 (Given)
            </span>
            <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full">
              4x4 Topological Grid
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200/80 items-center justify-items-center">
            {sampleSteps.map((grid, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <FigureSequenceGrid grid={grid} label={`Grid ${idx + 1}`} size="md" />
              </div>
            ))}
          </div>
        </div>

        {/* Missing Target Question */}
        <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <div className="font-bold text-teal-950 text-sm">Target Task: Deduce Grid 5</div>
            <div className="text-xs text-teal-800 mt-0.5">
              Which configuration logically follows Grid 4 based on vector rules?
            </div>
          </div>
          <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-lg bg-teal-700 text-white">
            Select Below
          </span>
        </div>

        {/* 4 Interactive Answer Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sampleOptions.map((opt) => {
            const isSelected = selectedKey === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setSelectedKey(opt.key);
                  setShowExplanation(true);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-teal-700 bg-teal-50/50 ring-2 ring-teal-600/30 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="w-full flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center">
                    {opt.key}
                  </span>
                  {showExplanation && opt.isCorrect && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Correct</span>
                    </span>
                  )}
                </div>

                <div className="py-2">
                  <FigureSequenceGrid grid={opt.grid} size="sm" />
                </div>

                <div className="text-[11px] text-slate-600 text-center font-medium leading-tight">
                  {opt.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detailed Explanation Drawer */}
        {showExplanation && (
          <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
                <span className="font-bold text-sm text-teal-300">
                  Analytical Solution & Rule Deconstruction
                </span>
              </div>
              <span className="text-xs text-slate-400">Section 1: Figure Sequences</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1.5">
                <div className="font-bold text-teal-300 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-teal-400" />
                  <span>Rule 1: Circle Displacement Vector</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  The filled teal circle moves along the major diagonal: (0,0) → (1,1) → (2,2) → (3,3). Reaching the
                  corner boundary at (3,3), it performs a 180° elastic reflection along the diagonal vector, moving back to{' '}
                  <strong className="text-white">(2,2)</strong> in Grid 5.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1.5">
                <div className="font-bold text-sky-300 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Rule 2: Triangle Rotation & Shift</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  The outline triangle shifts one unit right and one unit up across each step while executing a clockwise
                  90° axial rotation: 0° → 90° → 180° → 270° → <strong className="text-white">0° (360°)</strong> at position (1,1).
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                Therefore, Option <strong className="text-teal-300">A</strong> satisfies both topological invariants simultaneously.
              </div>
              <Link
                to={`${studentPortalPath || '/ems'}/practice`}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors flex items-center gap-2"
              >
                <span>Launch 10-Question Diagnostic Test</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
