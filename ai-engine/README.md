# AI engine — `ai-engine/`

Flask + Ultralytics YOLOv8 detection service.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Place trained weights:
#   ../Training Work/ppe_model_v8/weights/best.pt
#   ../Training Work/glove_model_v2/weights/best.pt
python main.py
```

Serves on `:5002`:

- `GET /` — health check
- `GET /video_feed/<cam_id>` — MJPEG stream with detection overlays
- `POST /detect` — one-shot inference on an uploaded image (used by AI Sandbox page)
- `POST /api/frame` — mobile-camera frame ingest (deployment copy only)

## Detection pipeline

1. Read camera frame (`cv2.VideoCapture` — laptop webcam or IP-cam URL)
2. Apply CLAHE contrast enhancement in LAB colour space
3. Run YOLOv8 PPE model at `imgsz=640, conf=0.05`
4. Gate detections per class: `Helmet ≥ 0.35`, `Vest ≥ 0.42`
5. Run standalone glove model at `imgsz=640, conf=0.05`, accept `≥ 0.20`
6. Run YOLOv8n person model to establish worker bounding box
7. Reject PPE detections whose centre is outside the person's bounding box
8. Dedup overlapping same-class boxes (IoU > 0.4 or containment > 0.6)
9. Compare detected classes vs required set; if missing, POST to `/api/violations`

## Environment variables

- `BACKEND_URL` — backend to POST violations to (default `http://127.0.0.1:5001`)
- `CAM_SOURCE` — `0` for webcam, RTSP URL for IP cam, or `none` for API-only mode
- `YOLO_CONFIG_DIR` — where Ultralytics stores its config (default `/tmp/Ultralytics`)
