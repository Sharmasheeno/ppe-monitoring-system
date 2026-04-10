<div align="center">

# Sentinel — Intelligent Real-Time PPE Monitoring & Alert System

**AI-powered safety-gear detection with instant worker alerts — helmets, vests, and gloves, watched in real time.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=node.js&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-3-02569B?logo=flutter&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10-3776AB?logo=python&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF)
![MQTT](https://img.shields.io/badge/MQTT-Aedes-660066)
![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

🌐 **Live demo:** [http://169.58.7.143](http://169.58.7.143)

</div>

---

## What it does

Sentinel watches a construction-site camera in real time and detects when a worker is missing required Personal Protective Equipment (PPE). The moment a violation is spotted, the worker's phone rings with a haptic alert — while the supervisor sees the annotated feed on a web dashboard.

- **Detection**: YOLOv8 running on-device (edge inference) — no cloud dependency for the detection loop.
- **Delivery**: An MQTT broker embedded in the Node backend pushes alerts to the worker's mobile app in **~400–700 ms**.
- **Dashboard**: A React web UI for supervisors — live camera, violation logs, analytics, sandbox for manual image tests.
- **Mobile**: A cross-platform Flutter app for the worker — receives alerts, shows history, presents compliance score.

---

## Live-system screenshots

> Drag your screenshots into GitHub's Markdown editor to replace the placeholders below.

| Full PPE compliant | Missing PPE violation | Worker mobile alert |
|:---:|:---:|:---:|
| _drop screenshot here_ | _drop screenshot here_ | _drop screenshot here_ |
| Helmet OK · Vest OK · Glove OK | Red overlay, `MISSING: Helmet, Glove, Vest` | Full-screen red state, vibration + audio |

---

## Architecture

Four loosely-coupled layers, each an independently deployable unit:

```
┌────────────┐   MJPEG    ┌────────────────┐  MQTT   ┌────────────┐
│  Camera    │──────────▶│   AI Engine    │────────▶│  Mobile    │
│  (webcam)  │           │  YOLOv8 · Flask│         │  (Flutter) │
└────────────┘           └───────┬────────┘         └────────────┘
                                 │ HTTP POST
                                 ▼
                    ┌────────────────────────┐  ◀── REST/WebSocket ──▶  ┌────────────┐
                    │  Backend (Node.js)     │                          │  Dashboard │
                    │  Express + Aedes MQTT  │                          │  (React)   │
                    │  + Socket.io + Mongo   │                          └────────────┘
                    └────────────────────────┘
```

- **AI Engine** ([`ai-engine/main.py`](ai-engine/main.py)) — CLAHE preprocessing → YOLOv8s PPE + Glove models → person-region gating → deduped detections → violation POST.
- **Backend** ([`server/`](server/)) — REST endpoints for auth/users/violations/scores, an embedded Aedes MQTT broker on port 1883, and Socket.io — all in one Node process.
- **Dashboard** ([`client/`](client/)) — React + Vite + Tailwind, role-protected routes, live MJPEG feed embedded via `<img>`.
- **Mobile** ([`mobile/`](mobile/)) — Flutter, dual-path alert (MQTT + HTTP fallback), audio + haptic alarm.

---

## Model performance

Reported on held-out validation sets.

| Model | Class | Precision | Recall | mAP@50 | Notes |
|-------|-------|-----------|--------|--------|-------|
| PPE (YOLOv8s) | Helmet | 96.9 % | 90.5 % | 96.1 % | 30 epochs, freeze-10, AdamW lr=1e-3 |
| PPE (YOLOv8s) | Vest | 93.8 % | 91.1 % | 98.6 % | Same run |
| Glove (YOLOv8s) | Glove | 89.8 % | 84.2 % | 91.2 % | 94 epochs (early stop), SGD lr=1e-2 |

Both trained on ~40 875 images (PPE) / ~4 481 images (Glove) — a merged dataset from Roboflow + Kaggle, extended with hard-negative frames captured from the deployment camera itself.

---

## Quick start (local development)

```bash
# 1. clone
git clone https://github.com/Sharmasheeno/ppe-monitoring-system.git
cd ppe-monitoring-system

# 2. backend
cd server && npm install && cp .env.example .env  # then fill in MONGO_URI, JWT_SECRET
node server.js &

# 3. AI engine
cd ../ai-engine && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Drop your trained weights into ../Training Work/{ppe_model_v8,glove_model_v2}/weights/best.pt
python main.py &

# 4. web dashboard
cd ../client && npm install && npm run dev

# 5. mobile app (optional)
cd ../mobile && flutter pub get && flutter run
```

See [`LOCAL_SETUP.md`](LOCAL_SETUP.md) for full setup details and [`WINDOWS_SETUP.md`](WINDOWS_SETUP.md) for Windows-specific notes.

---

## Repository layout

```
ai-engine/        # Python Flask + YOLOv8 detection engine
server/           # Node.js Express + Aedes MQTT + Socket.io
client/           # React + Vite + Tailwind supervisor dashboard
mobile/           # Flutter cross-platform worker app
retraining/       # Colab notebooks for retraining the two models
```

---

## Academic context

This project is the final-year undergraduate thesis for **Group 42** at **Jamhuriya University of Science and Technology**, Faculty of Computer & IT, Mogadishu — Bachelor of Computer Application, 2025–2026 cohort.

**Supervisor:** Mr. Abdullahi Mohamed Hassan (Ojo)

---

## License

Released under the [MIT License](LICENSE) — free to use, modify, and distribute with attribution.
