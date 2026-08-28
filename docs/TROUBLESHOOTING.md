# Troubleshooting

Common problems and fixes, in order of frequency.

## AI engine

### "cv2.error: OpenCV can't open camera"
- Confirm the webcam works with another program (e.g. `cheese`).
- On Linux, check permissions on `/dev/video0`: `ls -l /dev/video0`.
- If running in Docker, pass `--device /dev/video0:/dev/video0`.

### "Helmet: OK" appears on a bare head
- The helmet-class threshold is too low for your camera. Raise it in
  `ai-engine/main.py` — `CLASS_THRESHOLDS["Helmet"]` — from 0.35 to 0.40.
- Verify by checking the `[ACCEPTED Helmet conf=…]` log line — real worn
  helmets score 0.5+; textures on hair typically score 0.17–0.25.

### Detection is very slow
- Confirm you're not accidentally running on CPU with `imgsz=1280`.
  Recommended: `imgsz=640` (default in `main.py`).
- On a laptop with an NVIDIA GPU, install CUDA-enabled PyTorch and let
  Ultralytics auto-select the device.

## Backend

### "MongoNetworkError: connect ECONNREFUSED"
- MongoDB isn't running. On Linux: `sudo systemctl start mongod`.
- Double-check `MONGO_URI` in `server/.env`.

### JWT rejected with "invalid signature"
- The `JWT_SECRET` in `.env` was regenerated after a token was issued.
- Log out and log in again to get a fresh token.

## Web dashboard

### Camera Monitor shows a broken image
- The AI engine isn't running, or `VITE_AI_URL` points to the wrong host.
- Open `http://<AI_URL>/video_feed/0` directly — it should stream MJPEG.

### Login succeeds but pages redirect back to /login
- Browser stripped the JWT. Check that the API URL is same-origin or the
  backend has permissive CORS.

## Mobile app

### Alerts don't arrive on the phone
- Verify MQTT connectivity: open the app's Alerts screen and watch the
  connection indicator. If it flaps, check that port 1883 is reachable from
  the phone (many home routers block it — use the same Wi-Fi as the backend).
- HTTP-poll fallback should still work; if that also fails, the phone can't
  reach the backend URL at all.
