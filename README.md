# Testowe — AI Linux Control System

Webowy panel sterowania SVL i czterema personami AI (Astyria, Aurelius, Alex, Aria). Backend: Node.js/Express, frontend: React/Vite. Dostawcy modeli: Gemini lub Ollama.

## Uruchomienie na Debianie 13 / Ubuntu

Wymagania: Docker Engine + Docker Compose plugin.

1. Sklonuj repozytorium i przejdź do jego katalogu.
2. Skopiuj `.env.example` do `.env` i ustaw `GEMINI_API_KEY` albo adres dostępnego serwera Ollama.
3. Uruchom `docker compose up -d --build`.
4. Otwórz `http://localhost:3000` na komputerze z Dockerem.
5. Sprawdź `http://localhost:3000/api/health` i logi: `docker compose logs -f`.

Domyślnie port aplikacji jest dostępny wyłącznie na localhost. Dostęp z telefonu wymaga bezpiecznego reverse proxy z uwierzytelnianiem lub VPN; nie wystawiaj panelu bezpośrednio do Internetu.

### Ollama

Domyślny adres Ollama wewnątrz kontenera: `http://host.docker.internal:11434`. Na Linuxie Ollama musi nasłuchiwać na interfejsie osiągalnym z kontenera, a dostęp do jej API należy ograniczyć zaporą sieciową. Alternatywnie ustaw `OLLAMA_BASE_URL` na adres zaufanego serwera Ollama.

### Stan implementacji

- Dostępne: interfejs SVL, cztery persony, czat indywidualny, Okrągły Stół, endpointy Gemini/Ollama, health endpoint.
- W trakcie: wdrożenie i testy na Linuxie, status modeli w czasie rzeczywistym.
- Do zbudowania: trwała pamięć, kolejka zadań, niezależne workery, narzędzia GitHub, terminal z kontrolą uprawnień i audytem.

**Uwaga:** nazwy agentów i prompty nie oznaczają automatycznego połączenia z niezależnymi agentami z innego projektu. Ten projekt nie jest samodzielnym systemem operacyjnym ani jądrem Linux.
