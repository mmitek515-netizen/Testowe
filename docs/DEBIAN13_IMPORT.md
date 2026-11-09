# Debian 13 runtime integration: Testowe

Source: [mmitek515-netizen/Debian_13](https://github.com/mmitek515-netizen/Debian_13), `debian13/system/`, copied into the project's `main` branch and adapted for this React/Express/Compose stack (9 November 2026).

## What was actually imported

- Python HTTP API: `/healthz`, `/v1/diagnostics`, `/v1/profiles`, `/v1/chat`, `/api/v1/tasks`
- SQLite task/event ledger. **Stored tasks do not execute themselves.**
- MCP stdio read-only gateway for local clients, separate from public HTTP endpoints.
- A restricted command terminal inside a non-root container (not an unrestricted host root shell).
- Debian 13-slim Docker configuration, optional systemd host installer, and Python tests.

This does not boot Debian 13, build an ISO, run KDE Plasma or verify the original named agents. Those are separate deliverables in issues #2–#10.

## How it joins the existing Testowe stack

`docker-compose.yml` has an optional profile `debian13` with `debian13-system`. The normal bootstrap script starts **two independent services** plus the SVL app: (1) private Ollama (model defaults to `llama2-uncensored:7b`), (2) private Debian API bound to Docker's internal network. The Debian API calls Ollama's OpenAI-compatible `http://ollama:11434/v1/chat/completions` endpoint when configured. `MODEL_API_KEY=ollama-local` is a dummy string for the local API; it is not a purchased token.

The SVL Node backend is the only consumer of the Debian API token. It reads diagnostics, profiles, and up to 100 task rows via an allowlisted internal HTTP address. It returns only sanitized summary fields to the browser via `GET /api/debian13/status`. No root command or task creation is exposed by this bridge. The dashboard refreshes every 20 seconds. A live status only verifies the API; model inference remains unverified until a real chat request succeeds.

## Startup on a Debian 13 / Docker-capable host or Codespace

From the root of `Testowe`:

```bash
git switch main && git pull --ff-only
bash scripts/start-debian13-ollama-agents.sh llama2-uncensored:7b
curl -fsS http://127.0.0.1:3000/api/debian13/status | python3 -m json.tool
```

`.env` must remain local and not committed. The bootstrap generates secrets for both private services, leaving any existing operator token intact. To start Debian 13 without the optional local AI worker:

```bash
docker compose --profile debian13 up -d --build ollama debian13-system ai-linux-control
```

An unset `DEBIAN13_API_TOKEN` prevents the Debian service from starting; this is deliberate. The GUI should show `not-configured` or `offline`, not `online`. The runtime is not published to a public host port. Keep port 3000 private in Codespaces or use proper access control.

## Focused validation

```bash
bash scripts/verify-debian13-runtime.sh
```

This checks Python compilation and the imported unit tests. It optionally runs Docker Compose syntax validation and a live status probe when the dependencies are present. A passing source test is **not** an OS installer or AI inference test. A browser connection to localhost, without this Compose stack running on that same host, will not reach Ollama.

## Key limitations

- `GET /api/debian13/status` reads a bounded snapshot; it does not start services.
- `modelProviderConfigured=true` is configuration state, not successful model inference.
- `workersRunning=0` in the imported runtime is intentional: the WorkStore is a queue for review, not autonomous code workers.
- Names Aria, Alex, Astyria, Aurelius in the UI currently represent conversation profiles and routing labels. Their external identities and callback activity must be independently verified.
- A real Debian 13 desktop/ISO build requires boot, hardware, and GUI testing on the actual target VM/host.
