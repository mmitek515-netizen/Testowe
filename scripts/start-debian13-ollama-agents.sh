#!/usr/bin/env bash
# Idempotent Debian 13 bootstrap for SVL Kernel, Ollama 7B and local worker.
# This starts a local worker, NOT a verified original external agent.
set -Eeuo pipefail
cd "$(dirname "$0")/.."

command -v docker >/dev/null 2>&1 || { echo "Docker Engine is required" >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 plugin is required" >&2; exit 1; }

if [[ ! -f .env ]]; then
  cp .env.example .env
fi
chmod 600 .env

# An explicit model argument can replace an older 8B selection in an existing .env.
# Example: bash scripts/start-debian13-ollama-agents.sh llama2-uncensored:7b
if (( $# > 1 )); then
  echo "Usage: $0 [ollama-model-tag]" >&2
  exit 2
fi
if [[ -n "${1:-}" ]]; then
  requested_model="$1"
  if [[ ! "$requested_model" =~ ^[A-Za-z0-9._/-]+:[A-Za-z0-9._-]+$ ]]; then
    echo "Invalid Ollama model tag: $requested_model" >&2
    exit 2
  fi
  if grep -q '^OLLAMA_MODEL=' .env; then
    sed -i "s|^OLLAMA_MODEL=.*|OLLAMA_MODEL=${requested_model}|" .env
  else
    printf 'OLLAMA_MODEL=%s\n' "$requested_model" >> .env
  fi
fi

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
model="${model:-llama2-uncensored:7b}"

# Stage 1: Ollama must be independent of the React/Node image build.
# If npm install fails, the user's model must still start and remain usable.
echo "Stage 1/2: Starting private Ollama before building the web application..."
docker compose up -d ollama

echo "Downloading/verifying model: $model"
docker compose exec -T ollama ollama pull "$model"
docker compose exec -T ollama ollama show "$model"
docker compose exec -T ollama ollama list
echo "Ollama is started; web app build is a separate step."

# Stage 2: launch the application and optional local task worker.
echo "Stage 2/2: Building SVL GUI/backend and starting local task worker..."
if ! docker compose --profile agents up -d --build ai-linux-control agent-rest; then
  echo >&2 "The Node/React Docker image failed to build, but Ollama should still be running."
  echo >&2 "To inspect the actual npm error, run:"
  echo >&2 "docker compose build --no-cache --progress=plain ai-linux-control 2>&1 | tee npm-build.log"
  echo >&2 "Send the last lines of npm-build.log (do not include .env or access tokens)."
  docker compose ps || true
  exit 1
fi

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
