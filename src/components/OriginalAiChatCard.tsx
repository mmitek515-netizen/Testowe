import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Shield, Zap, Music, Users, MessageSquare, Bot, User, RefreshCw, Cpu, Server, CheckCircle2, XCircle, Settings, ChevronDown, ExternalLink } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'astyria' | 'aurelius' | 'alex' | 'aria';
  senderName: string;
  text: string;
  timestamp: string;
  provider?: string;
  model?: string;
}

export const PERSONA_CONFIGS = [
  {
    id: 'astyria',
    name: 'Astyria',
    title: 'Wizjonera Kosmiczna & Twórcza Synteza',
    icon: Sparkles,
    color: 'from-purple-500 to-indigo-500',
    textColor: 'text-purple-300',
    bgColor: 'bg-purple-950/40 border-purple-500/40',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    desc: 'Intuicja, syntezy poznawcze, kosmiczna perspektywa i empatyczna twórczość.',
    quickPrompts: [
      'Jak widzisz przyszłość symbiozy ludzkiej wyobraźni i sztucznej inteligencji?',
      'Jaka jest wyższa synteza modelu Compact Infinity w przestrzeni pojęciowej?',
    ],
  },
  {
    id: 'aurelius',
    name: 'Aurelius',
    title: 'Strateg Ścisłej Logiki & Stoicki Architekt',
    icon: Shield,
    color: 'from-amber-500 to-yellow-600',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-950/40 border-amber-500/40',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    desc: 'Dyscyplina intelektualna, bezbłędna struktura, stoicka analiza i refleksyjność.',
    quickPrompts: [
      'Oceń spójność logiczną protokołu SVLProtectedVariable.',
      'Dlaczego podejście Reflective-Non-Greedy zapobiega błędowi chciwemu AI?',
    ],
  },
  {
    id: 'alex',
    name: 'Alex',
    title: 'Pragmatyczny Inżynier & Optymalizator Kodu',
    icon: Zap,
    color: 'from-cyan-500 to-blue-500',
    textColor: 'text-cyan-300',
    bgColor: 'bg-cyan-950/40 border-cyan-500/40',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    desc: 'Optymalizacja kodu, bezpośrednie działanie, wydajność i pragmatyczne budowanie.',
    quickPrompts: [
      'Jak optymalizować wydajność obliczeń rzutowania stereograficznego w JS/TS?',
      'Napisz propozycję refaktoryzacji silnika topologicznego.',
    ],
  },
  {
    id: 'aria',
    name: 'Aria',
    title: 'Harmonizator Rezonansu & Terapia Milieu',
    icon: Music,
    color: 'from-emerald-500 to-teal-500',
    textColor: 'text-emerald-300',
    bgColor: 'bg-emerald-950/40 border-emerald-500/40',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    desc: 'Rezonans akustyczny 880Hz, kojenie przeciążeń informacyjnych i harmonia.',
    quickPrompts: [
      'W jaki sposób częstotliwość 880Hz wprowadzana jest do terapii Milieu?',
      'Przekaż wiadomość przynoszącą spokój i klarowność poznawczą.',
    ],
  },
];

export default function OriginalAiChatCard() {
  const [selectedPersona, setSelectedPersona] = useState<string>('astyria');
  const [mode, setMode] = useState<'single' | 'roundtable'>('single');
  const [provider, setProvider] = useState<'gemini' | 'ollama'>('gemini');

  // Ollama Configuration State
  const [ollamaUrl, setOllamaUrl] = useState<string>('http://127.0.0.1:11434');
  const [ollamaModel, setOllamaModel] = useState<string>('dolphin3:8b');
  const [showOllamaConfig, setShowOllamaConfig] = useState<boolean>(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ online?: boolean; error?: string; url?: string; model?: string; modelInstalled?: boolean; models?: (string | { name: string })[] } | null>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState<boolean>(false);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'astyria',
      senderName: 'Astyria',
      text: 'Witaj w izbie komunikacyjnej Oryginalnych AI! Jestem Astyria. Wspólnie z Aureliuszem, Alexem i Arią obsługujemy zarówno hybrydowe wnioskowanie chmurowe (Gemini 3.8 Flash), jak i lokalny silnik Ollama (dolphin3:8b / gemma4).',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const checkOllamaHealth = async () => {
    setIsCheckingOllama(true);
    try {
      const res = await fetch('/api/ollama/status', { method: 'GET' });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (typeof data.url === 'string') setOllamaUrl(data.url);
        if (typeof data.model === 'string') setOllamaModel(data.model);
        setOllamaStatus(data);
      } else {
        const rawText = await res.text();
        setOllamaStatus({ online: false, error: `Odpowiedź serwera nie jest w formacie JSON (${res.status}): ${rawText.slice(0, 100)}` });
      }
    } catch (e: any) {
      setOllamaStatus({ online: false, error: e.message });
    } finally {
      setIsCheckingOllama(false);
    }
  };

  const activePersonaObj = PERSONA_CONFIGS.find((p) => p.id === selectedPersona) || PERSONA_CONFIGS[0];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      senderName: 'Operator',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setIsLoading(true);

    try {
      if (mode === 'single') {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personaId: selectedPersona,
            message: textToSend,
            provider,
            ollamaUrl,
            ollamaModel,
            history: messages.slice(-6).map((m) => ({
              sender: m.sender,
              text: m.text,
            })),
          }),
        });

        let data: any;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const rawText = await response.text();
          throw new Error(`Serwer zwrócił odpowiedź w formacie HTML (${response.status}): ${rawText.slice(0, 120)}...`);
        }

        if (!response.ok || data.error) {
          throw new Error(data.error || `Błąd serwera (${response.status})`);
        }

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: selectedPersona as any,
          senderName: activePersonaObj.name,
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: data.provider || provider,
          model: data.model,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } else {
        // Roundtable mode
        const response = await fetch('/api/roundtable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: textToSend,
            provider,
            ollamaUrl,
            ollamaModel,
          }),
        });

        let data: any;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const rawText = await response.text();
          throw new Error(`Serwer zwrócił odpowiedź w formacie HTML (${response.status}): ${rawText.slice(0, 120)}...`);
        }

        if (!response.ok || data.error) {
          throw new Error(data.error || `Błąd serwera (${response.status})`);
        }

        if (data.responses && Array.isArray(data.responses)) {
          const newAiMsgs: ChatMessage[] = data.responses.map((r: any, idx: number) => ({
            id: `rt-${Date.now()}-${idx}`,
            sender: r.personaId as any,
            senderName: r.personaName,
            text: r.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            provider: r.provider || provider,
          }));

          setMessages((prev) => [...prev, ...newAiMsgs]);
        }
      }
    } catch (err: any) {
      console.error('Chat send error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: selectedPersona as any,
        senderName: 'System Error',
        text: `[Błąd Dostawcy ${provider.toUpperCase()}]: ${err.message || 'Nie udało się uzyskać odpowiedzi.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSenderBadge = (msg: ChatMessage) => {
    if (msg.sender === 'user') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
          Operator (Ty)
        </span>
      );
    }
    const persona = PERSONA_CONFIGS.find((p) => p.id === msg.sender);
    const provTag = msg.provider ? ` · ${msg.provider.toUpperCase()}` : '';
    const modelTag = msg.model ? ` (${msg.model})` : '';

    if (persona) {
      return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${persona.badgeColor}`}>
          {msg.senderName}{provTag}{modelTag}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300">
        {msg.senderName}
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/90 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col h-[740px]">
      
      {/* Header & Controls */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-950/90 space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500 via-amber-500 to-emerald-500 text-white shadow-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Panel Komunikacji z Oryginalnymi AI
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  Astyria · Aurelius · Alex · Aria
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Współpraca z dedykowanymi profilami w oparciu o Gemini 3.8 Flash lub lokalny silnik Ollama 8B
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            {/* Provider Switcher */}
            <div className="flex rounded-lg bg-neutral-900 p-1 border border-neutral-800 text-xs font-mono">
              <button
                onClick={() => setProvider('gemini')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  provider === 'gemini'
                    ? 'bg-purple-900/80 text-white border border-purple-500/40 shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Gemini 3.8</span>
              </button>
              <button
                onClick={() => setProvider('ollama')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  provider === 'ollama'
                    ? 'bg-amber-900/80 text-white border border-amber-500/40 shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-amber-400" />
                <span>Ollama 8B</span>
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-lg bg-neutral-900 p-1 border border-neutral-800 text-xs font-mono">
              <button
                onClick={() => setMode('single')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  mode === 'single' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Single</span>
              </button>
              <button
                onClick={() => setMode('roundtable')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  mode === 'roundtable' ? 'bg-gradient-to-r from-purple-900 to-amber-900 text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-300" />
                <span>Okrągły Stół</span>
              </button>
            </div>

            {/* Ollama Config Toggle */}
            <button
              onClick={() => {
                setShowOllamaConfig(!showOllamaConfig);
                if (!ollamaStatus) checkOllamaHealth();
              }}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showOllamaConfig
                  ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Konfiguracja serwera Ollama (Rush47/System_produkcja_czysty)"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ollama Setup Panel */}
        {showOllamaConfig && (
          <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/30 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 font-mono">
                  Konfiguracja Ollama (Rush47 / System_produkcja_czysty)
                </span>
              </div>
              <button
                onClick={checkOllamaHealth}
                disabled={isCheckingOllama}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingOllama ? 'animate-spin' : ''}`} />
                <span>Testuj połączenie</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                  Adres URL serwera Ollama (OLLAMA_BASE_URL)
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  readOnly
                  title="Adres jest konfigurowany po stronie serwera (OLLAMA_BASE_URL), nie w przeglądarce"
                  placeholder="Konfiguracja serwera: OLLAMA_BASE_URL"
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                  Model Ollama (np. dolphin3:8b, gemma4, llama3:8b)
                </label>
                <input
                  type="text"
                  value={ollamaModel}
                  readOnly
                  title="Model wybierany w .env serwera (OLLAMA_MODEL), nie w przeglądarce"
                  placeholder="Konfiguracja serwera: OLLAMA_MODEL"
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-amber-200/80">Adres i model są ustawiane na serwerze Debian 13 w pliku .env. Pole powyżej pokazuje konfigurację backendu po naciśnięciu „Testuj połączenie”. Google AI Studio nie uruchamia Ollamy 8B wewnątrz podglądu.</p>

            {/* Health status */}
            {ollamaStatus && (
              <div className={`p-2.5 rounded-lg text-xs font-mono flex items-start gap-2 ${
                ollamaStatus.online && ollamaStatus.modelInstalled !== false
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
              }`}>
                {ollamaStatus.online && ollamaStatus.modelInstalled !== false ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <div>Ollama Online na {ollamaStatus.url}</div>
                      <div className="text-[10px] text-emerald-400/80 mt-0.5">
                        Dostępne modele: {ollamaStatus.models?.map((m) => typeof m === 'string' ? m : m.name).join(', ') || 'Brak zainstalowanych modeli (uruchom "ollama pull dolphin3:8b")'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <div>
                      <div>{ollamaStatus.modelInstalled === false ? `Serwer Ollama działa, ale model ${ollamaStatus.model || ollamaModel} nie jest pobrany.` : ollamaStatus.error}</div>
                      <div className="text-[10px] text-rose-300/80 mt-1">
                        Uruchom na serwerze Debian 13: <code className="bg-black/60 px-1 py-0.5 rounded text-amber-200">docker compose up -d --build</code>. Kontener automatycznie pobierze model, a serwer aplikacji skomunikuje się z nim wewnętrznie. Nie otwieraj portu 11434 publicznie.
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Personas Select Cards (When single mode) */}
        {mode === 'single' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {PERSONA_CONFIGS.map((persona) => {
              const Icon = persona.icon;
              const isSelected = selectedPersona === persona.id;
              return (
                <button
                  key={persona.id}
                  onClick={() => setSelectedPersona(persona.id)}
                  className={`p-2.5 rounded-xl border transition-all text-left flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? `${persona.bgColor} ring-1 ring-white/20 shadow-lg scale-[1.02]`
                      : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700 text-neutral-400'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${persona.color} text-white shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold font-mono ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                        {persona.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {persona.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Roundtable Header Description */}
        {mode === 'roundtable' && (
          <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Tryb Okrągłego Stołu:</strong> Zadaj jedno pytanie lub temat, a Astyria, Aureliusz, Alex i Aria odpowiedzą po kolei ze swoich unikalnych perspektyw (wybrany dostawca: <strong>{provider.toUpperCase()}</strong>).
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-950/50">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const personaObj = PERSONA_CONFIGS.find((p) => p.id === msg.sender);
          const Icon = personaObj ? personaObj.icon : Bot;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-md ${
                  isUser
                    ? 'bg-cyan-600'
                    : personaObj
                    ? `bg-gradient-to-br ${personaObj.color}`
                    : 'bg-neutral-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-4 space-y-1.5 shadow-md ${
                  isUser
                    ? 'bg-cyan-950/60 border border-cyan-800/80 text-cyan-50'
                    : personaObj
                    ? `${personaObj.bgColor} text-neutral-100`
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {getSenderBadge(msg)}
                    {personaObj && (
                      <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                        {personaObj.title}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {msg.timestamp}
                  </span>
                </div>

                <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 animate-spin">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 font-mono animate-pulse">
              {mode === 'single'
                ? `${activePersonaObj.name} przetwarza zapytanie (${provider.toUpperCase()})...`
                : `Okrągły Stół AI analizuje temat (${provider.toUpperCase()})...`}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      {mode === 'single' && activePersonaObj.quickPrompts && (
        <div className="px-4 py-2 border-t border-neutral-800/60 bg-neutral-950/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-mono text-neutral-500 shrink-0">Sugerowane pytania:</span>
          {activePersonaObj.quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-950/90">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={
              mode === 'single'
                ? `Wysłów się do ${activePersonaObj.name} (Dostawca: ${provider.toUpperCase()})...`
                : `Wpisz temat dla Okrągłego Stołu AI (${provider.toUpperCase()})...`
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              inputMessage.trim() && !isLoading
                ? 'bg-gradient-to-r from-purple-600 via-amber-600 to-cyan-600 text-white shadow-lg shadow-purple-500/20 hover:scale-105'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
