import React, { useState, useEffect } from 'react';
import {
  Target,
  Users,
  Shield,
  Zap,
  Sparkles,
  Music,
  ExternalLink,
  Play,
  UserCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  FileText,
  AlertCircle,
  HelpCircle,
  Activity,
  ChevronRight,
  X
} from 'lucide-react';

export interface MissionLog {
  timestamp: string;
  message: string;
}

export interface Mission {
  id: string;
  number: string;
  title: string;
  description: string;
  targetAgent: 'Aurelius' | 'Alex' | 'Astyria' | 'Aria' | string;
  assignedAgent: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  issueNumber: number;
  issueUrl: string;
  epicUrl: string;
  createdAt: string;
  logs: MissionLog[];
}

const AGENTS = [
  { name: 'Aurelius', icon: Shield, color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-950/40' },
  { name: 'Alex', icon: Zap, color: 'text-cyan-400', border: 'border-cyan-500/40', bg: 'bg-cyan-950/40' },
  { name: 'Astyria', icon: Sparkles, color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-950/40' },
  { name: 'Aria', icon: Music, color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-950/40' },
];

export default function MissionControl() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assigningAgent, setAssigningAgent] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [startError, setStartError] = useState<{ missionId: string; message: string } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchMissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/missions');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.missions || []);
      setMissions(list);
      if (selectedMission) {
        const updated = list.find((m: Mission) => m.id === selectedMission.id);
        if (updated) setSelectedMission(updated);
      }
    } catch (err) {
      console.error('Błąd pobierania misji:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const handleAssign = async (missionId: string, agentName: string) => {
    if (!agentName) return;
    setIsAssigning(true);
    setStartError(null);
    try {
      const res = await fetch(`/api/missions/${missionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Błąd przypisania');

      setActionSuccess(`Przypisano misję do agenta ${agentName}.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchMissions();
    } catch (err: any) {
      alert(`Błąd: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStartMission = async (missionId: string) => {
    setStartError(null);
    try {
      const res = await fetch(`/api/missions/${missionId}/start`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.status === 409) {
        setStartError({
          missionId,
          message: data.message || 'Agent niepodłączony. Brak aktywnego executora wykonawczego dla agenta.',
        });
      } else {
        alert(data.message || 'Odpowiedź serwera');
      }
    } catch (err: any) {
      setStartError({
        missionId,
        message: `Błąd połączenia: ${err.message}`,
      });
    }
  };

  // Filtered missions
  const filteredMissions = missions.filter((m) => {
    const matchesAgent =
      filterAgent === 'all' ||
      m.assignedAgent?.toLowerCase() === filterAgent.toLowerCase() ||
      m.targetAgent?.toLowerCase() === filterAgent.toLowerCase();

    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;

    const matchesSearch =
      searchQuery.trim() === '' ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.number.includes(searchQuery);

    return matchesAgent && matchesStatus && matchesSearch;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">Krytyczny</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">Wysoki</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">Średni</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-400">Niski</span>;
    }
  };

  const getAgentObj = (name: string | null) => {
    if (!name) return null;
    return AGENTS.find((a) => a.name.toLowerCase() === name.toLowerCase()) || null;
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col space-y-6 p-4 sm:p-6">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-cyan-500/10">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Centrum Misji AI (SPAA Task Orchestrator)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-300">
                Epic #1
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Oficjalny rejestr 9 zaplanowanych etapów budowy systemu Testowe. Narzędzie koordynacji dla agentów Aurelius, Alex, Astyria i Aria.
            </p>
          </div>
        </div>

        {/* Action badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Karty czatu to profile konwersacyjne, nie live executory</span>
          </div>
          <button
            onClick={fetchMissions}
            disabled={isLoading}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
            title="Odśwież misje"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {startError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Odmowa Uruchomienia (Kod 409: agent_not_connected)</span>
            </div>
            <button onClick={() => setStartError(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="leading-relaxed">
            {startError.message} System nie symuluje fałszywego postępu wykonania. Do uruchomienia zadań systemowych wymagany jest autentyczny proces daemona roboczego podłączony do szyny SPAA na stacji hosta.
          </p>
          <div className="text-[11px] font-mono text-rose-300/80">
            Status misji pozostaje w stanie: <strong>planned (0%)</strong>.
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
        {/* Search Input */}
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Szukaj po tytule, opisie lub numerze..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Agent */}
        <div className="sm:col-span-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-500 shrink-0" />
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Wszyscy agenci (Aurelius, Alex, Astyria, Aria)</option>
            <option value="Aurelius">Aurelius</option>
            <option value="Alex">Alex</option>
            <option value="Astyria">Astyria</option>
            <option value="Aria">Aria</option>
          </select>
        </div>

        {/* Filter Status */}
        <div className="sm:col-span-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Wszystkie statusy</option>
            <option value="planned">Zaplanowane (planned)</option>
            <option value="in_progress">W trakcie (in_progress)</option>
            <option value="completed">Ukończone (completed)</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Mission List + Mission Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Mission Cards List */}
        <div className={`${selectedMission ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>Lista zarejestrowanych etapów ({filteredMissions.length} z {missions.length}):</span>
            <span className="font-mono text-[11px]">Baza: 9 misji Epic #1</span>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredMissions.map((mission) => {
              const isSelected = selectedMission?.id === mission.id;
              const assignedAgentObj = getAgentObj(mission.assignedAgent);
              const targetAgentObj = getAgentObj(mission.targetAgent);

              return (
                <div
                  key={mission.id}
                  onClick={() => setSelectedMission(mission)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-800/90 border-cyan-500 ring-1 ring-cyan-500/30 shadow-lg'
                      : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-neutral-800 text-cyan-300 border border-neutral-700">
                        #{mission.number}
                      </span>
                      <h3 className="text-sm font-semibold text-white">
                        {mission.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(mission.priority)}
                      <a
                        href={mission.issueUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-neutral-400 hover:text-cyan-300 hover:bg-neutral-800 transition-colors"
                        title="Otwórz GitHub Issue"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-3">
                    {mission.description}
                  </p>

                  {/* Progress & Agent Assignment row */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-neutral-800/80 text-xs gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-500">Agent:</span>
                      {mission.assignedAgent ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${assignedAgentObj?.border} ${assignedAgentObj?.bg} ${assignedAgentObj?.color}`}>
                          {mission.assignedAgent}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
                          Nieprzypisany (Domyślny: {mission.targetAgent})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
                        <span>Postęp:</span>
                        <strong className="text-neutral-200">{mission.progress}%</strong>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 uppercase">
                        {mission.status}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden mt-2.5">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${mission.progress}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {filteredMissions.length === 0 && (
              <div className="p-8 text-center text-neutral-500 rounded-xl border border-dashed border-neutral-800 text-xs">
                Brak misji spełniających wybrane kryteria wyszukiwania.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mission Detail View */}
        {selectedMission && (
          <div className="lg:col-span-5 rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                    ETAP #{selectedMission.number}
                  </span>
                  {getPriorityBadge(selectedMission.priority)}
                </div>
                <h3 className="text-base font-bold text-white leading-snug">
                  {selectedMission.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMission(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                Opis Etapu / Cel Zadania:
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
                {selectedMission.description}
              </p>
            </div>

            {/* GitHub Links */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <a
                href={selectedMission.issueUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between text-cyan-300 transition-colors"
              >
                <span>GitHub Issue #{selectedMission.issueNumber}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={selectedMission.epicUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between text-purple-300 transition-colors"
              >
                <span>Epic Issue #1</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Assignment Section */}
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>Przypisanie Agenta Wykonawczego</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                  Dedykowany: {selectedMission.targetAgent}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={assigningAgent || selectedMission.assignedAgent || ''}
                  onChange={(e) => setAssigningAgent(e.target.value)}
                  className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="" disabled>Wybierz agenta z zespołu...</option>
                  {AGENTS.map((agent) => (
                    <option key={agent.name} value={agent.name}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleAssign(selectedMission.id, assigningAgent || selectedMission.assignedAgent || selectedMission.targetAgent)}
                  disabled={isAssigning}
                  className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold font-mono transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isAssigning ? 'Zapisuję...' : 'Zatwierdź'}
                </button>
              </div>

              {/* Status warning badge */}
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Status połączenia executora: Agent niepodłączony</span>
                  <p className="text-neutral-400 mt-0.5 leading-normal">
                    Przypisanie zapisuje delegację odpowiedzialności w <code className="text-amber-200">missions.json</code>. Rzeczywiste uruchomienie wymaga aktywnego procesu roboczego.
                  </p>
                </div>
              </div>
            </div>

            {/* Mission Start Execution Button */}
            <div className="space-y-2">
              <button
                onClick={() => handleStartMission(selectedMission.id)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Uruchom Misję #{selectedMission.number} (Protokół Wykonawczy)</span>
              </button>
              <p className="text-[10px] text-neutral-500 text-center font-mono">
                Wywołuje endpoint POST /api/missions/{selectedMission.id}/start (zwraca 409 w przypadku braku aktywnego daemona).
              </p>
            </div>

            {/* Audit Logs for Mission */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  Dziennik Zdarzeń (Audit Logs):
                </span>
                <span>{selectedMission.logs?.length || 0} wpisów</span>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 p-2.5 rounded-lg bg-black/60 border border-neutral-800 text-[11px] font-mono">
                {selectedMission.logs && selectedMission.logs.length > 0 ? (
                  selectedMission.logs.map((log, idx) => (
                    <div key={idx} className="pb-1.5 mb-1.5 border-b border-neutral-800/80 last:border-none last:pb-0 last:mb-0">
                      <div className="text-neutral-500 text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.timestamp).toLocaleString('pl-PL')}</span>
                      </div>
                      <p className="text-neutral-300 mt-0.5 leading-relaxed">
                        {log.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-500 text-center py-2">Brak wpisów w dzienniku.</div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Footer / Epic Reference */}
      <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>
            Wszystkie 9 misji powiązanych jest z głównym wątkiem planistycznym na GitHubie:
          </span>
        </div>
        <a
          href="https://github.com/mmitek515-netizen/Testowe/issues/1"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-cyan-300 font-mono text-xs transition-colors shrink-0"
        >
          <span>Epic Issue #1: Testowe Architecture</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

    </div>
  );
}
