#!/usr/bin/env bash
# Run API (:8000) + Vite HMR (:5173) together for local development.
set -euo pipefail
cd "$(dirname "$0")/.."

pids=()
cleanup() {
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

if [[ -f .venv/bin/activate ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

python server.py &
pids+=($!)
npm run dev &
pids+=($!)
wait
