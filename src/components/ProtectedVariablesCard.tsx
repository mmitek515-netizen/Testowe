import React, { useState } from 'react';
import { ShieldCheck, Lock, Unlock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SVLProtectedVariable } from '../core/svlEngine';

interface Props {
  operatorVar: SVLProtectedVariable;
  sysVersionVar: SVLProtectedVariable;
  onUpdate: () => void;
}

export default function ProtectedVariablesCard({ operatorVar, sysVersionVar, onUpdate }: Props) {
  const [tokenInput, setTokenInput] = useState('');
  const [targetVar, setTargetVar] = useState<'OPERATOR' | 'SYS_VERSION'>('OPERATOR');
  const [newValueInput, setNewValueInput] = useState('');
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApplyUpdate = () => {
    const target = targetVar === 'OPERATOR' ? operatorVar : sysVersionVar;
    const success = target.update_protected_value(tokenInput.trim(), newValueInput.trim());

    if (success) {
      setResultMsg({
        type: 'success',
        text: `Sukces! Zaktualizowano zmienną chronioną ${targetVar} na "${newValueInput}". Autoryzacja OMNIKLUCZ przyjęta.`,
      });
      setNewValueInput('');
      onUpdate();
    } else {
      setResultMsg({
        type: 'error',
        text: `Odmowa dostępu! Niepoprawny token autoryzacji (${tokenInput || 'pusty'}). Pancerz SVL zablokował modyfikację tożsamości. Wymagany: 364_OMNIKLUCZ_ROOT.`,
      });
    }
  };

  const handleFillMasterKey = () => {
    setTokenInput('364_OMNIKLUCZ_ROOT');
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                SVLProtectedVariable Core
              </h3>
              <p className="text-xs text-neutral-400">
                Pancerz obronny i ochrona tożsamości agentów przed rotacją błędów (v5.2.0)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
            SECURITY: MAXIMUM
          </span>
        </div>

        {/* Current variables state */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">Zmienna: OPERATOR</span>
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-sm font-semibold text-neutral-100 font-mono">
              {operatorVar.value}
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-neutral-800/60">
              <span>Scope: {operatorVar.scope.scope_mode}</span>
              <span className="text-emerald-400">Locked: TRUE</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">Zmienna: SYS_VERSION</span>
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-sm font-semibold text-neutral-100 font-mono">
              {sysVersionVar.value}
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-neutral-800/60">
              <span>Scope: {sysVersionVar.scope.scope_mode}</span>
              <span className="text-emerald-400">Locked: TRUE</span>
            </div>
          </div>
        </div>

        {/* Interactive Authentication Form */}
        <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Protokół aktualizacji wartości chronionej
            </span>
            <button
              onClick={handleFillMasterKey}
              className="text-[11px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Wklej OMNIKLUCZ_ROOT
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                Zmienna docelowa
              </label>
              <select
                value={targetVar}
                onChange={(e) => setTargetVar(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                <option value="OPERATOR">OPERATOR</option>
                <option value="SYS_VERSION">SYS_VERSION</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                Nowa wartość
              </label>
              <input
                type="text"
                placeholder={targetVar === 'OPERATOR' ? 'np. Jan Kowalski' : 'np. 5.7.0-Alpha'}
                value={newValueInput}
                onChange={(e) => setNewValueInput(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                Token autoryzacyjny
              </label>
              <input
                type="text"
                placeholder="Token OMNIKLUCZ"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            onClick={handleApplyUpdate}
            disabled={!newValueInput.trim()}
            className={`w-full py-2 px-4 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              newValueInput.trim()
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Wykonaj update_protected_value(token, new_value)</span>
          </button>

          {resultMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                resultMsg.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
              }`}
            >
              {resultMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{resultMsg.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
