#!/usr/bin/env bash
# Inspect the REAL Ollama container. No synthetic success statuses.
# --infer optionally sends one real inference request (can take time/RAM).
set -Eeuo pipefail
cd "$(dirname "$0")/.."
mode="${1:---status}"
[[ "$mode" == "--status" || "$mode" == "--infer" ]] || {
  echo "Usage: bash scripts/verify-ollama-vision-11b.sh [--status|--infer]" >&2; exit 2;
}
command -v docker >/dev/null || { echo "Docker missing. Model cannot be verified." >&2; exit 1; }
docker compose version >/dev/null || { echo "Docker Compose missing." >&2; exit 1; }
model="$(sed -n 's/^OLLAMA_MODEL=//p' .env 2>/dev/null | tail -n1 || true)"
model="${model:-llama3.2-vision:11b}"
[[ "$model" =~ ^[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+$ ]] || {
  echo "Invalid Ollama model configured" >&2; exit 2;
}
echo "Configured model: $model"
echo "Checking runtime (not just repository configuration)..."
if ! docker compose -f docker-compose.yml ps --status running --services | grep -qx ollama; then
  echo "Ollama runtime: NOT RUNNING or not reachable"; exit 1
fi
echo "Ollama runtime: running"
if ! models="$(docker compose -f docker-compose.yml exec -T ollama ollama list)"; then
  echo "Ollama model inventory unavailable" >&2; exit 1
fi
if ! printf '%s\n' "$models" | awk -v model="$model" 'NR>1 && $1==model {seen=1} END {exit !seen}'; then
  echo "Model not installed: $model"
  echo "To download: docker compose exec -T ollama ollama pull $model"
  exit 3
fi
echo "Model installed: $model"
if loaded="$(docker compose -f docker-compose.yml exec -T ollama ollama ps 2>/dev/null)"; then
  if printf '%s\n' "$loaded" | awk -v model="$model" 'NR>1 && $1==model {seen=1} END {exit !seen}'; then
    echo "Model loaded into runtime: YES"
  else
    echo "Model loaded into runtime: NO (installed models can remain idle)"
  fi
else
  echo "Loaded-model list unavailable"
fi
if [[ "$mode" == "--infer" ]]; then
  command -v timeout >/dev/null || { echo "Install coreutils timeout before --infer" >&2; exit 1; }
  echo "Starting real inference (bounded to 180 seconds):"
  timeout --signal=TERM --kill-after=5s 180s \
    docker compose -f docker-compose.yml exec -T ollama ollama run "$model" \
    'Reply with exactly READY.' ||
    { echo "Live inference FAILED or timed out — do not mark model healthy" >&2; exit 4; }
  echo "Inference completed with exit code 0. Review output before approving."
fi
