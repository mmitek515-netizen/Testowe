# Testowe — AI Linux Control System

Webowy panel sterowania SVL i czterema personami AI (Astyria, Aurelius, Alex, Aria). Backend: Node.js/Express, frontend: React/Vite. Dostawcy modeli: Gemini lub Ollama.

## Uruchomienie na Debianie 13 / Ubuntu

Wymagania: Docker Engine + Docker Compose plugin.

1. Sklonuj repozytorium i przejdź do jego katalogu.
2. Skopiuj `.env.example` do `.env` i ustaw `GEMINI_API_KEY` albo adres dostępnego serwera Ollama.
3. Uruchom `bash scripts/start-debian13-ollama-agents.sh llama2-uncensored:7b` (lub `docker compose up -d --build` bez workera).
4. Otwórz `http://localhost:3000` na komputerze z Dockerem.
5. Sprawdź `http://localhost:3000/api/health` i logi: `docker compose logs -f`.

Domyślnie port aplikacji jest dostępny wyłącznie na localhost. Dostęp z telefonu wymaga bezpiecznego reverse proxy z uwierzytelnianiem lub VPN; nie wystawiaj panelu bezpośrednio do Internetu.

### Ollama

Domyślny adres Ollama w aktualnym Docker Compose: `http://ollama:11434` (prywatna sieć kontenerów). Domyślny model: `llama2-uncensored:7b`. Uruchom `bash scripts/start-debian13-ollama-agents.sh llama2-uncensored:7b`, aby skonfigurować istniejący `.env`, pobrać model i wykonać test statusu. Nie wystawiaj portu 11434 publicznie. Szczegóły: `docs/OLLAMA_DEBIAN13.md`.

### Stan implementacji

- Dostępne: interfejs SVL, cztery persony, czat indywidualny, Okrągły Stół, endpointy Gemini/Ollama, health endpoint.
- W trakcie: wdrożenie i testy na Linuxie, status modeli w czasie rzeczywistym.
- Do zbudowania: trwała pamięć, kolejka zadań, niezależne workery, narzędzia GitHub, terminal z kontrolą uprawnień i audytem.

**Uwaga:** nazwy agentów i prompty nie oznaczają automatycznego połączenia z niezależnymi agentami z innego projektu. Ten projekt nie jest samodzielnym systemem operacyjnym ani jądrem Linux.
