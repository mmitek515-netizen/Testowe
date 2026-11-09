import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, CircleAlert, CheckCircle2 } from 'lucide-react';
import { MashyValue } from './MashyCode';

type SPAAWorker = {
  name: string;
  state: string;
  online: boolean;
  capabilities: string[];
  lastSeen: string | null;
  sphereId: string | null;
  originalIdentityVerified: false;
};
type MeshMember = { name: string; online: boolean; capabilities: string[]; pendingMessages: number; sphereId: string | null };
type MeshEdge = { from: string; to: string; available: boolean };
type SPAAMesh = {
  state: 'online' | 'offline';
  sphereId: string | null;
  directedLinks: number;
  members: MeshMember[];
  edges: MeshEdge[];
  messagesStored: number;
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
  const [mesh, setMesh] = useState<SPAAMesh | null>(null);
  const [selectedPeer, setSelectedPeer] = useState('Aria');
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
      try {
        const meshReply = await fetch('/api/spaa/mesh', { cache: 'no-store' });
        if (!meshReply.ok) throw new Error('Mesh nie odpowiada');
        const topology = await meshReply.json() as SPAAMesh;
        if (!Array.isArray(topology.edges) || !Array.isArray(topology.members)) throw new Error('Mesh niepoprawny');
        setMesh(topology);
      } catch {
        setMesh(null);
      }
      setError('');
    } catch (exc) {
      setStatus(null);
      setMesh(null);
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
          <span>Sfera: <MashyValue value={status.sphere.sphereId.slice(0, 8)} /></span>
          <span>Źródła: <MashyValue value={status.sphere.healthySources} /> / <MashyValue value={status.sphere.sourceCount} /></span>
          <span>Aktualizacja: <MashyValue value={new Date(status.sphere.observedAt).toLocaleTimeString('pl-PL')} /></span>
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
              Sfera zadania: {worker.sphereId ? <MashyValue value={worker.sphereId.slice(0, 8)} /> : 'brak'}
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-800 pt-4 space-y-3">
        <div className="flex justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-neutral-200">Wspólna sfera · połączenia każdy z każdym</h3>
          <span className={mesh?.state === 'online' ? 'text-emerald-300' : 'text-amber-300'}>
            {mesh?.state === 'online' ? <><MashyValue value={mesh.directedLinks} /> / <MashyValue value={12} /> kierunków skonfigurowanych</> : 'Siatka niepotwierdzona'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['Aria', 'Alex', 'Astyria', 'Aurelius'].map(name => {
            const member = mesh?.members.find(x => x.name === name);
            return (
              <button key={name} type="button" onClick={() => setSelectedPeer(name)}
                aria-pressed={selectedPeer === name}
                className={'rounded-lg border p-3 text-left transition-colors ' + (
                  selectedPeer === name ? 'border-cyan-600 bg-cyan-950/30' :
                  'border-neutral-800 bg-neutral-900/70 hover:border-neutral-600'
                )}>
                <span className="font-semibold">{name}</span>
                <span className={'block text-[11px] mt-1 ' + (member?.online ? 'text-emerald-400' : 'text-amber-300')}>
                  {member?.online ? 'Worker dostępny' : 'Niepotwierdzony'}
                </span>
                <span className="block text-neutral-500 mt-1">Oczekujące: {member ? <MashyValue value={member.pendingMessages} /> : '—'}</span>
              </button>
            );
          })}
        </div>
        <div className="rounded-lg bg-neutral-900/70 border border-neutral-800 p-3 space-y-2">
          <p className="text-neutral-200">Trasy wiadomości: <strong>{selectedPeer}</strong></p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {['Aria', 'Alex', 'Astyria', 'Aurelius'].filter(name => name !== selectedPeer).map(peer => {
              const out = mesh?.edges.find(e => e.from === selectedPeer && e.to === peer);
              const incoming = mesh?.edges.find(e => e.from === peer && e.to === selectedPeer);
              return (
                <div key={peer} className="rounded-md border border-neutral-800 p-2 font-mono">
                  <span>{selectedPeer} ⇄ {peer}</span>
                  <span className={'block mt-1 ' + (out?.available && incoming?.available ? 'text-emerald-300' : 'text-amber-300')}>
                    {out?.available && incoming?.available ? <><MashyValue value={2} /> / <MashyValue value={2} /> kierunki aktywne</> : 'Trasa dostępna logicznie; połączenie niepotwierdzone'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-neutral-500 text-[11px]">
            Wspólna sfera: {mesh?.sphereId ? <MashyValue value={mesh.sphereId.slice(0, 8)} /> : 'brak'} · Zapisane przekazania: {mesh ? <MashyValue value={mesh.messagesStored} /> : '—'}.
            Komunikacja odbywa się przez trwałą kolejkę, bez automatycznej pętli odpowiedzi.
          </p>
        </div>
      </div>
      <p className="text-[11px] text-neutral-500">
        Każdy lokalny worker korzysta z tej samej sfery podłączonych źródeł. Nazwy agentów są etykietami routingu;
        nie potwierdzono połączenia z oryginalnymi zewnętrznymi agentami. Brak dostępu do niepodłączonych systemów.
      </p>
    </section>
  );
}
