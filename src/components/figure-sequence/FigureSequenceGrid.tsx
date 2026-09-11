import React from 'react';
import { FigureGrid, GridSymbol } from '../../types';

interface FigureSequenceGridProps {
  grid: FigureGrid;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  isMissing?: boolean;
  highlight?: boolean;
}

export const FigureSequenceGrid: React.FC<FigureSequenceGridProps> = ({
  grid,
  label,
  size = 'md',
  isMissing = false,
  highlight = false,
}) => {
  const dimension = grid?.dimension || 4;

  const sizeClasses = {
    sm: 'w-24 h-24 text-[10px]',
    md: 'w-36 h-36 text-xs',
    lg: 'w-48 h-48 text-sm',
  }[size];

  const cellSize = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }[size];

  // Helper to render SVG geometric shapes with fill and rotation
  const renderSymbol = (sym: GridSymbol) => {
    const rot = sym.rotation || 0;
    const color = sym.color || '#0f766e';

    const fillStyle =
      sym.fill === 'filled'
        ? color
        : sym.fill === 'striped'
        ? 'url(#stripe-pattern)'
        : 'none';
    const strokeStyle = color;
    const strokeWidth = sym.fill === 'outline' ? 2.5 : 1.5;

    return (
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full p-1 transition-transform duration-200"
        style={{ transform: `rotate(${rot}deg)` }}
      >
        <defs>
          <pattern id="stripe-pattern" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="2" />
          </pattern>
        </defs>

        {sym.shape === 'circle' && (
          <circle cx="20" cy="20" r="14" fill={fillStyle} stroke={strokeStyle} strokeWidth={strokeWidth} />
        )}

        {sym.shape === 'square' && (
          <rect x="6" y="6" width="28" height="28" rx="2" fill={fillStyle} stroke={strokeStyle} strokeWidth={strokeWidth} />
        )}

        {sym.shape === 'triangle' && (
          <polygon points="20,6 34,34 6,34" fill={fillStyle} stroke={strokeStyle} strokeWidth={strokeWidth} />
        )}

        {sym.shape === 'diamond' && (
          <polygon points="20,5 35,20 20,35 5,20" fill={fillStyle} stroke={strokeStyle} strokeWidth={strokeWidth} />
        )}

        {sym.shape === 'cross' && (
          <path
            d="M15,5 L25,5 L25,15 L35,15 L35,25 L25,25 L25,35 L15,35 L15,25 L5,25 L5,15 L15,15 Z"
            fill={fillStyle}
            stroke={strokeStyle}
            strokeWidth={strokeWidth}
          />
        )}

        {sym.shape === 'star' && (
          <polygon
            points="20,4 24,14 35,15 27,23 29,34 20,29 11,34 13,23 5,15 16,14"
            fill={fillStyle}
            stroke={strokeStyle}
            strokeWidth={strokeWidth}
          />
        )}
      </svg>
    );
  };

  if (isMissing) {
    return (
      <div className="flex flex-col items-center">
        {label && <span className="text-xs font-semibold text-slate-500 mb-1 tracking-wider uppercase">{label}</span>}
        <div
          className={`${sizeClasses} border-2 border-dashed border-teal-500/50 bg-teal-50/40 rounded-lg flex flex-col items-center justify-center p-2 text-center shadow-inner`}
        >
          <span className="text-xl font-bold text-teal-700">?</span>
          <span className="text-[10px] text-teal-600 font-medium mt-0.5">Missing Step</span>
        </div>
      </div>
    );
  }

  // Create 4x4 matrix lookup
  const cellMap = new Map<string, GridSymbol>();
  grid?.symbols?.forEach((sym) => {
    cellMap.set(`${sym.row}-${sym.col}`, sym);
  });

  return (
    <div className="flex flex-col items-center">
      {label && <span className="text-xs font-semibold text-slate-600 mb-1 tracking-wider uppercase">{label}</span>}
      <div
        className={`${sizeClasses} bg-white border ${
          highlight ? 'border-teal-600 ring-2 ring-teal-500/30' : 'border-slate-300'
        } rounded-lg grid grid-cols-4 grid-rows-4 shadow-sm overflow-hidden`}
      >
        {Array.from({ length: dimension }).map((_, r) =>
          Array.from({ length: dimension }).map((_, c) => {
            const sym = cellMap.get(`${r}-${c}`);
            return (
              <div
                key={`${r}-${c}`}
                className={`${cellSize} border-b border-r border-slate-200/80 last:border-r-0 flex items-center justify-center relative`}
              >
                {sym && renderSymbol(sym)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
