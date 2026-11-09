# Ollama 8B + SVL Kernel — Debian 13 Trixie

## Architektura

`docker-compose.yml` uruchamia trzy usługi:
- `ollama` — właściwy serwer inferencji, dostępny **wyłącznie w prywatnej sieci Docker**, bez publicznego portu 11434;
- `ollama-pull` — pobiera model `dolphin3:8b` do trwałego woluminu `ollama_models`;
- `ai-linux-control` — backend Express + GUI Vite, rozmawia z Ollamą przez wewnętrzny adres `http://ollama:11434`.

Baza docelowa: **Debian 13 host**, na którym zainstalowane są Docker Engine i aktualny plugin Docker Compose v2. To kontenery aplikacji; sam stack **nie jest jeszcze bootowalną dystrybucją Debian 13**.

## Jednorazowe uruchomienie

```bash
git clone https://github.com/mmitek515-netizen/Testowe.git
cd Testowe
cp .env.example .env
# Skonfiguruj tylko potrzebne klucze Gemini (opcjonalnie), lokalnie, poza repozytorium.
docker compose up -d --build
docker compose logs -f ollama-pull
```

Na pierwszy start trzeba pobrać ~4.9 GB modelu. Wymagane jest dodatkowe miejsce na obrazy Dockera; 8–12 GB RAM jest rozsądnym punktem wyjścia dla tego modelu, szczególnie przy jednoczesnym backendzie i innych procesach.

## Kontrola rzeczywistego działania

```bash
docker compose ps
docker compose exec -T ollama ollama list
curl -fsS http://127.0.0.1:3000/api/ollama/status
curl -fsS -X POST http://127.0.0.1:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"personaId":"alex","message":"Odpowiedz krótko: czy model działa?","provider":"ollama"}'
```

Odpowiedź statusowa powinna podać `online: true`, `model: dolphin3:8b`, `modelInstalled: true`. Jeśli `modelInstalled: false`, obserwuj logi usługi `ollama-pull` albo wykonaj `docker compose exec -T ollama ollama pull dolphin3:8b`.

Stan czatu pokazuje działanie **persony poprzez model Ollama**, ale nie dowodzi podłączenia oryginalnego, autonomicznego agenta. Misje AI nadal wymagają osobnego wykonawcy zadań.

## Co zobaczysz w Google AI Studio?

Hosted Preview Google AI Studio **nie uruchamia automatycznie** kontenerów Docker zapisanych w repozytorium. Dla chmurowego backendu `127.0.0.1:11434` oznacza jego własny kontener, a nie lokalny Debian. Aby używać lokalnej Ollamy przez sieć, skonfiguruj uwierzytelniony prywatny tunel/VPN z backendu do zaufanego hosta lub uruchom SVL Kernel bezpośrednio na Debianie. Nie wystawiaj `11434` publicznie i nie ustawiaj `OLLAMA_ORIGINS=*`.

Adres i model w panelu Ollamy to **wartości pochodzące z backendu**, a nie zmiany wykonywane przez przeglądarkę.

## Rozwiązywanie problemów

- `online:false` / 503: usługa Ollama nieosiągalna z backendu, sprawdź `docker compose ps` i `docker compose logs ollama`.
- `modelInstalled:false`: trwa pobieranie lub model nie został pobrany; sprawdź `docker compose logs ollama-pull`.
- `Unexpected token '<'`: HTTP endpoint zwrócił stronę HTML zamiast JSON; sprawdź port aplikacji i endpoint API. Nie parsuj błędnej odpowiedzi jako JSON.
- Stan przydzielonych misji pozostaje `planned` do czasu podłączenia rzeczywistych executorów. 
