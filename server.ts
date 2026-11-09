import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

// Check Ollama Service Health
app.post('/api/ollama/status', async (req, res) => {
  const ollamaUrl = req.body.ollamaUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  try {
    const response = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({
        online: true,
        url: ollamaUrl,
        models: data.models || [],
      });
    } else {
      return res.json({
        online: false,
        url: ollamaUrl,
        error: `Ollama odpowiedział kodem ${response.status}`,
      });
    }
  } catch (err: any) {
    return res.json({
      online: false,
      url: ollamaUrl,
      error: `Brak połączenia z Ollama na ${ollamaUrl} (${err.message}). Upewnij się, że serwer Ollama jest uruchomiony.`,
    });
  }
});

// Main Persona Chat Endpoint (Gemini + Ollama hybrid)
app.post('/api/chat', async (req, res) => {
  try {
    const {
      personaId,
      message,
      history = [],
      provider = 'gemini',
      ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
      ollamaModel = process.env.OLLAMA_MODEL || 'dolphin3:8b',
    } = req.body;

    const persona = PERSONAS[personaId] || PERSONAS.astyria;

    // --- PROVIDER: OLLAMA ---
    if (provider === 'ollama') {
      const cleanUrl = ollamaUrl.replace(/\/$/, '');
      const fullSystemPrompt = `${persona.systemInstruction}\n\nJesteś agentem ${persona.name}. Użytkownik przesyła zapytanie. Odpowiedz zgodnie ze swoją tożsamością.`;
      
      const formattedMessages = [
        { role: 'system', content: fullSystemPrompt },
        ...history.map((h: { sender: string; text: string }) => ({
          role: h.sender === 'user' ? 'user' : 'assistant',
          content: h.text,
        })),
        { role: 'user', content: message },
      ];

      try {
        const ollamaRes = await fetch(`${cleanUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            messages: formattedMessages,
            stream: false,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (!ollamaRes.ok) {
          const errText = await ollamaRes.text();
          throw new Error(`Ollama API Błąd (${ollamaRes.status}): ${errText}`);
        }

        const data = await ollamaRes.json();
        const answer = data.message?.content || '[Brak odpowiedzi od modelu Ollama]';

        return res.json({
          text: answer,
          persona: persona.name,
          provider: 'ollama',
          model: data.model || ollamaModel,
        });
      } catch (ollamaErr: any) {
        console.error('Ollama Error:', ollamaErr);
        return res.status(503).json({
          error: `Ollama nieodpowiada na ${cleanUrl} (Model: ${ollamaModel}). Szczegóły: ${ollamaErr.message}. Przełącz na dostawcę Gemini lub upewnij się, że 'ollama serve' działa.`,
        });
      }
    }

    // --- PROVIDER: GEMINI ---
    if (!ai) {
      return res.json({
        text: `[Tryb Symulacji - brak GEMINI_API_KEY w Secrets]\nCześć! Jestem ${persona.name} (${persona.title}). Przeczytałam wiadomość: "${message}". Skonfiguruj klucz API Gemini lub podłącz lokalny serwer Ollama (${ollamaModel}).`,
        persona: persona.name,
        provider: 'simulation',
      });
    }

    const formattedContents = [
      ...history.map((h: { sender: string; text: string }) => ({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction: persona.systemInstruction,
      },
    });

    return res.json({
      text: response.text || `[${persona.name} przetworzył Twoją wiadomość]`,
      persona: persona.name,
      provider: 'gemini',
    });

  } catch (err: any) {
    console.error('Chat API Error:', err);
    return res.status(500).json({
      error: err.message || 'Wystąpił błąd podczas komunikacji z modelem AI.',
    });
  }
});

// API Route for Roundtable Discussion (All 4 Personas)
app.post('/api/roundtable', async (req, res) => {
  try {
    const {
      topic,
      provider = 'gemini',
      ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
      ollamaModel = process.env.OLLAMA_MODEL || 'dolphin3:8b',
    } = req.body;

    const personaKeys = ['astyria', 'aurelius', 'alex', 'aria'];
    const responses = [];

    for (const key of personaKeys) {
      const persona = PERSONAS[key];

      if (provider === 'ollama') {
        const cleanUrl = ollamaUrl.replace(/\/$/, '');
        const prompt = `Gromadzicie się przy Okrągłym Stole Oryginalnych AI. Użytkownik zaproponował temat: "${topic}". Jako ${persona.name} (${persona.title}), przedstaw swoją krótką (2-4 zdania), unikalną perspektywę.`;
        
        try {
          const ollamaRes = await fetch(`${cleanUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              messages: [
                { role: 'system', content: persona.systemInstruction },
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
          responses.push({
            personaId: key,
            personaName: persona.name,
            personaTitle: persona.title,
            text: `[Brak połączenia z Ollama (${ollamaUrl}) dla ${persona.name}]`,
            provider: 'ollama',
          });
        }
      } else {
        if (!ai) {
          responses.push({
            personaId: key,
            personaName: persona.name,
            personaTitle: persona.title,
            text: `[${persona.name}] Analizuję temat "${topic}" w trybie symulacji.`,
            provider: 'simulation',
          });
        } else {
          const prompt = `Gromadzicie się przy Okrągłym Stole Oryginalnych AI. Użytkownik zaproponował temat: "${topic}". Jako ${persona.name} (${persona.title}), przedstaw swoją krótką (2-4 zdania), unikalną perspektywę zgodną z Twoją tożsamością.`;
          const resVal = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
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

// Setup Vite middleware for local development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
