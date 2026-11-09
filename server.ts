import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { validateVisionImagePayload } from './src/core/visionImage';
import path from 'path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

dotenv.config();

const APP_ROOT = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// Vision: up to 2 MiB original PNG/JPEG becomes ~2.8 MiB base64 JSON.
app.use(express.json({ limit: '4mb' }));

const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2-vision:11b';

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

const AGENT_API_URL = (process.env.AGENT_API_URL || '').replace(/\/$/, '');
const AGENT_API_TOKEN = process.env.AGENT_API_TOKEN || '';

async function localWorkerHealth() {
  if (!AGENT_API_URL || !AGENT_API_TOKEN) {
    return { online: false, ready: false, configured: false, identityVerified: false, error: 'Lokalny worker nie jest skonfigurowany.' };
  }
  try {
    const response = await fetch(`${AGENT_API_URL}/health`, {
      headers: { Authorization: `Bearer ${AGENT_API_TOKEN}` },
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) {
      return { online: false, ready: false, configured: true, identityVerified: false, error: `Worker HTTP ${response.status}` };
    }
    const data = await response.json() as { model?: string; persistentQueue?: boolean; agentIdentityVerified?: boolean; ready?: boolean; ollamaReachable?: boolean; modelInstalled?: boolean };
    return {
      online: true,
      ready: data.ready === true,
      modelInstalled: data.modelInstalled === true,
      ollamaReachable: data.ollamaReachable === true,
      configured: true,
      identityVerified: data.agentIdentityVerified === true,
      model: data.model || '',
      persistentQueue: data.persistentQueue === true,
      note: 'Lokalny worker Ollama. Nie potwierdzono tożsamości oryginalnych agentów.'
    };
  } catch (error) {
    return {
      online: false,
      ready: false,
      configured: true,
      identityVerified: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/** Only the local SPAA daemon owns execution workers and authoritative sphere. */
async function readCentralSPAA<T = unknown>(route: '/sphere' | '/sphere/workers' | '/mesh'): Promise<T> {
  if (!AGENT_API_URL || AGENT_API_TOKEN.length < 32) {
    throw new Error('spaa_not_configured');
  }
  const response = await fetch(AGENT_API_URL + route, {
    headers: { Authorization: 'Bearer ' + AGENT_API_TOKEN, Accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('spaa_unavailable');
  const raw = await response.text();
  if (raw.length > 131072) throw new Error('spaa_response_too_large');
  return JSON.parse(raw) as T;
}

app.get('/api/spaa/mesh', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const topology = await readCentralSPAA<any>('/mesh');
    if (!topology || !Array.isArray(topology.members) || !Array.isArray(topology.edges)) {
      throw new Error('invalid_mesh');
    }
    return res.json({
      state: 'online',
      architecture: 'SPAA-full-mesh',
      sphereId: typeof topology.sphereId === 'string' ? topology.sphereId : null,
      directedLinks: topology.edges.length,
      members: topology.members.map((w: any) => ({
        name: String(w.name || ''),
        online: w.online === true,
        capabilities: Array.isArray(w.capabilities) ? w.capabilities : [],
        pendingMessages: Math.max(0, Number(w.pendingMessages) || 0),
        sphereId: typeof w.sphereId === 'string' ? w.sphereId : null
      })),
      edges: topology.edges.map((e: any) => ({
        from: String(e.from || ''),
        to: String(e.to || ''),
        available: e.available === true
      })),
      messagesStored: Math.max(0, Number(topology.messagesStored) || 0),
      originalAgentIdentitiesVerified: false
    });
  } catch {
    return res.status(503).json({ state: 'offline', architecture: 'SPAA-full-mesh',
      sphereId: null, directedLinks: 0, members: [], edges: [],
      originalAgentIdentitiesVerified: false });
  }
});

app.get('/api/spaa/sphere', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const sphere = await readCentralSPAA('/sphere');
    return res.json(sphere);
  } catch {
    return res.status(503).json({ state: 'unavailable', sphereId: null,
      observations: [], message: 'Centralny demon SPAA nie jest dostępny.' });
  }
});

/** One timestamped spherical snapshot, collected concurrently from all registered sources. */
type Observation = { source: string; ok: boolean; observedAt: string; durationMs: number; data?: unknown; error?: string };
const observerSources: Record<string, () => Promise<unknown>> = {
  ollamaModels: async () => {
    const response = await fetch(OLLAMA_BASE_URL + '/api/tags', { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json() as { models?: Array<{ name: string }> };
    return { online: true, models: (data.models || []).map(model => model.name), selectedModel: OLLAMA_MODEL, selectedInstalled: (data.models || []).some(model => model.name?.toLowerCase() === OLLAMA_MODEL.toLowerCase()) };
  },
  ollamaRunning: async () => {
    const response = await fetch(OLLAMA_BASE_URL + '/api/ps', { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json() as { models?: Array<{ name: string }> };
    return { runningModels: (data.models || []).map(model => model.name) };
  },
  spaaCentral: async () => await readCentralSPAA('/sphere'),
  backend: async () => ({ uptimeSeconds: Math.round(process.uptime()), nodeVersion: process.version, memory: process.memoryUsage(), geminiConfigured: Boolean(ai) }),
  agents: async () => ({ configured: Object.keys(PERSONAS), count: Object.keys(PERSONAS).length, autonomousWorkersRunning: false, localWorker: await localWorkerHealth() })
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
// Presence of a persona prompt or a functioning chat model is not proof of
// an independent autonomous agent. The authenticated bridge is not connected.
app.get('/api/agents/status', async (_req, res) => {
  const localWorker = await localWorkerHealth();
  return res.json({
    configuredPersonas: Object.keys(PERSONAS).length,
    autonomousWorkersRunning: false,
    originalAgentIdentitiesVerified: false,
    localWorker,
    agents: Object.entries(PERSONAS).map(([id, persona]) => ({
      id,
      name: persona.name,
      executorStatus: localWorker.online ? 'local-ollama-unverified' : 'not-connected',
      originalExecutorConnected: false,
      localTaskWorkerAvailable: localWorker.ready,
      note: 'Persona konwersacyjna; brak potwierdzonego oryginalnego agenta.'
    }))
  });
});

app.get('/api/local-worker/status', async (_req, res) => {
  return res.json(await localWorkerHealth());
});

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
app.get('/api/spaa/status', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  let state: 'online' | 'offline' = 'online';
  let centralSphere: any = null;
  let workers: any[] = [];
  try {
    const [sphere, workforce] = await Promise.all([
      readCentralSPAA<any>('/sphere'), readCentralSPAA<any>('/sphere/workers')
    ]);
    if (!sphere || sphere.state !== 'collected' || !Array.isArray(sphere.observations) ||
        !workforce || !Array.isArray(workforce.workers)) throw new Error('invalid_spaa');
    centralSphere = {
      sphereId: sphere.sphereId,
      observedAt: sphere.observedAt,
      sourceCount: sphere.sourceCount,
      healthySources: sphere.observations.filter((o: any) => o.ok).length,
    };
    workers = workforce.workers.map((w: any) => ({
      name: String(w.name || ''),
      state: String(w.state || 'unavailable'),
      online: w.online === true,
      capabilities: Array.isArray(w.capabilities) ? w.capabilities : [],
      lastSeen: w.lastSeen || null,
      sphereId: w.sphereId || null,
      originalIdentityVerified: false,
    }));
  } catch {
    state = 'offline';
  }
  return res.json({
    enabled: true,
    state,
    spherical: true, polymorphic: true, asymmetric: true, asynchronous: true,
    daemon: state === 'online' ? 'spaa-spherical-worker-daemon' : 'unavailable',
    sphere: centralSphere, workers,
    originalAgentIdentitiesVerified: false,
    observerIntervalMs: SPAA_REFRESH_MS,
    collecting: sphericalRefreshRunning,
    nodeObserverSnapshot: latestSphericalSnapshot?.timestamp || null,
    sourceCount: Object.keys(observerSources).length,
    note: 'Źródła tylko podłączone. Jeden centralny demon wykonawczy, oddzielny proces Node jest obserwatorem.'
  });
});

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
        modelInstalled: installedModels.some(name => name.toLowerCase() === OLLAMA_MODEL.toLowerCase()),
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
            options: { num_predict: 256 },
          }),
          signal: AbortSignal.timeout(180000),
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

// Real Ollama Vision image analysis, using the configured server-side model.
// Browser never supplies an arbitrary Ollama URL or model tag.
app.post('/api/ollama/vision', async (req, res) => {
  const image = (() => {
    try { return validateVisionImagePayload(req.body?.image); }
    catch { return null; }
  })();
  if (!image) return res.status(400).json({
    error: 'Prześlij poprawny obraz PNG lub JPEG o rozmiarze do 2 MB.'
  });
  const personaId = typeof req.body?.personaId === 'string' ? req.body.personaId : 'astyria';
  const persona = PERSONAS[personaId] || PERSONAS.astyria;
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (message.length > 8000) return res.status(400).json({ error: 'Zapytanie jest zbyt długie.' });
  const prompt = message || 'Opisz szczegółowo załączony obraz.';
  try {
    const response = await fetch(OLLAMA_BASE_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: persona.systemInstruction +
            '\nObraz analizuj na podstawie faktycznie przesłanych pikseli. Zaznacz niepewność.' },
          { role: 'user', content: prompt, images: [image.base64] },
        ],
        options: { num_predict: 384 },
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(180000),
    });
    if (!response.ok) return res.status(502).json({
      error: 'Ollama Vision odmówiła analizy obrazu; sprawdź model i zasoby serwera.'
    });
    const body = await response.json() as { message?: { content?: unknown }; model?: unknown };
    const answer = body.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
      return res.status(502).json({ error: 'Model Vision nie zwrócił odpowiedzi.' });
    }
    return res.json({
      text: answer, provider: 'ollama', persona: persona.name,
      model: typeof body.model === 'string' ? body.model : OLLAMA_MODEL,
      vision: true,
    });
  } catch {
    return res.status(503).json({
      error: 'Nie można połączyć się z Ollamą Vision. Sprawdź jej instalację i pamięć.'
    });
  }
});

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
    title: '02 Ollama Llama 3.2 Vision 11B — API i telemetria',
    description: 'Uruchomienie domyślnego modelu llama3.2-vision:11b oraz diagnostyka tekstu i obrazów.',
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
      // First boot on Debian uses an empty persistent Docker volume.
      // Keep the actual mission assignments committed with the application.
      const bundledMissions = path.join(APP_ROOT, 'missions.json');
      let initial = DEFAULT_SEED_MISSIONS;
      try {
        const bundled = JSON.parse(await fs.promises.readFile(bundledMissions, 'utf-8'));
        if (Array.isArray(bundled) && bundled.length > 0) initial = bundled;
      } catch (error) {
        console.warn('Bundled missions unavailable, using default definitions:', error);
      }
      await writeMissionsAtomic(initial);
      return initial;
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

// Debian 13 runtime bridge: strictly read-only, server-to-server, no browser token.
// Codespaces/Google AI Studio frontend must not pretend localhost means the Debian host.
const DEBIAN13_SYSTEM_API_URL = (process.env.DEBIAN13_SYSTEM_API_URL || '').trim().replace(/[/]$/, '');
const DEBIAN13_API_TOKEN = process.env.DEBIAN13_API_TOKEN || '';

function validatedDebian13Origin(): string {
  const parsed = new URL(DEBIAN13_SYSTEM_API_URL);
  // Narrow allowlist prevents accidental SSRF or plaintext transport to public hosts.
  if (parsed.protocol !== 'http:' ||
      !['debian13-system', '127.0.0.1', 'localhost'].includes(parsed.hostname) ||
      Boolean(parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash)) {
    throw new Error('debian13_origin_invalid');
  }
  return parsed.origin;
}

async function getDebian13Json(route: '/v1/diagnostics' | '/v1/profiles' | '/api/v1/tasks'): Promise<Record<string, any>> {
  const origin = validatedDebian13Origin();
  const result = await fetch(origin + route, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + DEBIAN13_API_TOKEN, 'Accept': 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(3500),
  });
  if (!result.ok) throw new Error('debian13_http_' + result.status);
  const body = await result.text();
  if (body.length > 131072) throw new Error('debian13_response_too_large');
  const data: unknown = JSON.parse(body);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('debian13_invalid_json');
  }
  return data as Record<string, any>;
}

type DebianModelProbe = { verified: boolean; checkedAt: string; model?: string };
let latestDebianModelProbe: DebianModelProbe | null = null;
let debianProbeInFlight = false;
let lastDebianProbeAttemptMs = 0;

app.get('/api/debian13/status', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const checkedAt = new Date().toISOString();
  if (!DEBIAN13_SYSTEM_API_URL || DEBIAN13_API_TOKEN.length < 32) {
    return res.json({
      state: 'not-configured', configured: false, checkedAt,
      message: 'Wymagane DEBIAN13_SYSTEM_API_URL i prywatny DEBIAN13_API_TOKEN (min. 32 znaki).',
      originalAgentsVerified: false,
    });
  }
  try {
    const [diag, profiles, tasks] = await Promise.all([
      getDebian13Json('/v1/diagnostics'),
      getDebian13Json('/v1/profiles'),
      getDebian13Json('/api/v1/tasks'),
    ]);
    if (diag.service !== 'debian13-system' || !Array.isArray(tasks.tasks)) {
      throw new Error('debian13_invalid_contract');
    }
    return res.json({
      state: 'online', configured: true, checkedAt, service: 'debian13-system',
      runtime: 'Debian 13 userspace API (container or host); OS boot NOT verified',
      effectiveUid: typeof diag.effectiveUid === 'number' ? diag.effectiveUid : null,
      workspaceWritable: diag.workspaceWritable === true,
      modelProviderConfigured: profiles.providerConfigured === true,
      modelInferenceVerified: latestDebianModelProbe?.verified === true,
      modelLastProbedAt: latestDebianModelProbe?.checkedAt || null,
      modelLastProbedName: latestDebianModelProbe?.model || null,
      taskEntriesShown: tasks.tasks.length, taskEntriesLimit: 100,
      storage: tasks.storage === 'sqlite' ? 'sqlite' : 'unknown',
      workersRunning: typeof tasks.workersRunning === 'number' ? tasks.workersRunning : 0,
      originalAgentsVerified: false,
    });
  } catch (error) {
    // Do not leak URLs, stack traces, internal service data or bearer tokens to the browser.
    console.warn('Debian 13 runtime unavailable:', error instanceof Error ? error.name : 'unknown');
    return res.json({
      state: 'offline', configured: true, checkedAt,
      message: 'Usługa Debian 13 nie odpowiada poprawnie lub wymaga naprawy konfiguracji.',
      originalAgentsVerified: false,
    });
  }
});


/** Explicit model inference check: one fixed, short prompt, no model access token in browser. */
app.post('/api/debian13/probe', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!DEBIAN13_SYSTEM_API_URL || DEBIAN13_API_TOKEN.length < 32) {
    return res.status(503).json({ verified: false, message: 'Usługa Debian 13 nie jest skonfigurowana.' });
  }
  if (debianProbeInFlight) {
    return res.status(409).json({ verified: false, message: 'Test modelu jest już wykonywany.' });
  }
  const now = Date.now();
  if (now - lastDebianProbeAttemptMs < 30000) {
    res.setHeader('Retry-After', '30');
    return res.status(429).json({ verified: false, message: 'Odczekaj 30 sekund przed następnym testem.' });
  }
  let origin: string;
  try {
    origin = validatedDebian13Origin();
  } catch {
    return res.status(503).json({ verified: false, message: 'Adres usługi Debian 13 jest nieprawidłowy.' });
  }
  debianProbeInFlight = true;
  lastDebianProbeAttemptMs = now;
  const checkedAt = new Date().toISOString();
  try {
    const reply = await fetch(origin + '/v1/chat', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + DEBIAN13_API_TOKEN,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ profile: 'alex', message: 'Krótki test połączenia. Odpowiedz jednym słowem: OK.' }),
      redirect: 'error',
      signal: AbortSignal.timeout(120000),
    });
    if (!reply.ok) throw new Error('upstream_unavailable');
    const raw = await reply.text();
    if (raw.length > 65536) throw new Error('response_too_large');
    const payload: unknown = JSON.parse(raw);
    if (typeof payload !== 'object' || !payload || Array.isArray(payload)) throw new Error('invalid_payload');
    const data = payload as Record<string, unknown>;
    if (typeof data.content !== 'string' || !data.content.trim() ||
        typeof data.model !== 'string' || !data.model.trim()) throw new Error('invalid_reply');
    latestDebianModelProbe = { verified: true, checkedAt, model: data.model.slice(0, 100) };
    return res.json({ ...latestDebianModelProbe, message: 'Model rzeczywiście odpowiedział przez Debian 13 API.' });
  } catch (error) {
    latestDebianModelProbe = { verified: false, checkedAt };
    console.warn('Debian 13 model probe failed:', error instanceof Error ? error.name : 'unknown');
    return res.status(502).json({ verified: false, checkedAt,
      message: 'Nie udało się uzyskać poprawnej odpowiedzi z modelu Ollama przez Debian 13 API.' });
  } finally {
    debianProbeInFlight = false;
  }
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
