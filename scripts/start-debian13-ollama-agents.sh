#!/usr/bin/env bash
# Idempotent Debian 13 bootstrap for SVL Kernel, Ollama 8B and local worker.
# This starts a local worker, NOT a verified original external agent.
set -Eeuo pipefail
cd "$(dirname "$0")/.."

command -v docker >/dev/null 2>&1 || { echo "Docker Engine is required" >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 plugin is required" >&2; exit 1; }

if [[ ! -f .env ]]; then
  cp .env.example .env
fi
chmod 600 .env

if ! grep -Eq '^AGENT_API_TOKEN=[a-fA-F0-9]{64}$' .env; then
  if command -v openssl >/dev/null 2>&1; then
    token="$(openssl rand -hex 32)"
  elif command -v python3 >/dev/null 2>&1; then
    token="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
  else
    echo "Need openssl or python3 to create the private worker token" >&2
    exit 1
  fi
  if grep -q '^AGENT_API_TOKEN=' .env; then
    sed -i "s/^AGENT_API_TOKEN=.*/AGENT_API_TOKEN=${token}/" .env
  else
    printf '\nAGENT_API_TOKEN=%s\n' "$token" >> .env
  fi
fi
unset token

model="$(grep -E '^OLLAMA_MODEL=' .env | tail -n 1 | cut -d '=' -f 2- | tr -d '\r')"
model="${model:-Thox-ai/thoxopen-8b-heretic:q4_k_m}"

echo "Starting private Ollama 8B + SVL control backend + local SQLite worker..."
docker compose --profile agents up -d --build

echo "Downloading/verifying model: $model"
docker compose exec -T ollama ollama pull "$model"
docker compose exec -T ollama ollama show "$model"

echo "Checking backend and private worker..."
app_port="$(grep -E '^APP_PORT=' .env | tail -n 1 | cut -d '=' -f 2- | tr -d '\r')"
app_port="${app_port:-3000}"
for attempt in {1..30}; do
  if curl --silent --fail "http://127.0.0.1:${app_port}/api/health" >/dev/null; then
    break
  fi
  sleep 2
done
curl --silent --show-error --fail "http://127.0.0.1:${app_port}/api/ollama/status"
printf '\n'
curl --silent --show-error --fail "http://127.0.0.1:${app_port}/api/agents/status"
printf '\n'
curl --silent --show-error --fail "http://127.0.0.1:${app_port}/api/local-worker/status"
printf '\n'
echo "SVL Kernel: http://127.0.0.1:${app_port}"
echo "Note: local task worker processes Ollama tasks but is not verified as any original Aria/Alex/Astyria/Aurelius agent."
