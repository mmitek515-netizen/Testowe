# Debian 13 Trixie Live — KDE Plasma + AI Linux

Ten katalog zawiera **przepis na prawdziwe instalowalne ISO amd64** oparte na
Debianie 13 Trixie i standardowych pakietach live-build. To nowy etap,
nie dowód, że ISO zostało już zbudowane lub uruchomione na sprzęcie.

## Zawartość

- Debian 13 Trixie, oficjalne `linux-image-amd64`.
- KDE Plasma przez `live-task-kde`, Konsole, Firefox ESR, NetworkManager.
- Instalator Debiana Live (`--debian-installer live`) i skrót na pulpicie.
- Docker Engine + Compose v2 jako instalowane pakiety.
- Zarchiwizowany kod repozytorium Testowe w `/opt/ai-linux`, bez .git,
  cache i typowych plików sekretów, w tym `.env`.
- Skrót „AI Linux — Centrum sterowania”, uruchamiający lokalny panel,
  jeżeli działa; w przeciwnym razie przekazuje instrukcję startu.
- Polecenia `sudo ai-linux-start` i `ai-linux-health`.
- SPAA — model komunikacji i obserwacji oparty na
  sferycznym, polimorficznym, asynchronicznym i asymetrycznym
  przetwarzaniu podłączonych danych; nie zmienia kodu natywnych demonów.

## Budowanie obrazu

Na systemie Debian 13 **amd64**, w głównym katalogu repozytorium:

```bash
sudo apt update
sudo apt install -y live-build debootstrap squashfs-tools xorriso
bash debian13/live/build-iso.sh --check
sudo bash debian13/live/build-iso.sh --build
```

Wynik, jeśli kompilacja się powiedzie:
`debian13/live/work/live-image-amd64.hybrid.iso`
lub inny plik `*.iso` wskazany przez skrypt, oraz `*.sha256`.
Skrypt nie wypala obrazu na dysk USB, nie kasuje dysków systemu
i nie instaluje systemu samodzielnie. Przy każdym budowaniu czyści
tylko własny katalog `debian13/live/work`.

## Po pierwszym uruchomieniu i instalacji na dysku

```bash
sudo ai-linux-start
ai-linux-health
bash /opt/ai-linux/scripts/verify-ollama-vision-11b.sh --status
```

Pierwsze polecenie instaluje i włącza prywatne usługi hosta,
startuje Docker Compose i pobiera `llama3.2-vision:11b` przez
`ollama pull`. Wymagane są połączenie sieciowe, wystarczająca
ilość wolnego miejsca oraz RAM/VRAM dla modelu. Model ma
około 7.8 GB plików; nie jest umieszczony w ISO. Dlatego
bez sieci lub zasobów GUI KDE nadal powinno móc działać,
lecz czat lokalny może pozostać niedostępny.

Domyślnie nie włączamy Ollamy ani workerów AI przy każdym starcie Live,
bo mogłoby to blokować słabsze urządzenia. Zainstalowana dystrybucja
nie jest „AI gotowym do pracy” dopóki realna inferencja nie zostanie
potwierdzona.

## Kryteria zakończenia etapu

1. `live-build` musi wygenerować ISO; sprawdź SHA-256.
2. Uruchom ISO w VM z UEFI/BIOS; sprawdź kernel, login KDE, sieć i terminal.
3. Sprawdź instalację Debiana na testowym dysku wirtualnym.
4. Zainstaluj i uruchom AI Linux; sprawdź `/api/spaa/linux` oraz
   `services.origin=linux-host`.
5. `verify-ollama-vision-11b.sh --status` musi potwierdzić model
   w katalogu Ollamy. `--infer` umożliwia dodatkowo **prawdziwy**
   test odpowiedzi. `ollama ps` oznacza jedynie aktualnie załadowane
   modele, a nie trwałą instalację.
6. Dopiero wtedy oznaczamy wdrożenie Debiana 13 i Ollamy jako potwierdzone.

## Ważne ograniczenia

Zielony workflow GitHub Actions uruchamia szybki test konfiguracji,
**nie pełną kompilację ISO i nie test sprzętowy**. Obraz nie jest
obietnicą pełnej zgodności z każdym smartfonem (amd64 nie pasuje
do ARM). Uprawnienia root są dostępne operatorowi przez `sudo`,
a AI nie uzyskuje automatycznie nieograniczonego dostępu root.
