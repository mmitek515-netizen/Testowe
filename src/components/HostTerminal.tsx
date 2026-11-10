import React, { useMemo, useState } from 'react';
import { BinaryHyperspaceKernel } from '../core/hyperos';
import { AlertTriangle, CheckCircle2, Cpu, KeyRound, Play, RefreshCw, Send, Terminal, Trash2 } from 'lucide-react';

type CliStatus = {
  enabled: boolean;
  uid: number | null;
  isRoot: boolean;
  scope: string;
  cwd: string;
  executable: string;
};
type CliResult = {
  stdout: string; stderr: string; exitCode: number | null; timedOut: boolean;
  truncated: boolean; durationMs: number; uid: number | null; isRoot: boolean; scope: string;
};
type Entry = { command: string; result: CliResult; date: string };

async function apiJson(url: string, token: string, command?: string): Promise<any> {
  const response = await fetch(url, {
    method: command === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Host-CLI-Token': token },
    body: command === undefined ? undefined : JSON.stringify({ command }),
    cache: 'no-store',
  });
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new Error('Brak API terminala. Wymagany backend Node, nie sam hosting statyczny.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'HTTP ' + response.status);
  return data;
}

function shellSuggestion(text: string): string {
  const fence = text.match(new RegExp('```(?:bash|sh|shell)?\\s*([\\s\\S]*?)```', 'i'));
  return (fence?.[1] || text).trim().replace(/^\\$\\s*/, '').trim();
}

export default function HostTerminal({ hyperspace = false }: { hyperspace?: boolean }) {
  const kernel = useMemo(() => new BinaryHyperspaceKernel(), []);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<CliStatus | null>(null);
  const [command, setCommand] = useState('id && uname -a');
  const [instruction, setInstruction] = useState('Sprawdź wersję kernela, system i uprawnienia.');
  const [provider, setProvider] = useState<'ollama' | 'gemini'>('ollama');
  const [suggested, setSuggested] = useState(false);
  const [history, setHistory] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [error, setError] = useState('');
  const phrase = hyperspace ? instruction : command;
  const analysis = useMemo(() => kernel.resolveIntent(phrase), [kernel, phrase]);
  const vector = useMemo(() => kernel.textToHyperspaceVector(phrase).join(''), [kernel, phrase]);
  const hostRoot = status?.isRoot === true && status.scope === 'linux-host-root';

  async function connect() {
    setBusy(true);
    setError('');
    try {
      setStatus(await apiJson('/api/host-cli/status', token.trim()) as CliStatus);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function run(cmd: string) {
    if (!cmd.trim() || busy) return;
    if (!status) { setError('Najpierw połącz API terminala.'); return; }
    setBusy(true);
    setError('');
    try {
      const result = await apiJson('/api/host-cli/run', token.trim(), cmd) as CliResult;
      setHistory(previous => [...previous, { command: cmd, result, date: new Date().toLocaleTimeString('pl-PL') }].slice(-60));
      if (result.scope !== status.scope || result.uid !== status.uid) setStatus(null);
      setSuggested(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function interpret() {
    if (!instruction.trim() || interpreting) return;
    setInterpreting(true);
    setError('');
    setSuggested(false);
    try {
      const prompt = [
        'Jesteś generatorem komend Bash dla Debiana 13.',
        'Przepisz intencję operatora jako skrypt Bash. Zwróć TYLKO komendę lub blok bash.',
        'Nie twierdź, że kod został wykonany. Nie fałszuj wyniku.',
        'Przy niejasnym poleceniu wybierz diagnostykę tylko do odczytu.',
        'Zadanie: ' + instruction,
      ].join('\\n');
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ personaId: 'alex', message: prompt, provider, stream: false, history: [] }),
      });
      if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Brak serwera NLP.');
      const data = await response.json();
      if (!response.ok || typeof data.text !== 'string') throw new Error(data.error || 'Model nie zwrócił komendy.');
      const suggestion = shellSuggestion(data.text);
      if (!suggestion) throw new Error('Model nie wygenerował komendy.');
      setCommand(suggestion);
      setSuggested(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setInterpreting(false);
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#071225] text-slate-100 shadow-[0_16px_48px_rgba(0,0,0,.35)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-300/15 bg-[#0c1a32] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-950/40 text-cyan-300">{hyperspace ? <Cpu size={20}/> : <Terminal size={20}/>}</span>
          <div>
            <h2 className="text-sm font-semibold text-white">{hyperspace ? 'Terminal binarnej hiperprzestrzeni' : 'Konsola Bash · Linux CLI'}</h2>
            <p className="text-[11px] font-mono text-slate-400">{hyperspace ? 'SVL_System · 128-bitowy BinaryHyperspaceKernel + NLP' : 'Wykonywanie prawdziwych poleceń powłoki'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
          <span className="rounded-lg border border-cyan-300/20 bg-cyan-950/20 px-2 py-1 text-cyan-200">{status ? 'UID ' + String(status.uid ?? '?') : 'NIEPOŁĄCZONA'}</span>
          <span className={'rounded-lg border px-2 py-1 ' + (hostRoot ? 'border-emerald-400/40 bg-emerald-950/30 text-emerald-300' : 'border-amber-400/30 bg-amber-950/20 text-amber-200')}>
            {hostRoot ? 'POTWIERDZONY ROOT HOSTA' : status?.isRoot ? 'ROOT RUNTIME · NIE HOST' : 'ROOT HOSTA NIEPOTWIERDZONY'}
          </span>
        </div>
      </header>

      <div className="space-y-3 border-b border-cyan-300/10 p-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex flex-col gap-1.5 text-[11px] text-slate-400">
            Token operatora konsoli (nie jest zapisywany)
            <span className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3">
              <KeyRound size={15} className="shrink-0 text-cyan-400"/>
              <input type="password" autoComplete="off" value={token} onChange={e => { setToken(e.target.value); setStatus(null); }} placeholder="HOST_CLI_TOKEN" className="w-full min-w-0 bg-transparent py-2.5 text-sm text-slate-100 outline-none" />
            </span>
          </label>
          <button type="button" disabled={busy || !token.trim()} onClick={() => void connect()} className="flex items-center justify-center gap-2 self-end rounded-lg border border-cyan-400/30 bg-cyan-900/40 px-4 py-2.5 text-xs text-cyan-100 disabled:opacity-40">
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''}/> Połącz
          </button>
        </div>
        {status && <p className="break-all text-[11px] font-mono text-slate-400">Powłoka: {status.executable} · Zakres: {status.scope} · Katalog: {status.cwd}</p>}

        {hyperspace && (
          <div className="space-y-2 rounded-xl border border-violet-400/20 bg-violet-950/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-violet-200">
              <span>Analiza wektora wejściowego · 128 bit</span>
              <span>Hamming: {analysis.intent} ({(analysis.score * 100).toFixed(1)}%)</span>
            </div>
            <code className="block break-all rounded bg-slate-950 p-2 font-mono text-[10px] leading-relaxed tracking-widest text-cyan-300">{vector}</code>
            <p className="text-[10px] text-slate-400">Wektor klasyfikuje polecenia; nie zastępuje jądra Linux ani powłoki.</p>
            <textarea rows={2} value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="Opisz zadanie po polsku..." className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-cyan-500"/>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-400" htmlFor="nlp-provider">NLP</label>
              <select id="nlp-provider" value={provider} onChange={e => setProvider(e.target.value as 'ollama' | 'gemini')} className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs">
                <option value="ollama">Ollama · 11B Vision</option><option value="gemini">Gemini · serwer</option>
              </select>
              <button type="button" onClick={() => void interpret()} disabled={interpreting || !instruction.trim()} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold disabled:opacity-40">
                <Send size={14}/>{interpreting ? 'Analiza...' : 'Przygotuj komendę NLP'}
              </button>
            </div>
            {suggested && <p className="flex items-center gap-2 text-[11px] text-amber-300"><CheckCircle2 size={14}/> AI przygotowało komendę. Sprawdź ją przed wykonaniem.</p>}
          </div>
        )}

        <label className="block text-[11px] text-slate-400" htmlFor="linux-command">Polecenie Bash (działa tylko po podłączeniu backendu)</label>
        <form onSubmit={e => { e.preventDefault(); void run(command); }} className="flex flex-col gap-2 sm:flex-row">
          <span className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-black/70 px-3">
            <span className="font-mono text-xs text-emerald-400">{hostRoot ? 'root@host#' : '$'}</span>
            <input id="linux-command" value={command} onChange={e => setCommand(e.target.value)} autoComplete="off" spellCheck={false} className="min-w-0 w-full bg-transparent py-3 font-mono text-sm text-slate-100 outline-none" />
          </span>
          <button type="submit" disabled={busy || !command.trim() || !status} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-xs font-bold text-slate-950 disabled:opacity-40">
            <Play size={15}/> {busy ? 'Wykonywanie...' : 'Wykonaj'}
          </button>
        </form>
        {error && <p role="alert" className="flex items-start gap-2 text-xs text-rose-300"><AlertTriangle size={15} className="shrink-0"/>{error}</p>}
      </div>

      <div className="min-h-[220px] max-h-[520px] space-y-3 overflow-y-auto bg-[#030816] p-4 font-mono text-xs">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>HISTORIA WYKONANIA · {history.length} WYNIKÓW</span>
          <button type="button" onClick={() => setHistory([])} className="inline-flex items-center gap-1 hover:text-white"><Trash2 size={12}/> Wyczyść</button>
        </div>
        {history.length === 0 && <p className="text-slate-500">Brak wykonanych poleceń. Wyniki będą pochodzić z prawdziwej powłoki.</p>}
        {history.map((entry, i) => (
          <article key={i} className="border-b border-slate-800/50 pb-3">
            <div className="flex items-start gap-2 break-all text-emerald-400"><span>$</span><span>{entry.command}</span><span className="ml-auto shrink-0 text-slate-600">{entry.date}</span></div>
            {entry.result.stdout && <pre className="whitespace-pre-wrap break-words text-slate-200">{entry.result.stdout}</pre>}
            {entry.result.stderr && <pre className="whitespace-pre-wrap break-words text-rose-300">{entry.result.stderr}</pre>}
            <p className="mt-1 text-[10px] text-slate-500">exit={String(entry.result.exitCode)} · {entry.result.durationMs}ms · UID={String(entry.result.uid)} · {entry.result.scope}{entry.result.timedOut ? ' · TIMEOUT' : ''}{entry.result.truncated ? ' · WYNIK OBCIĘTY' : ''}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
