#!/usr/bin/env bash
# Run AI Linux missions with GitHub Copilot CLI in this repository's Codespace.
# Copilot CLI is a separate coding agent, not an authenticated original Aria/Alex/Astyria/Aurelius.
set -Eeuo pipefail

repo="mmitek515-netizen/Testowe"
mode="${1:-start}"
case "$mode" in
  start) issues=(2 4) ;; # prerequisite identity + Ollama, then continue with "all"
  all) issues=(2 4 3 5 7 6 8 9 10) ;;
  *) echo "Usage: bash scripts/run-codespace-missions.sh [start|all]" >&2; exit 2 ;;
esac

cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == "main" ]] || { echo "Switch to main first." >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "Working tree is not clean. Commit or stash your changes first." >&2; exit 1; }
command -v copilot >/dev/null || { echo "Install Copilot CLI (Node 22+): npm install -g @github/copilot" >&2; exit 1; }
command -v gh >/dev/null || { echo "GitHub CLI (gh) is required." >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Log in with: gh auth login" >&2; exit 1; }

state="${HOME}/.local/state/testowe-missions"
mkdir -p "$state"
exec 9>"$state/runner.lock"
flock -n 9 || { echo "Mission runner is already running." >&2; exit 1; }

echo "Repository: $repo | branch: main | mode: $mode"
echo "Uses GitHub Copilot CLI, not the four verified original external agents."
echo "Each session may use GitHub Copilot AI credits. Stop with Ctrl+C."
for number in "${issues[@]}"; do
  if [[ -f "$state/issue-${number}.done" ]]; then
    echo "Issue #$number previously completed by this runner; skipping."
    continue
  fi
  git fetch origin main
  git merge --ff-only origin/main
  [[ -z "$(git status --porcelain)" ]] || { echo "Uncommitted changes; stopping." >&2; exit 1; }
  before="$(git rev-parse HEAD)"
  issue_text="$(gh issue view "$number" --repo "$repo" --json title,body --jq '.title + "\n\n" + .body')"
  prompt="$(cat <<EOF
You are working in GitHub Codespaces on $repo, branch main. Execute exactly GitHub issue #$number, in Polish, using its scope and acceptance criteria below.
This task is a development assignment for Copilot CLI. Never pretend to be one of the four original agents.
Inspect the current repository first. Make real code changes, run the smallest meaningful validation and commit completed work directly on main. Do not create or switch branches. Do not overwrite concurrent work, expose credentials, or claim unverified runtime behavior.
If blocked (missing live credentials, host VM, privileges, or resources), implement the verifiable code/documentation you can, and state what remains unverified. Do not fabricate successful agent connectivity.
Do not push to remote yourself; the outer mission runner will push after checking a clean working tree.
Issue #$number:
$issue_text
EOF
)"
  echo "== Starting issue #$number =="
  log="$state/issue-${number}.log"
  if ! copilot --autopilot --allow-all-tools --max-autopilot-continues=10 --max-ai-credits=30 -p "$prompt" 2>&1 | tee "$log"; then
    echo "Copilot failed on issue #$number; see $log" >&2
    exit 1
  fi
  [[ "$(git branch --show-current)" == "main" ]] || { echo "Agent changed branch. Stop and inspect." >&2; exit 1; }
  [[ -z "$(git status --porcelain)" ]] || { echo "Uncommitted changes after issue #$number. Inspect before continuing." >&2; exit 1; }
  after="$(git rev-parse HEAD)"
  [[ "$after" != "$before" ]] || { echo "No new commit for issue #$number. Not marking as completed." >&2; exit 1; }
  git push origin main
  printf '%s %s\n' "$after" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$state/issue-${number}.done"
  echo "== Issue #$number committed and pushed: $after =="
done
echo "Selected missions completed. Inspect commits, logs and acceptance criteria."
