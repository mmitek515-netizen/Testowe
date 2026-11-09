import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Server } from 'lucide-react';
import { MashyValue } from './MashyCode';

type RuntimeState = 'online' | 'offline' | 'not-configured';
type DebianStatus = {
  state: RuntimeState;
  configured: boolean;
  checkedAt: string;
  message?: string;
  effectiveUid?: number | null;
  workspaceWritable?: boolean;
  modelProviderConfigured?: boolean;
  modelInferenceVerified?: boolean;
  modelLastProbedAt?: string | null;
  modelLastProbedName?: string | null;
  taskEntriesShown?: number;
  workersRunning?: number;
  originalAgentsVerified?: boolean;
};

export default function Debian13StatusCard() {
  const [status, setStatus] = useState<DebianStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [probeBusy, setProbeBusy] = useState(false);
  const [probeMessage, setProbeMessage] = useState('');

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/debian13/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('Backend SVL niedostępny: HTTP ' + response.status);
      const data: DebianStatus = await response.json();
      if (!['online', 'offline', 'not-configured'].includes(data.state)) {
        throw new Error('Nieznany status usługi Debian 13.');
      }
      setStatus(data);
      setError('');
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Błąd połączenia');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 20000);
    return () => clearInterval(interval);
  }, [refresh]);

  const runProbe = async () => {
    setProbeBusy(true);
    setProbeMessage('');
    try {
      const response = await fetch('/api/debian13/probe', { method: 'POST' });
      const data = await response.json();
      setProbeMessage(data.message || (response.ok ? 'Test wykonany.' : 'Test nie powiódł się.'));
      await refresh();
    } catch (err) {
      setProbeMessage(err instanceof Error ? err.message : 'Nie można wykonać testu modelu.');
    } finally {
      setProbeBusy(false);
    }
  };

  const online = status?.state === 'online';
  const stateLabel = online ? 'ONLINE' : status?.state === 'not-configured'
    ? 'NIESKONFIGUROWANY' : status?.state === 'offline' ? 'OFFLINE' : 'SPRAWDZANIE';
  return (
    <section aria-label="Stan usługi Debian 13" className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 space-y-3 text-xs">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-200 font-semibold">
          <Server className="w-4 h-4 text-cyan-400" />
          Debian <MashyValue value={13} /> · System API
          <span className={online ? 'text-emerald-400' : 'text-amber-300'}>{stateLabel}</span>
          {online ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
        </div>
        <button type="button" onClick={() => { void refresh(); }} disabled={busy}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-neutral-700 hover:bg-neutral-800 disabled:opacity-50">
          <RefreshCw className={'w-3 h-3 ' + (busy ? 'animate-spin' : '')} /> Odśwież status
        </button>
      </div>
      {online ? (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4 font-mono text-neutral-300">
          <span>UID: <MashyValue value={status?.effectiveUid ?? '?'} /></span>
          <span>SQLite: <MashyValue value={status?.taskEntriesShown ?? 0} /> wpisów (maks. <MashyValue value={100} />)</span>
          <span>Workery: <MashyValue value={status?.workersRunning ?? 0} /></span>
          <span>Model API: {status?.modelProviderConfigured ? 'skonfigurowane' : 'brak'}</span>
        </div>
      ) : (
        <div className="flex gap-2 text-amber-200">
          <Activity className="w-4 h-4 shrink-0" />
          <span>{error || status?.message || 'Trwa sprawdzanie dostępności usługi...'}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" disabled={!online || !status?.modelProviderConfigured || probeBusy}
          onClick={() => { void runProbe(); }}
          className="rounded-lg border border-cyan-800 px-3 py-1.5 text-cyan-200 hover:bg-cyan-950/50 disabled:opacity-40">
          {probeBusy ? 'Trwa test Ollamy...' : 'Sprawdź odpowiedź Ollamy'}
        </button>
        <span className={status?.modelInferenceVerified ? 'text-emerald-300' : 'text-neutral-400'}>
          Inferencja: {status?.modelInferenceVerified ? 'potwierdzona odpowiedź' : 'niepotwierdzona'}
        </span>
        {status?.modelLastProbedName && status.modelInferenceVerified && <span className="text-neutral-500 font-mono"><MashyValue value={status.modelLastProbedName} /></span>}
      </div>
      {probeMessage && <p role="status" className="text-cyan-200">{probeMessage}</p>}
      <div className="text-[11px] text-neutral-500">
        Status dotyczy usługi API, nie uruchomienia systemu z dysku. Weryfikacja tożsamości oryginalnych agentów: brak.
        {status?.checkedAt ? <> Ostatnia próba: <MashyValue value={new Date(status.checkedAt).toLocaleTimeString('pl-PL')} /></> : ''}
      </div>
    </section>
  );
}
