# MQTT topic reference

Broker: Aedes, embedded inside the backend Node process on port 1883.

## Topics

| Topic | Producer | Consumers | Payload |
|-------|----------|-----------|---------|
| `ppe/alerts/<workerId>` | Backend | Mobile app (subscribed with matching workerId) | `{ workerId, missing, snapshot, timestamp, violationId }` |
| `ppe/heartbeat` | AI engine (every 30 s) | Backend (monitors uptime) | `{ engineId, timestamp }` |
| `ppe/control/reload` | Admin dashboard | AI engine | `{ reason }` — engine reloads models |

## QoS

- Alerts: **QoS 1** (at-least-once — better to deliver twice than miss).
- Heartbeats: **QoS 0** (fire-and-forget — a missed heartbeat is fine).

## Retained messages

- `ppe/heartbeat` is retained so a newly-connected consumer sees the last state.
- Alerts are **not** retained — a fresh app should not see stale alerts on launch.

## Testing

`server/test_mqtt.js` publishes a synthetic violation:

```bash
cd server && node test_mqtt.js WKR-1234
```
