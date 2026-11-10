# SPAA Host Sphere — wdrożenie na Debian 13

Ta ścieżka wdrożeniowa umożliwia obserwację usług **rzeczywistego
hosta Linux**, a nie tylko procesów i usług w kontenerze. Nie zmienia
kernela, kodu demonów ani ich uprawnień.

## Architektura produkcyjna

1. Nieuprzywilejowana usługa `testowe-host-observer.service` wykonuje
   **dwa równoległe odczyty**: systemd (w tym stopped/failed/disabled)
   oraz `/proc`. Zapisuje atomowo JSON w
   `/var/lib/debian13/observations/host-sphere.json`, z trybem `0640`.
2. Docker `agent-rest` dostaje **tylko odczyt** tego katalogu przez
   `docker-compose.host-spaa.yml`, z kontrolą wieku pomiaru i formatu.
3. SPAA scala hosta z Ollamą, Debian API, kolejką i innymi podłączonymi
   źródłami do jednego atomowo utrwalanego `sphereId`. Wszystkie
   cztery lokalne workery mają dostęp do tej samej wersji. Duże listy
   usług są skracane **wyłącznie w promptach AI**, a nie w chronionym
   źródłowym SQLite.
4. Publiczny agregat `/api/spaa/linux` wyświetla liczniki, etykietę
   pochodzenia `linux-host` / `observer-process-namespace` i stan
   mostu. Nie ujawnia nazw wszystkich usług.

## Uruchomienie (tylko na realnym hoście z systemd)

W aktualnym katalogu repozytorium:

```bash
git pull --ff-only origin main
sudo sh debian13/system/install.sh
sudo systemctl status testowe-host-observer.service --no-pager
sudo test -s /var/lib/debian13/observations/host-sphere.json
SPAA_HOST_SPHERE=1 bash scripts/start-debian13-ollama-agents.sh llama3.2-vision:11b
curl -fsS http://127.0.0.1:3000/api/spaa/linux
```

Wartość `SPAA_HOST_SPHERE=1` włącza nakładkę Compose przy **wszystkich**
etapach startu. Nie uruchamiaj później zwykłego `docker compose up`
bez pliku nakładki, bo Compose może odtworzyć kontenery bez montowania
mostu. W razie potrzeby użyj:

```bash
docker compose -f docker-compose.yml -f docker-compose.host-spaa.yml \
  --profile agents --profile debian13 up -d --build
```

Pierwsze uruchomienie Ollamy z modelem 11B wymaga pamięci i pobrania
pliku modelu. Użyj silnika na wydajnym hoście; testy GitHub Actions
nie oznaczają, że model został załadowany.

## Weryfikacja

```bash
sudo systemctl is-active testowe-host-observer.service
sudo systemctl is-active testowe-spaa.service
docker compose -f docker-compose.yml -f docker-compose.host-spaa.yml \
  --profile agents ps
curl -fsS http://127.0.0.1:3000/api/spaa/linux | python3 -m json.tool
python3 -m unittest discover -s integrations/agent-rest/tests -v
```

Prawidłowe połączenie hosta daje `hostBridge: "fresh"` oraz
`services.origin: "linux-host"`. `state: "online"` bez
`origin: "linux-host"` **nie oznacza**, że Docker widzi hosta.

W przypadku braku działającego systemd, błędu uprawnień lub zbyt starego
pliku wyniki są jawnie oznaczane jako niedostępne; nie wpisujemy stanu
ONLINE na podstawie samej konfiguracji.

### Rozgraniczenia

- `systemd` raportuje jednostki systemowe z widocznego menedżera usług;
  nie obejmuje automatycznie jednostek użytkowników, usług innego hosta
  ani wszystkiego poza systemd.
- `/proc` raportuje procesy dostępne dla przestrzeni PID kolektora.
  Nie wszystkie procesy są demonami. Przy konteneryzacji mamy odrębne
  namespace'y.
- Kolektor nie steruje usługami, nie wykonuje poleceń użytkownika, nie
  daje AI praw root i nie modyfikuje `systemd`.
- **Sferyczność** oznacza wspólny, wersjonowany obraz,
  **asynchroniczność** — współbieżne pozyskiwanie i kolejki,
  **polimorfizm** — adaptery różnych typów węzłów, a
  **asymetria** — odmienne kompetencje agentów i zakresy źródeł.
  To nie jest jednoczesny w sensie fizycznym odczyt dowolnego miejsca
  na świecie ani zmiana architektury kernela.
