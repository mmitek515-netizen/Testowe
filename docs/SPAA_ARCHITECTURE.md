# SPAA — architektura workerów Testowe

SPAA = **Spherical, Polymorphic, Asynchronous, Asymmetric**.

- **Sferyczne:** wspólny widok stanu wszystkich *podłączonych* źródeł. Nie oznacza dostępu do danych, które nie zostały udostępnione.
- **Polimorficzne:** worker deklaruje obsługiwane typy zadań; nie każda operacja musi być dozwolona.
- **Asynchroniczne:** obserwacje wykonywane równolegle; limit jednoczesnych zadań.
- **Asymetryczne:** każdy worker może mieć inne możliwości i limity.

## Implementacja początkowa

`src/core/spaaWorkers.ts` zawiera:
1. `SphericalObserver` — rejestr źródeł obserwacji, równoległe zbieranie danych, błędy i timeouty.
2. `SPAAOrchestrator` — rejestr workerów, deklarowane możliwości, stany wykonania i limit współbieżności.

## Kolejne etapy

- Podłączyć rzeczywiste źródła: Linux, Ollama, GitHub, zadania, logi i pamięć.
- Przenieść wykonanie do backendu (nie uruchamiać zadań systemowych w przeglądarce).
- Dodać trwałą kolejkę, historię, restart zadań i monitoring.
- Dodać uwierzytelnianie, audyt i odrębne uprawnienia do odczytu oraz modyfikacji systemu.

**Stan:** kod biblioteki SPAA jest szkieletem, nie uruchomionym daemonem ani gwarancją dostępu do całego hosta.
