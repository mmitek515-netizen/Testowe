#!/usr/bin/env bash
# Focused checks for the imported Debian 13 runtime. Does not deploy or execute model commands.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
echo "== Debian 13: Python syntax and task/HTTP unit tests =="
python3 -m compileall -q debian13/system
python3 -m unittest discover -s debian13/system/tests -v
echo "== Bootstrap shell syntax =="
bash -n scripts/start-debian13-ollama-agents.sh scripts/run-codespace-missions.sh
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "== Docker Compose model validation =="
  docker compose config --quiet
else
  echo "Docker Compose unavailable: skipping configuration check (not a PASS)."
fi
port="${APP_PORT:-3000}"
if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "http://127.0.0.1:${port}/api/health" >/dev/null; then
  echo "== Live Debian 13 API state (not inference or boot verification) =="
  curl -fsS --max-time 5 "http://127.0.0.1:${port}/api/debian13/status" | python3 -c 'import json,sys; data=json.load(sys.stdin); print("state:",data.get("state"),"modelProviderConfigured:",data.get("modelProviderConfigured"),"originalAgentsVerified:",data.get("originalAgentsVerified"))'
else
  echo "SVL API not running locally: skipping runtime probe (not a PASS)."
fi
