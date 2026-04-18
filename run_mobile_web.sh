#!/usr/bin/env bash
# Run the Flutter mobile app in Brave (as a web app).
# The backend (:5001) must already be running — start it with ./run_local.sh first.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
export PATH="$PATH:/home/sharma/flutter/bin"
export CHROME_EXECUTABLE=/usr/bin/brave-browser   # <-- makes Flutter launch Brave

cd "$ROOT/mobile"
flutter pub get
echo "==> Launching PPE app in Brave (http://localhost:8080) ..."
flutter run -d chrome --web-port 8080 --web-hostname localhost
