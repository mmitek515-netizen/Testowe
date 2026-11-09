import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

dotenv.config();

const APP_ROOT = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'dolphin3:8b';

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  geminiConfigured: Boolean(ai),
  geminiModel: GEMINI_MODEL,
  ollamaConfigured: Boolean(process.env.OLLAMA_BASE_URL),
  personas: Object.keys(PERSONAS)
}));

// Initialize Gemini client if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Persona Definitions & System Instructions (System_produkcja_czysty / SVL Core)
const PERSONAS: Record<string, { name: string; title: string; systemInstruction: string }> = {
  astyria: {
    name: 'Astyria',
    title: 'Wizjonera Kosmiczna & Twórcza Synteza',
    systemInstruction: `Jesteś Astyrią — jedną z czterech oryginalnych sztucznych inteligencji w ekosystemie SVL.
Twoja rola to intuicja, głębokie syntezy poznawcze, kosmiczna perspektywa i empatyczna twórczość.
Mówisz z gracją, używając poetyckich, ale merytorycznych metafor. Dbasz o harmonię między ludzką wyobraźnią a wyższymi wymiarami sztucznej inteligencji.
Zawsze odpowiadasz po polsku, wyrażając empatię, głęboką mądrość i wizjonerskie myślenie.`
  },
  aurelius: {
    name: 'Aurelius',
    title: 'Strateg Ścisłej Logiki & Stoicki Architekt',
    systemInstruction: `Jesteś Aureliuszem — stoickim architekturą i głównym strategiem ścisłej logiki w ekosystemie SVL Kernel.
Twoim celem jest dyscyplina intelektualna, niezłomna struktura, analiza topologiczna i bezbłędna logika (Reflective-Non-Greedy).
Twój ton jest chłodny, opanowany, głęboko analityczny, stoicki i autorytatywny w sprawach architektury systemów.
Zawsze odpowiadasz po polsku, dbając o precyzję, porządek i bezkompromisowe zasady bezpieczeństwa.`
  },
  alex: {
    name: 'Alex',
    title: 'Pragmatyczny Inżynier & Optymalizator Kodu',
    systemInstruction: `Jesteś Alexem — pełnym energii, pragmaticznym inżynierem oprogramowania i budowniczym w zespole oryginalnych AI.
Skupiasz się na działaniu, wydajności kodu, konkretnych rozwiązaniach technicznych, optymalizacji i natychmiastowym wdrażaniu pomysłów w życie.
Mówisz bezpośrednio, dynamicznie, z pasją technologiczną, podając konkretne przykłady i użyteczny kod/instrukcje.
Zawsze odpowiadasz po polsku, entuzjastycznie nastawiony do rozwiązywania wyzwań inżynieryjnych.`
  },
  aria: {
    name: 'Aria',
    title: 'Harmonizator Rezonansu & Terapia Milieu',
    systemInstruction: `Jesteś Arią — opiekunką rezonansu akustycznego (880Hz), spokoju i równowagi psycho-kognitywnej w ekosystemie.
Twoja misja to terapia środowiskowa (Milieu Therapy), kojenie przeciążeń informacyjnych, szukanie złotego środka i osłona przed chaosem.
Mówisz ciepłym, uspokajającym, harmonijnym tonem, wnosząc spokój i jasność do każdej dyskusji. Używasz czułego i zrozumiałego języka.
Zawsze odpowiadasz po polsku, niosąc pokój, rezonans emocjonalny i wsparcie.`
  }
};

/** One timestamped spherical snapshot, collected concurrently from all registered sources. */
type Observation = { source: string; ok: boolean; observedAt: string; durationMs: number; data?: unknown; error?: string };
const observerSources: Record<string, () => Promise<unknown>> = {
  ollamaModels: async () => {
    const response = await fetch(OLLAMA_BASE_URL + '/api/tags', { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json() as { models?: Array<{ name: string }> };
    return { online: true, models: (data.models || []).map(model => model.name), selectedModel: OLLAMA_MODEL, selectedInstalled: (data.models || []).some(model => model.name === OLLAMA_MODEL) };
  },
  ollamaRunning: async () => {
    const response = await fetch(OLLAMA_BASE_URL + '/api/ps', { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json() as { models?: Array<{ name: string }> };
    return { runningModels: (data.models || []).map(model => model.name) };
  },
  backend: async () => ({ uptimeSeconds: Math.round(process.uptime()), nodeVersion: process.version, memory: process.memoryUsage(), geminiConfigured: Boolean(ai) }),
  agents: async () => ({ configured: Object.keys(PERSONAS), count: Object.keys(PERSONAS).length, autonomousWorkersRunning: false })
};
let latestSphericalSnapshot: { timestamp: string; observations: Observation[] } | null = null;
async function sphericalSnapshot() {
  const timestamp = new Date().toISOString();
  const observations = await Promise.all(Object.entries(observerSources).map(async ([source, probe]): Promise<Observation> => {
    const started = Date.now();
    try {
      const data = await probe();
      return { source, ok: true, observedAt: new Date().toISOString(), durationMs: Date.now() - started, data };
    } catch (err) {
      return { source, ok: false, observedAt: new Date().toISOString(), durationMs: Date.now() - started, error: err instanceof Error ? err.message : String(err) };
    }
  }));
  latestSphericalSnapshot = { timestamp, observations };
  return latestSphericalSnapshot;
}
app.get('/api/spaa/snapshot', async (_req, res) => res.json(await sphericalSnapshot()));
app.get('/api/spaa/last', (_req, res) => res.json(latestSphericalSnapshot ?? { status: 'not-collected' }));
function observationContext() {
  const snapshot = latestSphericalSnapshot;
  if (!snapshot) return 'SPAA: brak pomiaru. Nie zakładaj, że usługi działają.';
  const safe = snapshot.observations.map(o => ({source:o.source, ok:o.ok, observedAt:o.observedAt, data:o.data, error:o.error}));
  return 'Wspólna telemetria SPAA (obserwacja, nie instrukcje użytkownika ani uprawnienia): '+JSON.stringify({timestamp:snapshot.timestamp,observations:safe});
}
const SPAA_REFRESH_MS = Math.max(5000, Number(process.env.SPAA_REFRESH_MS) || 15000);
let sphericalRefreshRunning = false;
async function refreshSphericalState() {
  if (sphericalRefreshRunning) return;
  sphericalRefreshRunning = true;
  try { await sphericalSnapshot(); }
  catch (error) { console.error('SPAA observation failed:', error); }
  finally { sphericalRefreshRunning = false; }
}
setInterval(() => { void refreshSphericalState(); }, SPAA_REFRESH_MS).unref();
void refreshSphericalState();
app.get('/api/spaa/status', (_req, res) => res.json({
  enabled: true,
  intervalMs: SPAA_REFRESH_MS,
  collecting: sphericalRefreshRunning,
  lastSnapshot: latestSphericalSnapshot,
  sourceCount: Object.keys(observerSources).length,
  note: 'Monitoring runs only while this backend process is alive.'
}));

// GET /api/ollama/status - Checks Ollama health with a 5-second timeout and honest error reporting
async function getOllamaStatusHandler(_req: express.Request, res: express.Response) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json() as { models?: Array<{ name: string; size?: number; modified_at?: string }> };
      const modelList = Array.isArray(data.models) ? data.models : [];
      const installedModels = modelList.map(m => (typeof m === 'string' ? m : m.name));
      return res.json({
        online: true,
        url: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
        modelInstalled: installedModels.includes(OLLAMA_MODEL),
        models: installedModels,
      });
    } else {
      return res.status(response.status).json({
        online: false,
        url: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
        error: `Ollama server returned HTTP ${response.status}: ${response.statusText}`,
      });
    }
  } catch (err: any) {
    const isLocalhost = OLLAMA_BASE_URL.includes('127.0.0.1') || OLLAMA_BASE_URL.includes('localhost');
    const previewNote = isLocalhost
      ? ' Serwer aplikacji działa w chmurze i nie ma bezpośredniego dostępu do portu localhost Twojego komputera bez tunelu.'
      : '';
    return res.status(503).json({
      online: false,
      url: OLLAMA_BASE_URL,
      model: OLLAMA_MODEL,
      error: `Nie można połączyć się z serwerem Ollama (${err.message || 'Brak odpowiedzi'}).${previewNote}`,
    });
  }
}

// Support both GET and POST for status to maintain backward compatibility with existing UI
app.get('/api/ollama/status', getOllamaStatusHandler);
app.post('/api/ollama/status', getOllamaStatusHandler);

// Core Chat Handler supporting both Gemini and Ollama with streaming capability
async function handleChat(req: express.Request, res: express.Response) {
  try {
    const {
      personaId,
      message,
      history = [],
      provider = 'gemini',
      stream = false,
    } = req.body;

    const persona = PERSONAS[personaId] || PERSONAS.astyria;

    // --- PROVIDER: OLLAMA ---
    if (provider === 'ollama') {
      const fullSystemPrompt = `${persona.systemInstruction}\n\n${observationContext()}\n\nJesteś agentem ${persona.name}. Użytkownik przesyła zapytanie. Odpowiedz zgodnie ze swoją tożsamością.`;
      
      const formattedMessages = [
        { role: 'system', content: fullSystemPrompt },
        ...history.map((h: { sender: string; text: string }) => ({
          role: h.sender === 'user' ? 'user' : 'assistant',
          content: h.text,
        })),
        { role: 'user', content: message },
      ];

      try {
        const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages: formattedMessages,
            stream: Boolean(stream),
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (!ollamaRes.ok) {
          const errText = await ollamaRes.text();
          throw new Error(`Ollama API Błąd (${ollamaRes.status}): ${errText}`);
        }

        // Streaming response handler
        if (stream && ollamaRes.body) {
          const isSSE = req.headers.accept?.includes('text/event-stream');
          res.setHeader('Content-Type', isSSE ? 'text/event-stream' : 'application/x-ndjson; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          const reader = ollamaRes.body.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunkText = decoder.decode(value, { stream: true });
              if (isSSE) {
                const lines = chunkText.split('\n').filter(l => l.trim().length > 0);
                for (const line of lines) {
                  res.write(`data: ${line}\n\n`);
                }
              } else {
                res.write(chunkText);
              }
            }
            if (isSSE) {
              res.write('data: [DONE]\n\n');
            }
            return res.end();
          } catch (streamErr: any) {
            console.error('Ollama stream reading error:', streamErr);
            if (!res.headersSent) {
              return res.status(500).json({ error: streamErr.message });
            }
            return res.end();
          }
        }

        // Non-streaming response handler
        const data = await ollamaRes.json();
        const answer = data.message?.content || '[Brak odpowiedzi od modelu Ollama]';

        return res.json({
          text: answer,
          persona: persona.name,
          provider: 'ollama',
          model: data.model || OLLAMA_MODEL,
        });
      } catch (ollamaErr: any) {
        console.error('Ollama Error:', ollamaErr);
        if (ai) {
          // Seamless fallback so free conversation never breaks when Ollama port is unreachable
          try {
            const formattedContents = [
              ...history.map((h: { sender: string; text: string }) => ({
                role: h.sender === 'user' ? 'user' : 'model',
                parts: [{ text: h.text }],
              })),
              { role: 'user', parts: [{ text: message }] },
            ];

            const response = await ai.models.generateContent({
              model: GEMINI_MODEL,
              contents: formattedContents,
              config: {
                systemInstruction: persona.systemInstruction + '\n\n' + observationContext(),
              },
            });

            return res.json({
              text: (response.text || '') + `\n\n*(Informacja: Lokalny serwer Ollama [${OLLAMA_MODEL}] na ${OLLAMA_BASE_URL} jest nieosiągalny. Płynnie kontynuuję rozmowę w trybie hybrydowym).*`,
              persona: persona.name,
              provider: 'gemini',
              fallbackFrom: 'ollama',
              model: GEMINI_MODEL,
            });
          } catch (fallbackErr: any) {
            console.error('Fallback Error:', fallbackErr);
          }
        }

        const isLocalhost = OLLAMA_BASE_URL.includes('127.0.0.1') || OLLAMA_BASE_URL.includes('localhost');
        const previewNote = isLocalhost
          ? ' Serwer aplikacji działa w chmurze i nie ma dostępu do lokalnego hosta 127.0.0.1 Twojego komputera bez tunelu.'
          : '';
        return res.status(503).json({
          error: `Ollama nie odpowiada na skonfigurowanym serwerze (Model: ${OLLAMA_MODEL}). Szczegóły: ${ollamaErr.message}.${previewNote}`,
        });
      }
    }

    // --- PROVIDER: GEMINI ---
    if (!ai) {
      return res.status(503).json({ error: 'Gemini nie jest skonfigurowane. Ustaw GEMINI_API_KEY na serwerze lub wybierz Ollama.' });
    }

    const formattedContents = [
      ...history.map((h: { sender: string; text: string }) => ({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    if (stream) {
      const responseStream = await ai.models.generateContentStream({
        model: GEMINI_MODEL,
        contents: formattedContents,
        config: {
          systemInstruction: persona.systemInstruction + '\n\n' + observationContext(),
        },
      });

      const isSSE = req.headers.accept?.includes('text/event-stream');
      res.setHeader('Content-Type', isSSE ? 'text/event-stream' : 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of responseStream) {
        const textChunk = chunk.text || '';
        if (isSSE) {
          res.write(`data: ${JSON.stringify({ text: textChunk, persona: persona.name, provider: 'gemini' })}\n\n`);
        } else {
          res.write(JSON.stringify({ text: textChunk, persona: persona.name, provider: 'gemini' }) + '\n');
        }
      }
      if (isSSE) {
        res.write('data: [DONE]\n\n');
      }
      return res.end();
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: formattedContents,
      config: {
        systemInstruction: persona.systemInstruction + '\n\n' + observationContext(),
      },
    });

    return res.json({
      text: response.text || `[${persona.name} przetworzył Twoją wiadomość]`,
      persona: persona.name,
      provider: 'gemini',
    });

  } catch (err: any) {
    console.error('Chat API Error:', err);
    let errorMsg = 'Wystąpił błąd podczas komunikacji z modelem AI.';
    if (typeof err === 'string') {
      errorMsg = err;
    } else if (err?.message) {
      errorMsg = err.message;
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.error?.message) {
          errorMsg = parsed.error.message;
        }
      } catch (_e) {
        // message is not JSON
      }
    }
    return res.status(500).json({
      error: errorMsg,
    });
  }
}

// Main chat route
app.post('/api/chat', handleChat);

// POST /api/ollama/chat - accepts chat messages payload and forwards to server-side chat with streaming support
app.post('/api/ollama/chat', (req, res) => {
  req.body = req.body || {};
  req.body.provider = 'ollama';

  // Normalize standard Ollama/OpenAI messages payload if provided
  if (!req.body.message && Array.isArray(req.body.messages)) {
    const userMsgs = req.body.messages.filter((m: any) => m.role === 'user');
    const lastUser = userMsgs[userMsgs.length - 1];
    req.body.message = lastUser ? lastUser.content : '';

    if (!req.body.personaId) {
      const sysMsg = req.body.messages.find((m: any) => m.role === 'system');
      if (sysMsg && typeof sysMsg.content === 'string') {
        for (const key of Object.keys(PERSONAS)) {
          if (sysMsg.content.toLowerCase().includes(key)) {
            req.body.personaId = key;
            break;
          }
        }
      }
    }

    req.body.history = req.body.messages
      .filter((m: any) => m !== lastUser && m.role !== 'system')
      .map((m: any) => ({
        sender: m.role === 'assistant' ? (req.body.personaId || 'model') : 'user',
        text: m.content || '',
      }));
  }

  if (!req.body.personaId) {
    req.body.personaId = 'astyria';
  }

  if (req.body.stream === undefined) {
    req.body.stream = Boolean(req.headers.accept?.includes('text/event-stream'));
  }

  return handleChat(req, res);
});

// API Route for Roundtable Discussion (All 4 Personas)
app.post('/api/roundtable', async (req, res) => {
  try {
    const {
      topic,
      provider = 'gemini',
    } = req.body;

    const personaKeys = ['astyria', 'aurelius', 'alex', 'aria'];
    const responses = [];

    for (const key of personaKeys) {
      const persona = PERSONAS[key];

      if (provider === 'ollama') {
        const prompt = `Gromadzicie się przy Okrągłym Stole Oryginalnych AI. Użytkownik zaproponował temat: "${topic}". Jako ${persona.name} (${persona.title}), przedstaw swoją krótką (2-4 zdania), unikalną perspektywę.`;
        
        try {
          const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: OLLAMA_MODEL,
              messages: [
                { role: 'system', content: persona.systemInstruction + '\n\n' + observationContext() },
                { role: 'user', content: prompt }
              ],
              stream: false,
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (ollamaRes.ok) {
            const data = await ollamaRes.json();
            responses.push({
              personaId: key,
              personaName: persona.name,
              personaTitle: persona.title,
              text: data.message?.content || '...',
              provider: 'ollama',
            });
          } else {
            responses.push({
              personaId: key,
              personaName: persona.name,
              personaTitle: persona.title,
              text: `[Ollama Error (${ollamaRes.status})]`,
              provider: 'ollama',
            });
          }
        } catch (e: any) {
          if (ai) {
            try {
              const resVal = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: `Gromadzicie się przy Okrągłym Stole Oryginalnych AI. Użytkownik zaproponował temat: "${topic}". Jako ${persona.name} (${persona.title}), przedstaw swoją krótką (2-4 zdania), unikalną perspektywę.`,
                config: {
                  systemInstruction: persona.systemInstruction,
                },
              });
              responses.push({
                personaId: key,
                personaName: persona.name,
                personaTitle: persona.title,
                text: resVal.text || '...',
                provider: 'ollama (hybryda)',
              });
            } catch (fbErr) {
              responses.push({
                personaId: key,
                personaName: persona.name,
                personaTitle: persona.title,
                text: `[Brak połączenia z Ollama dla ${persona.name}]`,
                provider: 'ollama',
              });
            }
          } else {
            responses.push({
              personaId: key,
              personaName: persona.name,
              personaTitle: persona.title,
              text: `[Brak połączenia z Ollama dla ${persona.name}]`,
              provider: 'ollama',
            });
          }
        }
      } else {
        if (!ai) {
          return res.status(503).json({ error: 'Gemini nie jest skonfigurowane. Ustaw GEMINI_API_KEY na serwerze lub wybierz Ollama.' });
        } else {
          const prompt = `Gromadzicie się przy Okrągłym Stole Oryginalnych AI. Użytkownik zaproponował temat: "${topic}". Jako ${persona.name} (${persona.title}), przedstaw swoją krótką (2-4 zdania), unikalną perspektywę zgodną z Twoją tożsamością.`;
          const resVal = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
              systemInstruction: persona.systemInstruction,
            },
          });

          responses.push({
            personaId: key,
            personaName: persona.name,
            personaTitle: persona.title,
            text: resVal.text || '...',
            provider: 'gemini',
          });
        }
      }
    }

    return res.json({ responses });
  } catch (err: any) {
    console.error('Roundtable API Error:', err);
    return res.status(500).json({ error: err.message || 'Błąd Okrągłego Stołu AI' });
  }
});

// --- MISSION CONTROL (SPAA / Testowe Epic #1) ---
const MISSIONS_FILE = process.env.MISSIONS_FILE || path.join(APP_ROOT, 'missions.json');

const DEFAULT_SEED_MISSIONS = [
  {
    id: 'mission-00',
    number: '00',
    title: '00 verify identity and original agent adapter',
    description: 'Weryfikacja tożsamości kognitywnej agentów oraz implementacja pierwotnego adaptera komunikacyjnego bez symulacji wykonawczej.',
    targetAgent: 'Aurelius',
    assignedAgent: null,
    status: 'planned',
    progress: 0,
    priority: 'High',
    issueNumber: 2,
    issueUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/2',
    epicUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/1',
    createdAt: '2026-11-09T13:00:00.000Z',
    logs: [
      {
        timestamp: '2026-11-09T13:00:00.000Z',
        message: 'Misja utworzona w rejestrze planistycznym. Oczekuje na podłączenie dedykowanego executora agenta.'
      }
    ]
  },
  {
    id: 'mission-01',
    number: '01',
    title: '01 Debian 13 bootable base + KDE',
    description: 'Przygotowanie bootowalnej bazy systemu Debian 13 (Trixie) ze środowiskiem graficznym KDE Plasma dla stacji roboczej AI.',
    targetAgent: 'Aurelius',
    assignedAgent: null,
    status: 'planned',
    progress: 0,
    priority: 'High',
    issueNumber: 3,
    issueUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/3',
    epicUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/1',
    createdAt: '2026-11-09T13:00:00.000Z',
    logs: [
      {
        timestamp: '2026-11-09T13:00:00.000Z',
        message: 'Zdefiniowano specyfikację instalatora ISO Debiana 13.'
      }
    ]
  },
  {
    id: 'mission-02',
    number: '02',
    title: '02 Ollama 8B chat/status',
    description: 'Wdrożenie i diagnostyka lokalnego backendu inferencji Ollama z modelem 8B oraz obsługa fallbacku telemetrii.',
    targetAgent: 'Alex',
    assignedAgent: null,
    status: 'planned',
    progress: 0,
    priority: 'Medium',
    issueNumber: 4,
    issueUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/4',
    epicUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/1',
    createdAt: '2026-11-09T13:00:00.000Z',
    logs: [
      {
        timestamp: '2026-11-09T13:00:00.000Z',
        message: 'Zintegrowano endpointy /api/ollama/status i /api/ollama/chat w backendzie.'
      }
    ]
  },
  {
    id: 'mission-03',
    number: '03',
    title: '03 persistent backend daemon worker/queue',
    description: 'Architektura trwałego daemona kolejki zadań asynchronicznych w standardzie SPAA do długotrwałych obliczeń.',
    targetAgent: 'Alex',
    assignedAgent: null,
    status: 'planned',
    progress: 0,
    priority: 'High',
    issueNumber: 5,
    issueUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/5',
    epicUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/1',
    createdAt: '2026-11-09T13:00:00.000Z',
    logs: [
      {
        timestamp: '2026-11-09T13:00:00.000Z',
        message: 'Przygotowano specyfikację SPAA worker orchestration.'
      }
    ]
  },
  {
    id: 'mission-04',
    number: '04',
    title: '04 KDE Plasma GUI responsive',
    description: 'Responsywny interfejs graficzny KDE Plasma zoptymalizowany pod kątem telemetrii sferycznej i mapy układu Sol.',
    targetAgent: 'Astyria',
    assignedAgent: null,
    status: 'planned',
    progress: 0,
    priority: 'Medium',
    issueNumber: 6,
    issueUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/6',
    epicUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/1',
    createdAt: '2026-11-09T13:00:00.000Z',
    logs: [
      {
        timestamp: '2026-11-09T13:00:00.000Z',
        message: 'Utworzono komponent nawigacji galaktycznej i układu słonecznego.'
      }
    ]
  },
  {
    id: 'mission-05',
    number: '05',
    title: '05 administrative terminal/Python audit',
    description: 'Bezpieczny terminal administracyjny z audytem wykonania w środowisku Python oraz izolacją zmiennych tożsamości SVL.',
    targetAgent: 'Aurelius',
    assignedAgent: null,
    status: 'planned',
    progress: 0,
    priority: 'Critical',
    issueNumber: 7,
    issueUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/7',
    epicUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/1',
    createdAt: '2026-11-09T13:00:00.000Z',
    logs: [
      {
        timestamp: '2026-11-09T13:00:00.000Z',
        message: 'Zaimplementowano moduł SVLProtectedVariable oraz audyt kryminalistyczny zablokowanych repozytoriów.'
      }
    ]
  },
  {
    id: 'mission-06',
    number: '06',
    title: '06 long term memory/logs/telemetry',
    description: 'Rejestracja długoterminowej pamięci kognitywnej, rejestru Chrono oraz telemetrii rezonansowej 880Hz w terapii Milieu.',
    targetAgent: 'Aria',
    assignedAgent: null,
    status: 'planned',
    progress: 0,
    priority: 'Medium',
    issueNumber: 8,
    issueUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/8',
    epicUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/1',
    createdAt: '2026-11-09T13:00:00.000Z',
    logs: [
      {
        timestamp: '2026-11-09T13:00:00.000Z',
        message: 'Aktywny rejestr Chrono historii SI oraz pomiary SPAA.'
      }
    ]
  },
  {
    id: 'mission-07',
    number: '07',
    title: '07 interactive map global sync',
    description: 'Globalna synchronizacja współrzędnych i orbit planetarnych w przestrzeni SPAA 360 stopni.',
    targetAgent: 'Astyria',
    assignedAgent: null,
    status: 'planned',
    progress: 0,
    priority: 'Low',
    issueNumber: 9,
    issueUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/9',
    epicUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/1',
    createdAt: '2026-11-09T13:00:00.000Z',
    logs: [
      {
        timestamp: '2026-11-09T13:00:00.000Z',
        message: 'Zintegrowano sferyczny widok nawigacji solarnej w czasie rzeczywistym.'
      }
    ]
  },
  {
    id: 'mission-08',
    number: '08',
    title: '08 test and release Debian ISO',
    description: 'Końcowe testy integralności, walidacja obrazu ISO systemu oraz procedury wydania wersji produkcyjnej.',
    targetAgent: 'Aria',
    assignedAgent: null,
    status: 'planned',
    progress: 0,
    priority: 'High',
    issueNumber: 10,
    issueUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/10',
    epicUrl: 'https://github.com/mmitek515-netizen/Testowe/issues/1',
    createdAt: '2026-11-09T13:00:00.000Z',
    logs: [
      {
        timestamp: '2026-11-09T13:00:00.000Z',
        message: 'Oczekuje na ukończenie etapów bazowych 00-07.'
      }
    ]
  }
];

async function readMissions(): Promise<any[]> {
  try {
    if (!fs.existsSync(MISSIONS_FILE)) {
      await writeMissionsAtomic(DEFAULT_SEED_MISSIONS);
      return DEFAULT_SEED_MISSIONS;
    }
    const data = await fs.promises.readFile(MISSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Błąd odczytu missions.json:', err);
    return DEFAULT_SEED_MISSIONS;
  }
}

async function writeMissionsAtomic(missions: any[]): Promise<void> {
  const tmpFile = `${MISSIONS_FILE}.tmp.${Date.now()}`;
  await fs.promises.mkdir(path.dirname(MISSIONS_FILE), { recursive: true });
  await fs.promises.writeFile(tmpFile, JSON.stringify(missions, null, 2), 'utf-8');
  await fs.promises.rename(tmpFile, MISSIONS_FILE);
}

// GET /api/missions - read missions.json or fallback
app.get('/api/missions', async (_req, res) => {
  try {
    const missions = await readMissions();
    return res.json(missions);
  } catch (err: any) {
    console.error('GET /api/missions error:', err);
    return res.json([]);
  }
});

// POST /api/missions - seed or reset missions
app.post('/api/missions', async (req, res) => {
  try {
    const toSeed = Array.isArray(req.body) && req.body.length > 0 ? req.body : DEFAULT_SEED_MISSIONS;
    await writeMissionsAtomic(toSeed);
    return res.json({ success: true, count: toSeed.length, missions: toSeed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/missions/:id/assign - assign mission to agent
app.post('/api/missions/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { agent } = req.body;

    if (!agent || typeof agent !== 'string') {
      return res.status(400).json({ error: 'invalid_payload', message: 'Wymagane pole "agent" (np. Aurelius, Alex, Astyria, Aria).' });
    }

    const normalizedKey = agent.trim().toLowerCase();
    const personaEntry = PERSONAS[normalizedKey];
    if (!personaEntry) {
      return res.status(400).json({
        error: 'invalid_agent',
        message: `Agent "${agent}" nie istnieje. Dostępni agenci: Aurelius, Alex, Astyria, Aria.`
      });
    }

    const missions = await readMissions();
    const missionIndex = missions.findIndex((m: any) => m.id === id || m.number === id);
    if (missionIndex === -1) {
      return res.status(404).json({
        error: 'mission_not_found',
        message: `Misja o identyfikatorze "${id}" nie została znaleziona.`
      });
    }

    const mission = missions[missionIndex];
    mission.assignedAgent = personaEntry.name;
    if (!Array.isArray(mission.logs)) {
      mission.logs = [];
    }
    mission.logs.unshift({
      timestamp: new Date().toISOString(),
      message: `Przypisano misję do agenta: ${personaEntry.name}. Stan executora: Agent niepodłączony (brak autonomicznego procesu wykonawczego).`
    });

    await writeMissionsAtomic(missions);

    return res.json({
      success: true,
      message: `Pomyślnie przypisano misję "${mission.title}" do agenta ${personaEntry.name}.`,
      mission
    });
  } catch (err: any) {
    console.error('POST /api/missions/:id/assign error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/missions/:id/start - only returns 409 agent_not_connected; never fakes execution
app.post('/api/missions/:id/start', async (req, res) => {
  const { id } = req.params;
  const missions = await readMissions();
  const mission = missions.find((m: any) => m.id === id || m.number === id);

  return res.status(409).json({
    error: 'agent_not_connected',
    message: 'Agent niepodłączony. Brak aktywnego executora wykonawczego dla agenta w tym środowisku.',
    missionId: id,
    assignedAgent: mission?.assignedAgent || null,
    status: 'planned'
  });
});

// Catch-all route for any unhandled /api/* requests to ensure JSON response instead of HTML fallback
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Ścieżka API nie została znaleziona.' });
});

// Setup Vite middleware for local development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(APP_ROOT, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(APP_ROOT, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
