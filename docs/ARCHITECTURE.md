# Architecture

## Overview

Sentinel is composed of four loosely-coupled services communicating over
well-defined protocols. Each service can be restarted or replaced without
bringing down the others.

## Services

### AI Engine — `ai-engine/main.py`
- **Language**: Python 3.10
- **Framework**: Flask + Ultralytics YOLOv8
- **Port**: 5002 (MJPEG stream and health endpoints)
- **Responsibilities**: read camera frames → CLAHE preprocess → run YOLOv8 PPE model + Glove model + YOLOv8n person model → dedup → detect missing PPE → POST violation to backend
- **Key optimisations**:
  - Camera loop gated on worker-presence (polls backend every 5 s)
  - Per-class confidence thresholds (Helmet 0.35, Vest 0.42, Glove 0.20)
  - CLAHE in LAB colour space to close the domain gap between training photos and darker deployment frames

### Backend — `server/server.js`
- **Language**: Node.js 18
- **Framework**: Express + Aedes (MQTT broker) + Socket.io
- **Port**: 5001 (REST + WebSocket), 1883 (MQTT)
- **Database**: MongoDB (Mongoose ODM)
- **Route groups**: `/api/auth`, `/api/users`, `/api/violations`, `/api/scores`, `/api/messages`, `/api/status`
- **Auth**: JWT with role-based middleware (`authUser`, `adminSupOnly`)

### Web Dashboard — `client/`
- **Language**: JavaScript (JSX)
- **Framework**: React 19 + Vite + Tailwind CSS + React Router
- **Port**: 5173 (Vite dev) / static build served by nginx in production
- **Pages**: Dashboard Overview, User Management, Camera Monitor, Violation Logs, Analytics Hub, AI Sandbox, User Tracking, Messages, Profile
- **Auth**: JWT stored in localStorage; `PrivateRoute` + `AdminRoute` guard components

### Mobile — `mobile/`
- **Language**: Dart
- **Framework**: Flutter 3
- **Platforms**: Android, iOS, macOS, Linux, Windows, Web
- **Alert path**: dual-channel (MQTT subscribe + 5-s HTTP poll); whichever delivers first triggers the alarm
- **Local feedback**: `vibration` + `audioplayers` for haptic + audio alerts

## Data flow

```
Camera ─▶ AI Engine ─POST /api/violations─▶ Backend ─MQTT publish─▶ Mobile
                │                              │
                └─MJPEG /video_feed/0──────────┴─Socket.io────▶ Dashboard
```

1. Camera frame captured at 3–8 fps.
2. CLAHE contrast enhancement applied.
3. YOLOv8 PPE + Glove models run; results dedup'd.
4. If required item missing → POST `/api/violations` with worker ID, class list and snapshot.
5. Backend persists to Mongo + publishes on `ppe/alerts/<workerId>` MQTT topic.
6. Subscribed phone receives payload → full-screen red state, vibrates, plays audio.
7. Dashboard receives real-time event via Socket.io → updates violation log.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the production topology.
