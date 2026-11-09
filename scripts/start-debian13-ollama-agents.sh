#!/usr/bin/env bash
# Idempotent launch of SPAA workers, Debian 13 and private Ollama.
set -Eeuo pipefail
cd "$(dirname "$0")/.."

command -v docker >/dev/null 2>&1 || { echo "Docker Engine is required" >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 is required" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required for secrets" >&2; exit 1; }
(( $# <= 1 )) || { echo "Usage: $0 [ollama-model]" >&2; exit 2; }

if [[ ! -f .env ]]; then cp .env.example .env; fi
chmod 600 .env

update_env() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env; then
    local tmp
    tmp="$(mktemp)"
    chmod 600 "$tmp"
    awk -v k="$key" -v v="$value" 'index($0,k"=")==1 {print k"="v; next} {print}' .env >"$tmp"
    cat "$tmp" > .env
    rm -f "$tmp"
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}
read_env() {
  grep "^$1=" .env | tail -n 1 | cut -d = -f 2- || true
}
if [[ -n "${1:-}" ]]; then
  [[ "$1" =~ ^[A-Za-z0-9._/-]+:[A-Za-z0-9._-]+$ ]] ||
    { echo "Invalid Ollama model tag" >&2; exit 2; }
  update_env OLLAMA_MODEL "$1"
fi
model="$(read_env OLLAMA_MODEL)"
# Migrate the project's previous default once; keep explicit custom selections.
if [[ -z "$model" || "$model" == 'llama2-uncensored:7b' ]]; then
  model='llama3.2-vision:11b'
  update_env OLLAMA_MODEL "$model"
fi
if [[ ! "$model" =~ ^[A-Za-z0-9._/-]+:[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid OLLAMA_MODEL in .env" >&2; exit 2
fi

for token_var in AGENT_API_TOKEN DEBIAN13_API_TOKEN; do
  current="$(read_env "$token_var")"
  if (( ${#current} < 32 )); then
    update_env "$token_var" "$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
  fi
done

# Keep the Debian 13 chat default aligned with the selected Ollama model.
# Never replace a deliberately configured non-default external provider.
if [[ -z "$(read_env MODEL_CHAT_URL)" ]]; then
  old_name="$(read_env MODEL_NAME)"
  if [[ -z "$old_name" || "$old_name" == 'llama2-uncensored:7b' ]]; then
    update_env MODEL_NAME "$model"
  fi
fi
old_vision="$(read_env VISION_MODEL_NAME)"
if [[ -z "$old_vision" || "$old_vision" == 'llama2-uncensored:7b' ]]; then
  update_env VISION_MODEL_NAME 'llama3.2-vision:11b'
fi

echo "Stage 1: start private Ollama"
docker compose up -d ollama
docker compose exec -T ollama ollama pull "$model"
docker compose exec -T ollama ollama show "$model"

echo "Stage 2: start Debian 13, SVL and spherical SPAA worker service"
docker compose --profile agents --profile debian13 up -d --build \
  debian13-system agent-rest ai-linux-control

app_port="$(read_env APP_PORT)"
app_port="${app_port:-3000}"
[[ "$app_port" =~ ^[0-9]{1,5}$ ]] || { echo "APP_PORT must be numeric" >&2; exit 2; }

echo "Checking APIs"
for i in {1..30}; do
  if curl --silent --fail --max-time 2 "http://127.0.0.1:${app_port}/api/health" >/dev/null; then break; fi
  sleep 2
done
for endpoint in health debian13/status spaa/status; do
  curl --fail --show-error --silent "http://127.0.0.1:${app_port}/api/$endpoint"
  printf '\n'
done
echo "Started. Original external agent identities remain unverified."