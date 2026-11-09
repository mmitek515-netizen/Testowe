import React, { useState } from 'react';
import { Copy, Delete, RotateCcw } from 'lucide-react';
import { encodeMashy } from '../core/mashyCode';
import { MashyGlyph, MashyValue, MASHY_KEYBOARD } from './MashyCode';

/** Mashy-only visual input; machine digits are kept private in component state. */
export default function MashyCodePanel() {
  const [value, setValue] = useState('1236');
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(encodeMashy(value));
    setCopied(true);
  }
  return (
    <section aria-label="Kod Mashy — wyłączny wizualny zapis liczb"
      className="rounded-xl border border-amber-700/40 bg-neutral-950/85 p-4 space-y-3">
      <div className="flex gap-2 items-center justify-between flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-amber-200">Kod MASHY · systemowy zapis wizualny</h2>
          <p className="text-[11px] text-neutral-400">
            Jeden symbol ma trzy kreski. Wzorzec z notatki: łuk, pozioma, ukośna.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" title="Usuń ostatni znak" aria-label="Usuń ostatni znak kodu Mashy"
            onClick={() => { setValue(v => v.slice(0, -1)); setCopied(false); }}
            className="rounded-lg p-2 border border-neutral-700 text-neutral-200">
            <Delete className="h-4 w-4" />
          </button>
          <button type="button" title="Wyczyść kod Mashy" aria-label="Wyczyść kod Mashy"
            onClick={() => { setValue(''); setCopied(false); }}
            className="rounded-lg p-2 border border-neutral-700 text-neutral-200">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => { void copy(); }} disabled={!value}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-700/50 px-2 py-2 text-amber-200 disabled:opacity-40 text-xs">
            <Copy className="h-4 w-4" /> {copied ? 'Skopiowano' : 'Kopiuj Mashy'}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 min-h-[67px] flex-wrap rounded-lg border border-neutral-800 bg-black/60 p-3 text-amber-400"
        aria-live="polite">
        {value ? <MashyValue value={value} size={27} /> :
          <span className="text-neutral-500 text-xs">Wybierz symbole z klawiatury Mashy</span>}
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2" role="group" aria-label="Klawiatura symboli Mashy">
        {MASHY_KEYBOARD.map(digit => (
          <button type="button" key={digit}
            aria-label={'Wstaw znak Mashy ' + encodeMashy(digit)}
            onClick={() => { setValue(v => v.length < 32 ? v + digit : v); setCopied(false); }}
            className="flex items-center justify-center rounded-lg bg-neutral-900 border border-neutral-700 hover:border-amber-500 text-amber-300 p-2">
            <MashyGlyph digit={digit} size={18} />
          </button>
        ))}
      </div>
      <p className="text-[11px] text-neutral-500">
        MASHY-V1 jest zapisem prezentacyjnym, nie szyfrem. Linux, baza danych i protokoły nadal używają
        liczb maszynowych, a interfejs przedstawia je jako znaki Mashy.
      </p>
    </section>
  );
}
