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

### Sferyczna obserwacja demonów hosta (systemd)

Dla **prawdziwego Debiana 13** można zainstalować kolektor hosta
`sudo sh debian13/system/install.sh`, a następnie uruchomić środowisko
z `SPAA_HOST_SPHERE=1 bash scripts/start-debian13-ollama-agents.sh llama3.2-vision:11b`.
Panel SPAA odróżnia realny pomiar hosta od przestrzeni PID kontenera.
Szczegóły i wymagania: [docs/HOST_SPHERE_DEPLOYMENT.md](docs/HOST_SPHERE_DEPLOYMENT.md).
Bez zainstalowanej usługi hosta wariant Docker nie potrafi obserwować
wszystkich natywnych demonów Linuxa.

### Ollama

Domyślny adres Ollama w aktualnym Docker Compose: `http://ollama:11434` (prywatna sieć kontenerów). Domyślny model: `llama3.2-vision:11b`. Uruchom `bash scripts/start-debian13-ollama-agents.sh llama3.2-vision:11b`, aby skonfigurować istniejący `.env`, pobrać model i wykonać test statusu. Nie wystawiaj portu 11434 publicznie. Szczegóły: `docs/OLLAMA_DEBIAN13.md`.

### Stan implementacji

- Dostępne w kodzie: interfejs SVL, cztery persony, czat, endpointy Gemini/Ollama, health API oraz SPAA z trwałą kolejką SQLite, czterema lokalnymi workerami, pełną logiczną siatką 12 połączeń i chronioną historią sfer.
- Nowe: obserwator hostowego systemd i /proc, skompaktowany kontekst telemetrii dla AI, czytelne oznaczanie czy odczyty dotyczą hosta, czy kontenera.
- W trakcie: wdrożenie i test na rzeczywistym Linuxie, weryfikacja inferencji Ollama i podłączenie oryginalnych zewnętrznych agentów.
- Osobne wymagania na przyszłość: GitHub coding executor, rozbudowa terminala systemowego oraz uruchomienie kompletnego instalowalnego systemu operacyjnego.

**Uwaga:** nazwy agentów i prompty nie oznaczają automatycznego połączenia z niezależnymi agentami z innego projektu. Ten projekt nie jest samodzielnym systemem operacyjnym ani jądrem Linux.
