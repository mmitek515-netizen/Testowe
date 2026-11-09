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


## Pełna siatka komunikacji 4×4 (każdy z każdym)

Wszystkie cztery lokalne procesy wykonawcze używają **tej samej bazy SQLite
i tej samej generacji sfery**. Połączenia logiczne są kierunkowe: czterech
workerów × trzech pozostałych = **12 tras**. Żadne osobne transporty między
agentami nie są niezbędne.

1. Każde zadanie otrzymuje identyfikator bieżącej sfery (\`sphereId\`).
2. Po ukończeniu zadania worker zapisuje pojedynczą wiadomość statusową dla
   każdego z pozostałych trzech workerów (\`mesh_messages\`). Nie przekazuje
   pełnej, potencjalnie wrażliwej odpowiedzi.
3. Każdy worker asynchronicznie odbiera wiadomości, zapisuje potwierdzenia
   (\`deliveredAt\`) i ma ostatnie komunikaty dostępne przy następnym zadaniu.
4. Odbiór nie uruchamia automatycznie kolejnego modelu ani zadania, co
   zapobiega nieograniczonym pętlom wymiany wiadomości.
5. Każda wiadomość zachowuje \`sender\`, \`recipient\`, \`sphereId\`,
   \`kind\`, \`state\` i czas utworzenia/dostarczenia.

Autoryzowany kanał wewnętrzny:

- \`GET /mesh\` — członkowie, wszystkie 12 tras, dostępność i zaległości
- \`GET /mesh/messages\` — metadane ostatnich wiadomości (bez pełnej treści)
- \`POST /mesh/send\` — notatka operatora do wybranego workera lub \`*\`;
  serwer zapisuje prawdziwego nadawcę jako \`operator\`, nie pozwala podszyć
  się pod agenta

Przykład wiadomości (tylko wewnętrzne API za tokenem):

\`\`\`json
{"recipient":"*","body":"Zbierzcie raport ze wspólnej sfery"}
\`\`\`

Backend SVL wystawia **tylko podgląd** \`GET /api/spaa/mesh\`, bez sekretu
i bez otwartego zapisu. Interaktywny panel pozwala wybrać workera i obejrzeć
jego trzy dwukierunkowe połączenia. \`available=true\` oznacza aktywne
heartbeat obu lokalnych workerów, nie tożsamość oryginalnych agentów.

Testy \`integrations/agent-rest/tests/test_spaa_runtime.py\` sprawdzają
12 kierunków, dostarczenie do pozostałych workerów, wspólne \`sphereId\`,
potwierdzenia, uwierzytelnienie i brak automatycznych kaskad.

**Zakres:** pełna siatka obejmuje 4 lokalne workery tego demona.
Pozostałe komponenty systemu, host lub sieci zewnętrzne są obserwowane
tylko przez zarejestrowane konektory i zgodnie z uprawnieniami.


## SPAA dla wszystkich obserwowalnych demonów Linuxa

W implementacji sfera ma teraz dwa dodatkowe, równolegle uruchamiane źródła
(`integrations/agent-rest/systemd_observer.py`):

- `linux.systemd.services`: dwa stałe odczyty `systemctl list-units
  --type=service --all` i `systemctl list-unit-files --type=service`.
  Dzięki temu jedna generacja sfery obejmuje uruchomione, zatrzymane, uszkodzone,
  wyłączone i statyczne jednostki usługowe widoczne dla menedżera systemd.
  Każda jednostka ma odrębny węzeł z nazwą i stanem, ale współdzieli
  identyfikator generacji `sphereId` z wszystkimi pozostałymi źródłami.
- `linux.procfs.processes`: odczyt nazw widocznych procesów i PID z
  `/proc`, bez argumentów uruchomieniowych, zmiennych środowiska ani pamięci
  procesów. **Nie każdy proces to demon.** W kontenerze ta lista dotyczy jego
  przestrzeni PID, a nie automatycznie wszystkich procesów hosta.

Dane każdego źródła zbierane są **współbieżnie**, a następnie commitowane
atomowo do tego samego SQLite. Każdy lokalny worker SPAA może wykorzystać
ten sam obraz usług (w ograniczeniu wejścia do modelu). Odmienny typ węzła
(`systemd` / `procfs` / `Ollama` / `Debian`) ma własny adapter, zakres
widoczności i stan: to polimorfizm i asymetria obserwacji, nie przebudowa
binarnych kodów innych demonów. Jeśli źródło nie odpowiada, jest oznaczane
jako niedostępne, a nie jako online.

**Granice:** nie istnieje fizyczna wszechwiedza ani absolutnie jednoczesny
odczyt wszystkich systemów. `systemd` obejmuje jednostki zarządzane przez
dostępnego menedżera usług; procesy poza nim wymagają osobnych adapterów.
Skaner nie modyfikuje żadnego demona, kernela, jego praw ani harmonogramu.
Usługi Linuxa **nie stają się same z siebie workerami AI**. Ich stan można
udostępnić wszystkim workerom za pomocą jednego punktu dystrybucji sfery
zamiast tworzyć połączenia w liczbie N×N.

**Wdrożenie:** systemowa instalacja przez `debian13/system/install.sh`
umieszcza skaner obok demona SPAA i korzysta z hostowego `systemctl`.
W kontenerze `agent-rest` może nie widzieć menedżera systemd hosta;
sam plik repozytorium i zielone testy CI tego nie zmieniają. Po instalacji
na rzeczywistym hoście należy sprawdzić `/sphere` i potwierdzić odczyt
`linux.systemd.services`.

Dashboard: `GET /api/spaa/linux` prezentuje tylko liczby zagregowane
(online/offline/failed, liczbę procesów, `sphereId`, dostępność i znaczniki
czasu). Szczegółowe nazwy jednostek pozostają w chronionym API SPAA
`GET /sphere` — nie są publicznie wysyłane do widoku frontendu.
Limit wynosi 2048 węzłów na źródło; po przekroczeniu pojawia się flaga
`truncated` i pełna liczba wpisów, bez fałszywej deklaracji kompletności.
