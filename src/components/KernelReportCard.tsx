import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, RefreshCw, Cpu, Activity } from 'lucide-react';
import { StatusReport } from '../core/svlEngine';
import { MashyValue } from './MashyCode';
import { encodeMashy } from '../core/mashyCode';

interface Props {
  report: StatusReport;
  onRefresh: () => void;
}

export default function KernelReportCard({ report, onRefresh }: Props) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(report, null, 4);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `svl_kernel_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-neutral-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              System Status Report · MASHY-V1
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </h3>
            <p className="text-xs text-neutral-400 font-mono">
              Wygenerowano przez SVLSystemKernel.generate_system_status_report()
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Odśwież raport"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Skopiowano!' : 'Kopiuj JSON'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pobierz .json</span>
          </button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
        <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
          <span className="text-[10px] text-neutral-500 font-mono uppercase block">Status Systemu</span>
          <span className="text-xs font-bold text-neutral-200 font-mono mt-0.5 block truncate">
            <MashyValue value={report.System} />
          </span>
        </div>
        <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
          <span className="text-[10px] text-neutral-500 font-mono uppercase block">Operator</span>
          <span className="text-xs font-bold text-cyan-300 font-mono mt-0.5 block truncate">
            {report.Operator}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
          <span className="text-[10px] text-neutral-500 font-mono uppercase block">Performance</span>
          <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block truncate">
            <MashyValue value={report.Performance} />
          </span>
        </div>
        <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
          <span className="text-[10px] text-neutral-500 font-mono uppercase block">Compact Metric C</span>
          <span className="text-xs font-bold text-amber-300 font-mono mt-0.5 block">
            <MashyValue value={report.Compact_Metric_C.toFixed(6)} />
          </span>
        </div>
      </div>

      {/* JSON Viewer */}
      <div className="relative rounded-xl bg-black/80 border border-neutral-800 overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/80 bg-neutral-950/80">
          <div className="flex items-center gap-2 text-neutral-400">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">Podgląd Mashy · kopia i eksport zachowują JSON</span>
          </div>
          <span className="text-[10px] text-neutral-500">
            UTF-8 · Indent: 4 spaces
          </span>
        </div>
        <pre className="p-4 text-emerald-400/90 overflow-x-auto leading-relaxed select-all">
          {encodeMashy(jsonString)}
        </pre>
      </div>
    </div>
  );
}
