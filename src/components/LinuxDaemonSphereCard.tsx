import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, ServerCog } from 'lucide-react';
import { MashyValue } from './MashyCode';

type Sensor = {
  connected: boolean;
  origin?: 'linux-host' | 'observer-process-namespace' | 'unavailable';
  scope?: string;
  observedAt?: string;
  total?: number;
  truncated?: boolean;
  unreadable?: number;
  error?: string;
  counts?: { active: number; inactive: number; failed: number; other: number };
};
type LinuxSphere = {
  state: 'online' | 'partial' | 'offline';
  sphereId: string | null;
  observedAt?: string;
  hostBridge?: 'fresh' | 'stale-or-unavailable' | 'not-configured';
  hostSnapshotId?: string | null;
  services: Sensor;
  processes: Sensor;
  note?: string;
};
const views = [
  { key: 'active', title: 'Aktywne', color: 'text-emerald-300' },
  { key: 'inactive', title: 'Nieaktywne', color: 'text-slate-300' },
  { key: 'failed', title: 'Błędy', color: 'text-red-300' },
  { key: 'other', title: 'Pozostałe', color: 'text-amber-300' },
] as const;

export default function LinuxDaemonSphereCard() {
  const [sphere, setSphere] = useState<LinuxSphere | null>(null);
  const [selected, setSelected] = useState<(typeof views)[number]['key']>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/spaa/linux', { cache: 'no-store' });
      if (!response.ok) throw new Error('Brak łączności z obserwatorem Linuxa');
      const result = await response.json() as LinuxSphere;
      if (!result.services || !result.processes) throw new Error('Nieprawidłowa telemetria');
      setSphere(result);
      setError('');
    } catch (e) {
      setSphere(null);
      setError(e instanceof Error ? e.message : 'Brak danych');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const services = sphere?.services;
  const processes = sphere?.processes;
  const ready = services?.connected === true;
  const hostVisible = services?.origin === 'linux-host';
  const selectedView = views.find(x => x.key === selected) || views[0];
  return (
    <section aria-label="Sfera wszystkich widocznych demonów Linuxa"
      className="rounded-xl border border-cyan-900/60 bg-[#09101e] p-4 space-y-4">
      <header className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-cyan-200 font-semibold">
          <ServerCog size={18} />
          Sfera demonów Linux / systemd
          <span className={ready ? 'text-emerald-300 text-xs' : 'text-amber-300 text-xs'}>
            {ready ? (hostVisible ? 'HOST LINUX ONLINE' : 'ODCZYT LOKALNY') : 'NIEPOTWIERDZONE'}
          </span>
        </div>
        <button type="button" disabled={loading} onClick={() => { void refresh(); }}
          className="rounded-lg border border-cyan-900 px-3 py-1.5 text-xs text-cyan-200 disabled:opacity-40">
          <RefreshCw className={'inline mr-1 h-3 w-3 ' + (loading ? 'animate-spin' : '')} />
          Odśwież
        </button>
      </header>
      <p className="text-xs text-slate-400">
        Każda wykryta usługa systemd jest osobnym węzłem obserwacyjnym w jednej wspólnej sferze SPAA.
        Czujniki działają równolegle, bez zatrzymywania lub modyfikowania demonów Linuxa.
        {' '}Źródło: {hostVisible ? 'rzeczywisty host systemd' : services?.connected ? 'przestrzeń obserwatora / kontener' : 'brak potwierdzenia hosta'}.
      </p>
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        {views.map(view => (
          <button key={view.key} type="button" onClick={() => setSelected(view.key)}
            aria-pressed={selected === view.key}
            className={'text-left rounded-lg border px-3 py-3 bg-slate-900/60 ' +
              (selected === view.key ? 'border-cyan-400' : 'border-slate-800')}>
            <span className="block text-xs text-slate-400">{view.title}</span>
            <span className={'block mt-1 text-lg font-semibold ' + view.color}>
              {ready && services?.counts ? <MashyValue value={services.counts[view.key]} /> : '—'}
            </span>
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-900/70 p-3 border border-slate-800 text-sm space-y-2">
        <div className="flex items-center gap-2 text-cyan-300">
          <Activity size={16} />
          {selectedView.title}: {ready && services?.counts ?
            <MashyValue value={services.counts[selected]} /> : 'brak pomiaru'}
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-300">
          <span>Usługi systemd: {ready && services?.total !== undefined ?
            <MashyValue value={services.total} /> : 'nieodczytane'}</span>
          <span>Procesy widoczne w przestrzeni PID: {processes?.connected && processes.total !== undefined ?
            <MashyValue value={processes.total} /> : 'nieodczytane'}</span>
          <span>Sfera: {sphere?.sphereId ? <MashyValue value={sphere.sphereId.slice(0, 8)} /> : 'brak'}</span>
          <span>Most hosta: {sphere?.hostBridge === 'fresh' ? 'aktualny' : sphere?.hostBridge === 'stale-or-unavailable' ? 'nieaktualny / niedostępny' : 'niepodłączony'}</span>
          <span>Próbka: {sphere?.observedAt ?
            <MashyValue value={new Date(sphere.observedAt).toLocaleTimeString('pl-PL')} /> : 'brak'}</span>
        </div>
      </div>
      {services?.truncated || processes?.truncated ? (
        <p className="text-xs text-amber-300">Wykaz jest ograniczony limitem węzłów; licznik obejmuje wszystkie znalezione wpisy.</p>
      ) : null}
      <p className="text-xs text-slate-500">
        {error || (hostVisible ? 'Odczyt hostowego systemd potwierdzony świeżą próbką.' :
          'Brak potwierdzonego odczytu hostowego systemd; wynik może pochodzić wyłącznie z kontenera.')}
        {' '}Procesy: {processes?.origin === 'linux-host' ? 'host Linux' : 'lokalna przestrzeń PID obserwatora'}.
        Wspólny stan nie zmienia kodu ani uprawnień natywnych demonów.
      </p>
    </section>
  );
}
