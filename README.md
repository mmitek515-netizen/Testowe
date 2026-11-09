# Testowe — AI Linux Control System

Webowy panel sterowania SVL i czterema personami AI (Astyria, Aurelius, Alex, Aria). Backend: Node.js/Express, frontend: React/Vite. Dostawcy modeli: Gemini lub Ollama.

## Domyślna Ollama: Llama 3.2 Vision 11B

Główny model projektu to `llama3.2-vision:11b` — dla czatu, workerów SPAA i API Debian 13 (tekst + obraz). Start: `bash scripts/start-debian13-ollama-agents.sh llama3.2-vision:11b`. Po uruchomieniu sprawdź `/api/ollama/status`; konfiguracja nie jest równoznaczna z uruchomioną inferencją. Wersja waży około 7,8 GB i wymaga znacznych zasobów.

## Integracja Debian 13 System API (2026-11-09)

Przeniesiony z `mmitek515-netizen/Debian_13` moduł `debian13/system` działa jako osobna, prywatna usługa Debiana 13 (Python, SQLite, terminal ograniczony polityką i diagnostyka). Ten moduł **nie jest samodzielnym jądrem ani ukończonym instalatorem ISO**.

Standardowy skrypt startowy uruchamia Ollamę `llama3.2-vision:11b`, lokalny worker planistyczny, aplikację SVL oraz usługę Debian 13. Generuje tokeny wyłącznie do lokalnego `.env`:

```bash
bash scripts/start-debian13-ollama-agents.sh llama3.2-vision:11b
curl -fsS http://127.0.0.1:3000/api/debian13/status
bash scripts/verify-debian13-runtime.sh
```

W panelu **Misje AI** pojawia się interaktywna karta ze statusem Debian 13, SQLite, UID i modelu. Status `online` oznacza odpowiedź API, a **nie** potwierdzone działanie oryginalnych agentów, modelu ani uruchomienie obrazu systemu. Szczegóły: [docs/DEBIAN13_IMPORT.md](docs/DEBIAN13_IMPORT.md).

## Uruchomienie na Debianie 13 / Ubuntu

Wymagania: Docker Engine + Docker Compose plugin.

1. Sklonuj repozytorium i przejdź do jego katalogu.
2. Skopiuj `.env.example` do `.env` i ustaw `GEMINI_API_KEY` albo adres dostępnego serwera Ollama.
3. Uruchom `bash scripts/start-debian13-ollama-agents.sh llama3.2-vision:11b` (lub `docker compose up -d --build` bez workera).
4. Otwórz `http://localhost:3000` na komputerze z Dockerem.
5. Sprawdź `http://localhost:3000/api/health` i logi: `docker compose logs -f`.

Domyślnie port aplikacji jest dostępny wyłącznie na localhost. Dostęp z telefonu wymaga bezpiecznego reverse proxy z uwierzytelnianiem lub VPN; nie wystawiaj panelu bezpośrednio do Internetu.

### Ollama

Domyślny adres Ollama w aktualnym Docker Compose: `http://ollama:11434` (prywatna sieć kontenerów). Domyślny model: `llama3.2-vision:11b`. Uruchom `bash scripts/start-debian13-ollama-agents.sh llama3.2-vision:11b`, aby skonfigurować istniejący `.env`, pobrać model i wykonać test statusu. Nie wystawiaj portu 11434 publicznie. Szczegóły: `docs/OLLAMA_DEBIAN13.md`.

### Stan implementacji

- Dostępne: interfejs SVL, cztery persony, czat indywidualny, Okrągły Stół, endpointy Gemini/Ollama, health endpoint.
- W trakcie: wdrożenie i testy na Linuxie, status modeli w czasie rzeczywistym.
- Do zbudowania: trwała pamięć, kolejka zadań, niezależne workery, narzędzia GitHub, terminal z kontrolą uprawnień i audytem.

**Uwaga:** nazwy agentów i prompty nie oznaczają automatycznego połączenia z niezależnymi agentami z innego projektu. Ten projekt nie jest samodzielnym systemem operacyjnym ani jądrem Linux.
