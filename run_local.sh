#!/usr/bin/env bash
# Start the whole Sentinel AI stack locally (backend + AI engine + web client).
# MongoDB must already be running on 127.0.0.1:27017.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Checking MongoDB (127.0.0.1:27017)"
if ! (exec 3<>/dev/tcp/127.0.0.1/27017) 2>/dev/null; then
  echo "   ⚠ MongoDB not reachable. Start it first:  sudo systemctl start mongod"
  echo "   (continuing anyway — backend will retry)"
fi

pids=()
cleanup() { echo; echo "==> Stopping..."; for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

echo "==> Backend (:5001)"
cd "$ROOT/server"
[ -d node_modules ] || npm install
node server.js > "$ROOT/backend.log" 2>&1 &
pids+=($!)

echo "==> AI engine (:5002, reads webcam 0)"
cd "$ROOT/ai-engine"
[ -d venv ] || python3 -m venv venv
# shellcheck disable=SC1091
source venv/bin/activate
pip install -q -r requirements.txt
python main.py > "$ROOT/aiengine.log" 2>&1 &
pids+=($!)

echo "==> Web client (:5173) — this window; Ctrl+C stops everything"
cd "$ROOT/client"
[ -d node_modules ] || npm install
npm run dev

# (client runs in foreground; on Ctrl+C the trap stops backend + AI engine)
