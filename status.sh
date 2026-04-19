#!/usr/bin/env bash
# Show whether every part of Sentinel AI is running locally.
port_up() { (exec 3<>/dev/tcp/127.0.0.1/"$1") 2>/dev/null && echo up || echo down; }
http_code() { curl -s -o /dev/null -m 2 -w "%{http_code}" "$1" 2>/dev/null || echo "---"; }

row() { printf "  %-26s %-8s %s\n" "$1" "$2" "$3"; }
ok(){ echo "✅ UP"; }; no(){ echo "❌ DOWN"; }

echo "──────────────── Sentinel AI — local status ────────────────"
[ "$(port_up 27017)" = up ] && M=$(ok) || M=$(no); row "MongoDB"            "27017" "$M"
[ "$(port_up 5001)"  = up ] && B=$(ok) || B=$(no); row "Backend API"        "5001"  "$B"
[ "$(port_up 1883)"  = up ] && Q=$(ok) || Q=$(no); row "MQTT broker"        "1883"  "$Q"
[ "$(port_up 5002)"  = up ] && A=$(ok) || A=$(no); row "AI engine"          "5002"  "$A  (/ -> $(http_code http://localhost:5002/))"
[ "$(port_up 5173)"  = up ] && C=$(ok) || C=$(no); row "Web client"         "5173"  "$C  (/ -> $(http_code http://localhost:5173/))"
echo "─────────────────────────────────────────────────────────────"
echo "  Open the app:   http://localhost:5173"
echo "  AI feed (after worker login):  http://localhost:5002/video_feed/0"
echo
echo "  Camera state (AI engine):"
grep -E "Camera is (ON|OFF)|worker login|ACCEPTED" aiengine.log 2>/dev/null | tail -1 | sed 's/^/    /'
