# Llama 3.2 Vision 11B + SVL Kernel — Debian 13 Trixie

## Architektura

`docker-compose.yml` uruchamia trzy podstawowe usługi oraz opcjonalnego workera `agent-rest` (profil `agents`):
- `ollama` — właściwy serwer inferencji, dostępny **wyłącznie w prywatnej sieci Docker**, bez publicznego portu 11434;
- `ollama-pull` — pobiera model `llama3.2-vision:11b` do trwałego woluminu `ollama_models`;
- `ai-linux-control` — backend Express + GUI Vite, rozmawia z Ollamą przez wewnętrzny adres `http://ollama:11434`.

Baza docelowa: **Debian 13 host**, na którym zainstalowane są Docker Engine i aktualny plugin Docker Compose v2. To kontenery aplikacji; sam stack **nie jest jeszcze bootowalną dystrybucją Debian 13**.

## Jednorazowe uruchomienie

```bash
git clone https://github.com/mmitek515-netizen/Testowe.git
cd Testowe
cp .env.example .env
# Skonfiguruj tylko potrzebne klucze Gemini (opcjonalnie), lokalnie, poza repozytorium.
bash scripts/start-debian13-ollama-agents.sh llama3.2-vision:11b
# Opcjonalnie: obserwuj pobieranie modelu
docker compose logs -f ollama-pull
```

Domyślny model `llama3.2-vision:11b` ma około 7,8 GB samych wag. Ollama podaje minimum 8 GB VRAM dla wersji 11B; CPU lub mały Codespace mogą nie wystarczyć do płynnej inferencji. Uwzględnij dodatkową pamięć na kontekst, system oraz inne kontenery. Kod modelu wspiera tekst i obraz, ale status `modelInstalled` potwierdza tylko instalację.

## Kontrola rzeczywistego działania

```bash
docker compose ps
docker compose exec -T ollama ollama list
curl -fsS http://127.0.0.1:3000/api/ollama/status
curl -fsS -X POST http://127.0.0.1:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"personaId":"alex","message":"Odpowiedz krótko: czy model działa?","provider":"ollama"}'
```

Odpowiedź statusowa powinna podać `online: true`, `model: llama3.2-vision:11b`, `modelInstalled: true`. Jeśli `modelInstalled: false`, obserwuj logi usługi `ollama-pull` albo wykonaj `docker compose exec -T ollama ollama pull llama3.2-vision:11b`.

Stan czatu pokazuje działanie **persony poprzez model Ollama**, ale nie dowodzi podłączenia oryginalnego, autonomicznego agenta. Misje AI nadal wymagają osobnego wykonawcy zadań.

## Co zobaczysz w Google AI Studio?

Hosted Preview Google AI Studio **nie uruchamia automatycznie** kontenerów Docker zapisanych w repozytorium. Dla chmurowego backendu `127.0.0.1:11434` oznacza jego własny kontener, a nie lokalny Debian. Aby używać lokalnej Ollamy przez sieć, skonfiguruj uwierzytelniony prywatny tunel/VPN z backendu do zaufanego hosta lub uruchom SVL Kernel bezpośrednio na Debianie. Nie wystawiaj `11434` publicznie i nie ustawiaj `OLLAMA_ORIGINS=*`.

Adres i model w panelu Ollamy to **wartości pochodzące z backendu**, a nie zmiany wykonywane przez przeglądarkę.

**Uwaga:** istniejący plik `.env` może nadal wskazywać wcześniejszy model 7B/8B. Podanie `llama3.2-vision:11b` jako argumentu skryptu aktualizuje `OLLAMA_MODEL` w `.env`. Stary model pozostaje na dysku do ręcznego usunięcia. Aby powrócić do 8B, podaj jego pełny tag jako argument.

## Rozwiązywanie problemów

- `online:false` / 503: usługa Ollama nieosiągalna z backendu, sprawdź `docker compose ps` i `docker compose logs ollama`.
- `modelInstalled:false`: trwa pobieranie lub model nie został pobrany; sprawdź `docker compose logs ollama-pull`.
- `HTTP 200 <!doctype html>`: żądanie `/api/ollama/status` trafiło do serwera strony (SPA) zamiast endpointu Express. Uruchom aplikację przez backend `npm run dev`/Docker, a nie samą komendą `vite`, sprawdź reverse proxy i tablicę tras `/api/*`. Otrzymanie HTML nie oznacza, że model jest zainstalowany lub że działa. Nie parsuj HTML jako JSON.
- Stan przydzielonych misji pozostaje `planned` do czasu podłączenia rzeczywistych executorów. 


### Wizja i obrazy

Ustawienia `OLLAMA_MODEL`, `MODEL_NAME` i `VISION_MODEL_NAME` wskazują na `llama3.2-vision:11b`. Serwer Debiana 13 ma endpoint `/v1/vision` z walidacją PNG/JPEG, a czat SVL korzysta z Ollamy. Model potrafi analizować obrazy, jeśli przesłano je do API `images`; sam tekstowy chat nie przesyła plików bez dodatkowego pola. Standard modelu nie oznacza, że został już pobrany lub zmieści się w RAM hosta.
