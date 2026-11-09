import React, { useState } from 'react';
import { Compass, Sparkles, RefreshCw, Layers, ArrowRight } from 'lucide-react';
import { TopologicalInfinityEngine } from '../core/svlEngine';

interface Props {
  onParamChange?: (start: number, end: number) => void;
}

export default function TopologicalVisualizer({ onParamChange }: Props) {
  const [startType, setStartType] = useState<'inf' | 'custom'>('inf');
  const [endType, setEndType] = useState<'inf' | 'custom'>('inf');
  const [customStart, setCustomStart] = useState<number>(-10);
  const [customEnd, setCustomEnd] = useState<number>(10);

  const rawStart = startType === 'inf' ? -Infinity : customStart;
  const rawEnd = endType === 'inf' ? Infinity : customEnd;

  const engine = new TopologicalInfinityEngine(rawStart, rawEnd);
  const details = engine.getDetails();

  const handlePreset = (s: number | 'inf', e: number | 'inf') => {
    if (s === 'inf') {
      setStartType('inf');
    } else {
      setStartType('custom');
      setCustomStart(s);
    }

    if (e === 'inf') {
      setEndType('inf');
    } else {
      setEndType('custom');
      setCustomEnd(e);
    }

    const actualS = s === 'inf' ? -Infinity : s;
    const actualE = e === 'inf' ? Infinity : e;
    onParamChange?.(actualS, actualE);
  };

  // SVG coordinate calculations for Pythagorean triangle
  // Max dimension for canvas is 240x180
  const maxSide = Math.max(details.a, details.b, 2.5);
  const scale = 110 / maxSide;
  const triWidth = Math.max(30, details.a * scale);
  const triHeight = Math.max(30, details.b * scale);

  const originX = 40;
  const originY = 150;
  const cornerX = originX + triWidth;
  const cornerY = originY;
  const topX = cornerX;
  const topY = originY - triHeight;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-neutral-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              Topological Infinity Engine
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                v5.5.0-Reflective
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Stereograficzne uzwarcenie continuum do przedziału zwartym [-1, 1] i metryka Pitagorejska
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-neutral-500 font-mono mr-1">Wzorce:</span>
          <button
            onClick={() => handlePreset('inf', 'inf')}
            className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
              startType === 'inf' && endType === 'inf'
                ? 'bg-cyan-500/25 border border-cyan-500 text-cyan-200'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            [-∞, +∞] (C=2.5)
          </button>
          <button
            onClick={() => handlePreset(-10, 10)}
            className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
              startType === 'custom' && customStart === -10 && endType === 'custom' && customEnd === 10
                ? 'bg-cyan-500/25 border border-cyan-500 text-cyan-200'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            [-10, +10]
          </button>
          <button
            onClick={() => handlePreset(0, 'inf')}
            className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
              startType === 'custom' && customStart === 0 && endType === 'inf'
                ? 'bg-cyan-500/25 border border-cyan-500 text-cyan-200'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            [0, +∞]
          </button>
        </div>
      </div>

      {/* Main calculation row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        
        {/* Left: Input controls & values */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
              Granice Domeny Continuum
            </span>

            {/* x_start */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-mono text-neutral-300 font-semibold">x_start:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setStartType('inf');
                    onParamChange?.(-Infinity, rawEnd);
                  }}
                  className={`px-2 py-0.5 rounded font-mono text-xs ${
                    startType === 'inf' ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  -∞
                </button>
                <button
                  onClick={() => {
                    setStartType('custom');
                    onParamChange?.(customStart, rawEnd);
                  }}
                  className={`px-2 py-0.5 rounded font-mono text-xs ${
                    startType === 'custom' ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  Liczba
                </button>
                {startType === 'custom' && (
                  <input
                    type="number"
                    value={customStart}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCustomStart(val);
                      onParamChange?.(val, rawEnd);
                    }}
                    className="w-20 px-2 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                )}
              </div>
            </div>

            {/* x_end */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-mono text-neutral-300 font-semibold">x_end:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEndType('inf');
                    onParamChange?.(rawStart, Infinity);
                  }}
                  className={`px-2 py-0.5 rounded font-mono text-xs ${
                    endType === 'inf' ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  +∞
                </button>
                <button
                  onClick={() => {
                    setEndType('custom');
                    onParamChange?.(rawStart, customEnd);
                  }}
                  className={`px-2 py-0.5 rounded font-mono text-xs ${
                    endType === 'custom' ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  Liczba
                </button>
                {endType === 'custom' && (
                  <input
                    type="number"
                    value={customEnd}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCustomEnd(val);
                      onParamChange?.(rawStart, val);
                    }}
                    className="w-20 px-2 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Compactified values display */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
              <div className="text-neutral-500 font-mono text-[11px]">compact_start:</div>
              <div className="text-cyan-400 font-mono font-semibold text-sm mt-0.5">
                {details.compact_start.toFixed(6)}
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">x / (1 + |x|)</div>
            </div>
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
              <div className="text-neutral-500 font-mono text-[11px]">compact_end:</div>
              <div className="text-cyan-400 font-mono font-semibold text-sm mt-0.5">
                {details.compact_end.toFixed(6)}
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">x / (1 + |x|)</div>
            </div>
          </div>

          {/* Formula info pill */}
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/40 text-neutral-300 text-xs space-y-1">
            <div className="text-cyan-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Algebra 97 – Rzutowanie Stereograficzne</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              <code className="text-cyan-200">f(x) = x / (1.0 + |x|)</code> mapuje continuum (-∞, +∞) w idealny zbiór zwarty [-1.0, 1.0].
            </p>
          </div>
        </div>

        {/* Right: SVG Triangle & Metric Calculation */}
        <div className="lg:col-span-7 flex flex-col justify-between p-4 rounded-xl bg-neutral-950 border border-neutral-800">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-neutral-300">
                Trójkąt Pitagorasa w Przestrzeni Zwartej
              </span>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
              c = {details.c.toFixed(6)}
            </span>
          </div>

          {/* SVG Canvas */}
          <div className="relative flex items-center justify-center py-2">
            <svg viewBox="0 0 260 170" className="w-full max-h-48">
              {/* Grid backdrop */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#262626" strokeWidth="0.5" />
                </pattern>
                <linearGradient id="hypoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <rect width="260" height="170" fill="url(#grid)" opacity="0.3" rx="8" />

              {/* Triangle fill */}
              <polygon
                points={`${originX},${originY} ${cornerX},${cornerY} ${topX},${topY}`}
                fill="#06b6d4"
                fillOpacity="0.08"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />

              {/* Side a (bottom) */}
              <line
                x1={originX}
                y1={originY}
                x2={cornerX}
                y2={cornerY}
                stroke="#38bdf8"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Side b (right) */}
              <line
                x1={cornerX}
                y1={cornerY}
                x2={topX}
                y2={topY}
                stroke="#a855f7"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Hypotenuse c */}
              <line
                x1={originX}
                y1={originY}
                x2={topX}
                y2={topY}
                stroke="url(#hypoGrad)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Right angle marker */}
              <rect
                x={cornerX - 12}
                y={cornerY - 12}
                width="12"
                height="12"
                fill="none"
                stroke="#737373"
                strokeWidth="1.5"
              />

              {/* Point A */}
              <circle cx={originX} cy={originY} r="4" fill="#38bdf8" />
              {/* Point B */}
              <circle cx={cornerX} cy={cornerY} r="4" fill="#a855f7" />
              {/* Point C */}
              <circle cx={topX} cy={topY} r="4" fill="#10b981" />

              {/* Labels */}
              <text x={(originX + cornerX) / 2} y={originY + 14} fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                a = {details.a.toFixed(3)}
              </text>
              <text x={cornerX + 16} y={(cornerY + topY) / 2 + 3} fill="#a855f7" fontSize="10" fontFamily="monospace" textAnchor="start">
                b = {details.b.toFixed(3)}
              </text>
              <text x={(originX + topX) / 2 - 14} y={(originY + topY) / 2 - 8} fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                c = {details.c.toFixed(4)}
              </text>
            </svg>
          </div>

          {/* Mathematical breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800 text-[11px] font-mono">
            <div className="text-neutral-400">
              <span className="text-sky-400 font-bold">a</span> = |end - start|<br/>
              <span className="text-neutral-200">= {details.a.toFixed(4)}</span>
            </div>
            <div className="text-neutral-400">
              <span className="text-purple-400 font-bold">b</span> = |s·e| + 0.5<br/>
              <span className="text-neutral-200">= {details.b.toFixed(4)}</span>
            </div>
            <div className="text-neutral-400">
              <span className="text-emerald-400 font-bold">c</span> = √(a² + b²)<br/>
              <span className="text-emerald-300 font-bold">= {details.c.toFixed(6)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
