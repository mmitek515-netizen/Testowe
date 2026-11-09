import React, { useState } from 'react';
import { History, Plus, Sparkles, Check, Clock } from 'lucide-react';
import { ChronoEntry } from '../core/svlEngine';

interface Props {
  history: ChronoEntry[];
  onAddEntry: (entry: ChronoEntry) => void;
}

export default function ChronoTimeline({ history, onAddEntry }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion || !newDesc) return;

    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    onAddEntry({
      wersja: newVersion.trim(),
      typ: 'Kognitywna SI',
      opis: newDesc.trim(),
      data: dateStr,
    });

    setNewVersion('');
    setNewDesc('');
    setShowAddForm(false);
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">
              Rejestr Chrono (SI Core History)
            </h3>
            <p className="text-xs text-neutral-400">
              Ewolucja matryc behawioralnych i protokołów ochronnych ({history.length} wpisów)
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Dodaj wpis</span>
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="text-xs font-semibold text-purple-300">Rejestracja nowej epoki kognitywnej</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Wersja (np. 5.6.0-QuantumWheel)"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-purple-500"
              required
            />
            <input
              type="text"
              placeholder="Opis aktualizacji"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-xs text-neutral-400 hover:text-white"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
            >
              Zapisz w rejestrze
            </button>
          </div>
        </form>
      )}

      {/* Timeline items */}
      <div className="relative mt-5 pl-6 border-l-2 border-neutral-800 space-y-5">
        {history.map((item, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline node */}
            <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-purple-500 border-4 border-neutral-900 group-hover:scale-125 transition-transform" />

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-purple-500/40 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-purple-300">
                    {item.wersja}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/40">
                    {item.typ}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-500">
                  <Clock className="w-3 h-3" />
                  <span>{item.data}</span>
                </div>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {item.opis}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
