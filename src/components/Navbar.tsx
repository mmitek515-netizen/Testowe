import React from 'react';
import { ShieldCheck, Activity, Terminal, ShieldAlert, Cpu, MessageSquare, Target, Orbit } from 'lucide-react';
import { MashyValue } from './MashyCode';

interface Props {
  activeTab: 'dashboard' | 'topology' | 'python' | 'chat' | 'missions' | 'audit' | 'terminal' | 'hyperspace';
  setActiveTab: (tab: 'dashboard' | 'topology' | 'python' | 'chat' | 'missions' | 'audit') => void;
  operatorName: string;
  sysVersion: string;
  onOpenAudit: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  operatorName,
  sysVersion,
  onOpenAudit,
}: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-cyan-300/15 bg-[#07101e]/95 backdrop-blur-xl">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & System Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/10">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm sm:text-base tracking-tight font-mono">
                  SVL KERNEL
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                  <MashyValue value={sysVersion} size={10} />
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Operator: <span className="text-neutral-200 font-mono">{operatorName}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Centrum Operacyjne
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-cyan-900/60 text-white border border-purple-500/40 shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Czat z AI</span>
            </button>
            <button
              onClick={() => setActiveTab('missions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'missions'
                  ? 'bg-gradient-to-r from-cyan-900/70 via-indigo-900/70 to-blue-900/70 text-white border border-cyan-500/40 shadow-sm'
                  : 'text-cyan-300 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>Misje AI (9)</span>
            </button>
            <button type="button" onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${activeTab === 'terminal' ? 'bg-cyan-950/70 text-cyan-100 border border-cyan-400/30' : 'text-slate-400 hover:text-cyan-200'}`}>
              <Terminal className="w-3.5 h-3.5"/> Konsola CLI
            </button>
            <button type="button" onClick={() => setActiveTab('hyperspace')}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${activeTab === 'hyperspace' ? 'bg-violet-950/60 text-violet-100 border border-violet-400/30' : 'text-slate-400 hover:text-violet-200'}`}>
              <Orbit className="w-3.5 h-3.5"/> Hiperprzestrzeń 128-bit
            </button>
            <button
              onClick={() => setActiveTab('topology')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'topology'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Silnik Topologiczny
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'python'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Kod Python (SVL CORE)
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-rose-950/70 text-rose-200 border border-rose-800/60 shadow-sm'
                  : 'text-rose-400/80 hover:text-rose-300'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Audyt Repozytorium</span>
            </button>
          </nav>

          {/* Right Status Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono">
              <span className="flex h-2 w-2 rounded-full bg-slate-500" />
              <span className="text-slate-400 hidden sm:inline">STATUS Z API</span>
              <span className="text-neutral-500">|</span>
              <span className="text-neutral-400">SVL</span>
            </div>
          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-neutral-800/60 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
            }`}
          >
            Pulpit
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap text-purple-300 ${
              activeTab === 'chat' ? 'bg-purple-950 text-white border border-purple-500/40' : ''
            }`}
          >
            Czat z AI
          </button>
          <button
            onClick={() => setActiveTab('missions')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap text-cyan-300 ${
              activeTab === 'missions' ? 'bg-cyan-950 text-white border border-cyan-500/40' : ''
            }`}
          >
            Misje AI
          </button>
          <button type="button" onClick={() => setActiveTab('terminal')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'terminal' ? 'bg-cyan-950 text-cyan-100' : 'text-cyan-300'}`}>Terminal CLI</button>
          <button type="button" onClick={() => setActiveTab('hyperspace')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'hyperspace' ? 'bg-violet-950 text-violet-100' : 'text-violet-300'}`}>HyperOS 128-bit</button>
          <button
            onClick={() => setActiveTab('topology')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'topology' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
            }`}
          >
            Topologia
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'python' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
            }`}
          >
            Kod Python
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap text-rose-400 ${
              activeTab === 'audit' ? 'bg-rose-950/80 text-rose-200' : ''
            }`}
          >
            Audyt Repo
          </button>
        </div>
      </div>
    </header>
  );
}
