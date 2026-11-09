import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, CircleAlert, CheckCircle2 } from 'lucide-react';

type SPAAWorker = {
  name: string;
  state: string;
  online: boolean;
  capabilities: string[];
  lastSeen: string | null;
  sphereId: string | null;
  originalIdentityVerified: false;
};
type SPAAStatus = {
  state: 'online' | 'offline';
  spherical: boolean;
  polymorphic: boolean;
  asynchronous: boolean;
  asymmetric: boolean;
  workers: SPAAWorker[];
  sphere?: { sphereId: string; observedAt: string; sourceCount: number; healthySources: number } | null;
  note?: string;
};

export default function SPAAStatusCard() {
  const [status, setStatus] = useState<SPAAStatus | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/spaa/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('Backend SVL nie odpowiada');
      const payload = await response.json() as SPAAStatus;
      if (!Array.isArray(payload.workers)) throw new Error('Błędny kontrakt SPAA');
      setStatus(payload);
      setError('');
    } catch (exc) {
      setStatus(null);
      setError(exc instanceof Error ? exc.message : 'Błąd odczytu SPAA');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const connected = status?.state === 'online';
  return (
    <section aria-label="Centrum sferycznych demonów i workerów SPAA"
      className="rounded-xl border border-neutral-800 bg-neutral-950/85 p-4 space-y-3 text-xs">
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div className="flex items-center gap-2 font-semibold text-neutral-100">
          <Activity className="h-4 w-4 text-cyan-300" />
          Demony i Workery SPAA
          <span className={connected ? 'text-emerald-300' : 'text-amber-300'}>
            {connected ? 'ONLINE' : 'NIEPODŁĄCZONE'}
          </span>
          {connected ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
            <CircleAlert className="h-4 w-4 text-amber-400" />}
        </div>
        <button type="button" disabled={refreshing}
          onClick={() => { void refresh(); }}
          className="flex items-center gap-1 rounded-lg border border-neutral-700 px-2 py-1.5 hover:bg-neutral-800 disabled:opacity-40">
          <RefreshCw className={'h-3 w-3 ' + (refreshing ? 'animate-spin' : '')} />
          Synchronizuj widok
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        {['Sferyczne', 'Polimorficzne', 'Asymetryczne', 'Asynchroniczne'].map(label => (
          <span key={label} className="border border-cyan-900 rounded-md px-2 py-1 text-cyan-200">{label}</span>
        ))}
      </div>
      {connected && status?.sphere ? (
        <div className="grid gap-2 sm:grid-cols-3 rounded-lg bg-neutral-900/70 p-3 font-mono text-neutral-300">
          <span>Sfera: {status.sphere.sphereId.slice(0, 8)}</span>
          <span>Źródła: {status.sphere.healthySources}/{status.sphere.sourceCount}</span>
          <span>Aktualizacja: {new Date(status.sphere.observedAt).toLocaleTimeString('pl-PL')}</span>
        </div>
      ) : <p className="text-amber-200">{error || 'Brak aktualnej sfery. Sprawdź kontener agent-rest.'}</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(status?.workers?.length ? status.workers :
          ['Aria', 'Alex', 'Astyria', 'Aurelius'].map(name => ({
            name, state: 'unavailable', online: false,
            capabilities: [], sphereId: null, lastSeen: null, originalIdentityVerified: false as const
          }))).map(worker => (
          <div key={worker.name} className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-3 space-y-1">
            <div className="flex justify-between gap-2 font-semibold">
              <span>{worker.name}</span>
              <span className={worker.online ? 'text-emerald-300' : 'text-amber-300'}>{worker.state}</span>
            </div>
            <p className="text-neutral-400 break-words">
              {worker.capabilities.length ? worker.capabilities.join(' · ') : 'Brak potwierdzonych funkcji'}
            </p>
            <p className="text-neutral-500 font-mono">
              Sfera zadania: {worker.sphereId?.slice(0, 8) || 'brak'}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-neutral-500">
        Każdy lokalny worker korzysta z tej samej sfery podłączonych źródeł. Nazwy agentów są etykietami routingu;
        nie potwierdzono połączenia z oryginalnymi zewnętrznymi agentami. Brak dostępu do niepodłączonych systemów.
      </p>
    </section>
  );
}
