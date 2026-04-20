# Running Sentinel AI Locally (no server / no IP)

All server-IP configuration (`169.58.7.143`) has been removed. Every part now talks to
`localhost`. This guide starts the whole system on your own machine.

## Local port map
| Part | Runs on | Notes |
|---|---|---|
| MongoDB | `127.0.0.1:27017` | database |
| Backend (Node/Express + MQTT) | **5001** (API), **1883** (MQTT) | |
| AI engine (Python/Flask) | **5002** | reads your **webcam** directly |
| Web client (React/Vite) | **5173** | open in browser |
| Mobile (Flutter) | emulator → host via `10.0.2.2` | optional |

Start them in this order.

---

## 1. MongoDB
Make sure MongoDB is installed and running:
```bash
sudo systemctl start mongod        # or:  mongod --dbpath ~/mongo-data
```
(The backend auto-creates the `ppe_monitoring` database on first run.)

## 2. Backend  (terminal 1)
```bash
cd ~/Pictures/ppe-monitoring-system/server
npm install          # first time only
node server.js
```
You should see: `Server running on port 5001` and `MQTT Broker started on port 1883`.

## 3. AI engine  (terminal 2)
```bash
cd ~/Pictures/ppe-monitoring-system/ai-engine
python3 -m venv venv          # first time only
source venv/bin/activate
pip install -r requirements.txt   # first time only
python main.py
```
- It loads the models from `../Training Work/…` and serves on **http://localhost:5002**.
- By default it reads your **built-in webcam (device 0)**. No MediaMTX needed.
- To use an IP camera / MediaMTX instead:
  `CAM_SOURCE="rtsp://127.0.0.1:8554/cam01" python main.py`
- The camera only turns **on** once a **worker logs in** (the engine polls the backend for
  online workers), so log in as a worker in step 4 to see the live feed.

## 4. Web client  (terminal 3)
```bash
cd ~/Pictures/ppe-monitoring-system/client
npm install          # first time only
npm run dev
```
Open **http://localhost:5173** in your browser.
- Sign in as a **supervisor/admin** → CCTV Monitor shows the live annotated webcam feed
  (`http://localhost:5002/video_feed/0`).
- Sign in as a **worker** → this activates the camera and receives violation alerts.

> If you prefer the production build instead of the dev server:
> `npm run build && npm run preview` (the old `client/dist` was built against the server IP,
> so rebuild it after these changes).

## 5. Mobile app (optional)  (terminal 4)
```bash
cd ~/Pictures/ppe-monitoring-system/mobile
flutter pub get
flutter run
```
- On an **Android emulator** it reaches your PC through `10.0.2.2` (already configured).
- On a **real phone** (same Wi-Fi): edit `mobile/lib/services/api_service.dart` and the
  `broker` in `worker_dashboard.dart` / `admin_dashboard.dart`, replacing `10.0.2.2` with
  your PC's LAN IP (find it with `hostname -I`).
- On **Flutter web** it uses `localhost` automatically.

---

## Quick test
1. Mongo up → backend (`5001`) → AI engine (`5002`) → client (`5173`).
2. Open `http://localhost:5173`, sign in as a worker (activates the camera).
3. Open the CCTV Monitor as admin — you should see your webcam with Helmet / Vest / Glove /
   Person boxes, and violations logged in real time.

## What changed for local
- `ai-engine/main.py`: camera source → webcam `0` (env `CAM_SOURCE` to override); backend
  URLs → `127.0.0.1:5001`.
- `server/.env`: `PORT=5001` (was 5000); Mongo already local.
- `client/src/**`: every `http://169.58.7.143/...` → `localhost:5001` (API/socket) or
  `localhost:5002` (AI stream/sandbox).
- `mobile/lib/**`: web → `localhost:5001`, emulator → `10.0.2.2:5001`, MQTT broker → `10.0.2.2`.
