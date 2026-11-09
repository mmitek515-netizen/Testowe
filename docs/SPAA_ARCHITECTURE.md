# SPAA — jedyny standard wykonawczy workerów i demonów AI w Testowe

SPAA oznacza **Spherical, Polymorphic, Asynchronous, Asymmetric** — sferyczne, polimorficzne, asynchroniczne i asymetryczne. W całym projekcie **wszystkie workery wykonujące zadania AI mają używać SPAA**, nie osobnych niesynchronizowanych pętli.

## Jeden autorytatywny mechanizm

`integrations/agent-rest/agent_rest.py` to **uruchamiany w tle demon SPAA** z czterema niezależnymi workerami lokalnymi. Konfiguracja `docker-compose.yml` uruchamia usługę `agent-rest` z osobnym, trwałym wolumenem SQLite.

- **Sferyczność:** jedno atomowo zatwierdzane `sphereId` z obserwacjami wszystkich zarejestrowanych źródeł. Każde zadanie otrzymuje to samo bieżące `sphereId`, jeśli zaczyna się w tej samej generacji. Wpisy są znaczone czasem i błędami. Nie oznacza dostępu do niepołączonych systemów ani odczytu prywatnych danych bez autoryzacji.
- **Polimorfizm:** zadania `diagnostics` obsługiwane są deterministycznie i zwracają sferę bez wywołania modelu; `analysis`, `research`, `integration` używają Ollamy ze specyficzną instrukcją i udokumentowanym ograniczeniem zakresu.
- **Asymetria:** każdy worker ma inny zestaw kompetencji, choć widzi całą wspólną sferę. `Aria`: analysis/research; `Alex`: analysis/integration; `Astyria`: analysis/research; `Aurelius`: analysis/diagnostics/integration.
- **Asynchroniczność:** cztery wątki workerów realizują kolejkę równolegle z osobnym demonem obserwacji. Zapytania modelowe korzystają z pojedynczego semafora, aby ograniczyć zużycie RAM; diagnostyka nie musi czekać na model. SQLite zachowuje zadania po restarcie i przywraca niezakończone do kolejki.

## Źródła sfery

Źródła są **statyczne** i ograniczone do skonfigurowanej sieci: `ollama.models`, `ollama.loaded`, `debian.health`, `debian.diagnostics` (autoryzowane), `svl.health` i `tasks.queue`. Niedostępność źródła jest zapisywana jako błąd, a nie zamieniana na status online. Obserwacje zbierane są współbieżnie i zatwierdzane w jednym commicie SQLite.

## API wewnętrzne SPAA

Wszystkie ścieżki wymagają nagłówka `Authorization: Bearer AGENT_API_TOKEN`. Nie wystawiaj serwisu poza prywatną sieć Docker:

- `GET /health` — stan demona, liczba workerów i modelu (konfiguracja/instalacja, nie udana inferencja)
- `GET /sphere` — atomowa sfera i `sphereId`
- `GET /sphere/workers` — stany procesów, kompetencje i identyfikator wersji
- `GET /agents` — kompatybilny widok czterech workerów
- `GET /tasks` oraz `GET /tasks/<id>` — kolejka i wyniki
- `POST /tasks` — kolejka: `{"agent":"Aurelius","kind":"diagnostics","description":"Diagnostyka"}`
- `POST /sphere/refresh` — natychmiastowe odświeżenie tylko czujników, nie wykonywanie poleceń

Bramka Node/Express udostępnia bez sekretów `GET /api/spaa/sphere` i rozszerza `GET /api/spaa/status`, a dashboard odczytuje tę samą sferę. Kod biblioteki `src/core/spaaWorkers.ts` nie jest osobnym autonomicznym demonem.

## Granice systemu

Demon SPAA nie ma możliwości wykonywania poleceń root, pisania plików projektu ani korzystania z niepodłączonych usług. `Debian13 System API` oraz `Node/Express` są **usługami platformy**, nie dodatkowymi agentami wykonawczymi — dostarczają odczyty do SPAA. Cztery lokalne nazwy to etykiety routingu, **nie zweryfikowana tożsamość oryginalnych agentów**. Dalsze adaptery systemowe muszą respektować ten kontrakt, jawne uprawnienia i audyt.

## Sprawdzenie

```bash
python3 -m unittest discover -s integrations/agent-rest/tests -v
python3 -m unittest discover -s debian13/system/tests -v
bash scripts/start-debian13-ollama-agents.sh llama2-uncensored:7b
curl -fsS http://127.0.0.1:3000/api/spaa/status
curl -fsS http://127.0.0.1:3000/api/spaa/sphere
```

Zielone testy repozytorium nie dowodzą, że usługi uruchomiono na docelowym Codespace czy że model faktycznie odpowiedział; do tego potrzebna jest weryfikacja środowiska.
