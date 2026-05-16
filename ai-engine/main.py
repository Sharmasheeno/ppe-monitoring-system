import cv2
import os
import requests
import time
import base64
import threading
import numpy as np
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO

# --- Configuration ---
API_URL = "http://127.0.0.1:5001/api/violations"   # Local call — faster on same server
LIVE_STATUS_URL = "http://127.0.0.1:5001/api/status/live"   # live compliance heartbeat
LIVE_STATUS_INTERVAL = 2.0   # seconds between heartbeats (mobile treats >8s as stale)
_last_live_post = 0.0

# ─── Video Sources ────────────────────────────────────────────────────────────
# WebRTC Option: Camera person opens http://localhost:8889/cam01/publish
# in their browser → MediaMTX receives it → AI reads RTSP below.
# To add more cameras: append more rtsp://127.0.0.1:8554/cam02 entries.
# Local default: built-in webcam (device 0). Override with env CAM_SOURCE,
# e.g. CAM_SOURCE="rtsp://127.0.0.1:8554/cam01" to use MediaMTX / IP cameras.
_cam = os.environ.get("CAM_SOURCE", "0")
SOURCES = [int(_cam) if _cam.isdigit() else _cam]
# ─────────────────────────────────────────────────────────────────────────────

# Initialize PPE Model - FORCED to ppe_model_v8 (best.pt)
CONFIDENCE_THRESHOLD = 0.4
# Resolve paths relative to this script's directory (works on Linux, Windows, macOS)
_BASE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_BASE, "..", "Training Work", "ppe_model_v8", "weights", "best.pt")
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"[STARTUP] CRITICAL: ppe_model_v8 not found at {MODEL_PATH}")
print(f"[STARTUP] PPE Monitoring AI Engine v2.0")
print(f"[STARTUP] Model: ppe_model_v8/weights/best.pt (37,855 images, mAP50=0.979) ✅")
print(f"[STARTUP] Model path: {MODEL_PATH}")
print(f"[STARTUP] Confidence threshold: {CONFIDENCE_THRESHOLD}")

# Pre-trained COCO model specifically for Person Detection (Class 0)
PERSON_MODEL_PATH = "yolov8n.pt"

# PPE class names from the trained model
PPE_CLASSES = {"Glove", "Helmet", "Vest"}
# Colors for each PPE type
PPE_COLORS = {
    "Helmet": (0, 255, 0),   # Green
    "Vest": (255, 165, 0),    # Orange
    "Glove": (255, 255, 0),   # Yellow
}
# --- Flask App ---
app = Flask(__name__)
CORS(app)

# --- Global State ---
import os
os.environ['KMP_DUPLICATE_LIB_OK']='True'

# Global state for video streams
output_frames = {}
lock = threading.Lock()

# Camera activation control — only runs when a worker is logged in
camera_active = threading.Event()   # Set = camera ON, Clear = camera OFF
camera_active.clear()               # ALWAYS start with camera OFF, regardless of prior state
active_worker_id = None             # workerId of the currently logged-in worker

# Load BOTH YOLO models once at startup
print("Loading Safety Core (Custom PPE Model: ppe_model_v8)...")
try:
    model = YOLO(MODEL_PATH)
    print(f"[STARTUP] PPE model loaded ✅ — Classes: {list(model.names.values())}")
except Exception as e:
    print(f"[STARTUP] FAILED TO LOAD PPE MODEL: {e}")
    raise  # Hard fail — no fallback, demo requires v8

# Load GLOVE Models — ENSEMBLE (V2 + V3)
# V2 = High accuracy (93% mAP) but color-biased (misses neon/unusual gloves)
# V3 = Augmented (86% mAP) but color-unbiased (catches neon gloves)
# Strategy: Run BOTH, take the best detection from either model

GLOVE_V2_PATH = os.path.join(_BASE, "..", "Training Work", "glove_model_v2", "weights", "best.pt")
GLOVE_V3_PATH = os.path.join(_BASE, "..", "Training Work", "glove_model_v3_unbiased", "weights", "best.pt")

glove_model_v2 = None
glove_model_v3 = None

print(f"Loading Glove Core V2 ({GLOVE_V2_PATH})...")
try:
    glove_model_v2 = YOLO(GLOVE_V2_PATH)
    print(f"[STARTUP] Glove model V2 loaded ✅ (93% mAP, standard gloves)")
except Exception as e:
    print(f"[STARTUP] Glove model V2 unavailable: {e}")

print(f"Loading Glove Core V3 ({GLOVE_V3_PATH})...")
try:
    glove_model_v3 = YOLO(GLOVE_V3_PATH)
    print(f"[STARTUP] Glove model V3 loaded ✅ (86% mAP, anti-bias/neon)")
except Exception as e:
    print(f"[STARTUP] Glove model V3 unavailable: {e}")

# Keep a reference for backward compat with camera worker code
glove_model = glove_model_v2 if glove_model_v2 else glove_model_v3

print("Loading Human Core (yolov8n — person detection only)...")
try:
    human_core = YOLO("yolov8n.pt")  # COCO model for person detection ONLY
except Exception as e:
    print(f"[STARTUP] Human core unavailable (optional): {e}")
    human_core = None

# We use video indexes, but let's assume they map to physical webcams
# E.g., 0 for laptop webcam, 1 for external USB, etc.

class LatestFrameReader:
    """Background reader that always holds ONLY the newest frame.
    The detection loop reads from here so it never processes a stale, buffered
    frame — this is the key fix for RTSP latency/lag. Drops intermediate frames
    to stay real-time when inference is slower than the incoming frame rate."""
    def __init__(self, cap):
        self.cap = cap
        try:
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
        self._frame = None
        self._stamp = 0.0
        self._lock = threading.Lock()
        self._running = True
        self._thread = threading.Thread(target=self._reader, daemon=True)
        self._thread.start()

    def _reader(self):
        while self._running:
            ret, frame = self.cap.read()
            if not ret:
                time.sleep(0.02)
                continue
            with self._lock:
                self._frame = frame
                self._stamp = time.time()

    def read(self):
        # Cold-start grace: wait briefly for the first frame so startup is not
        # mistaken for a dropped stream.
        deadline = time.time() + 3.0
        while self._frame is None and self._running and time.time() < deadline:
            time.sleep(0.02)
        with self._lock:
            if self._frame is None:
                return False, None
            if time.time() - self._stamp > 5.0:   # no new frame for 5s => signal lost
                return False, None
            return True, self._frame

    def isOpened(self):
        return self.cap.isOpened()

    def release(self):
        self._running = False
        try:
            self._thread.join(timeout=1.0)
        except Exception:
            pass
        try:
            self.cap.release()
        except Exception:
            pass


def connect_camera(source):
    """Attempt to connect to a camera source."""
    import cv2
    import platform
    if isinstance(source, int):
        if platform.system() == 'Windows':
            cap = cv2.VideoCapture(source, cv2.CAP_DSHOW)
        else:
            # Linux: try V4L2 first (native), fall back to default backend
            cap = cv2.VideoCapture(source, cv2.CAP_V4L2)
            if not cap.isOpened():
                cap = cv2.VideoCapture(source)
    else:
        # Network stream (RTSP) — force FFMPEG backend with TCP transport
        import os
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|analyzeduration;10000000|probesize;10000000|fflags;nobuffer"
        cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        print(f"Failed to open camera: {source}")
        return None
    print(f"Camera connected: {source}")
    return LatestFrameReader(cap)

def send_alert(image_frame, violation_type, conf, location):
    """Send violation data to the backend."""
    try:
        _, buffer = cv2.imencode('.jpg', image_frame)
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')
        image_data = f"data:image/jpeg;base64,{jpg_as_text}"

        payload = {
            "violationType": violation_type,
            "imageUrl": image_data,
            "confidence": float(conf),
            "location": location
        }
        
        try:
            requests.post(API_URL, json=payload, timeout=1) 
        except requests.exceptions.Timeout:
            pass # Ignore timeout
    except Exception as e:
        print(f"Error sending alert: {e}")

def camera_worker(source_index, source_url):
    """Worker thread to handle a single camera stream.
    Blocks until camera_active is set (i.e., a worker has logged in).
    """
    global output_frames, lock, model, human_core, active_worker_id

    print(f"[camera_worker] Camera {source_index} thread ready — waiting for worker login...")
    # Reuse globally loaded model — no redundant reload
    local_model = model
    person_model = human_core
    if local_model is None:
        print(f"[camera_worker] ERROR: PPE model not loaded. Aborting camera {source_index}.")
        return

    cap = None  # Will open when camera_active is set
    frame_count = 0
    # (Glass persistence removed — no longer needed after Goggles->Gloves migration)

    # Throttle alerts (one per type every 10 seconds)
    last_alert_time = {}
    ALERT_COOLDOWN = 60  # seconds
    # Temporal smoothing: remember when each PPE class was last detected so a
    # single weak frame does not flip a worn item to MISSING (fixes glove flicker).
    last_ppe_seen = {}
    PPE_PERSIST_SEC = 6.0   # was 2.5 — longer window so brief glove flicker isn't flagged 'missing'
    # Box persistence: hold the last glove boxes on screen briefly so they
    # stay steady instead of blinking frame-to-frame.
    last_glove_boxes = []
    last_glove_box_time = 0.0
    GLOVE_BOX_PERSIST = 1.0
    
    while True:
        # ── GATE: Block until a worker logs in ──
        if not camera_active.is_set():
            if cap is not None:
                cap.release()
                cap = None
                print(f"[Camera {source_index}] Worker logged out → Camera released.")
            # Show a NO SIGNAL placeholder on the CCTV while no worker is active
            _ph = np.zeros((360, 640, 3), dtype=np.uint8)
            cv2.putText(_ph, "NO SIGNAL", (195, 165), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (70, 70, 70), 3)
            cv2.putText(_ph, "Camera off - waiting for worker login", (95, 205), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (110, 110, 110), 1)
            with lock:
                output_frames[source_index] = _ph
            print(f"[Camera {source_index}] Waiting for worker login...")
            camera_active.wait()  # Blocks here; set() by poll_worker_status()
            # Re-check immediately after waking — the worker may have already logged
            # out in the gap between set() and this thread waking up.
            if not camera_active.is_set():
                continue  # Back to top — will block at wait() again
            print(f"[Camera {source_index}] Worker online → Activating camera...")


        # Open camera if not already open
        if cap is None or not cap.isOpened():
            cap = connect_camera(source_url)
            if cap is None:
                time.sleep(3)
                continue

        ret, frame = cap.read()
        if not ret:
            print(f"Stream lost for Camera {source_index}. Reconnecting...")
            cap.release()
            cap = None
            continue

        # Resize for performance and standard size
        frame = cv2.resize(frame, (640, 480))

        # --- Direct PPE Detection (3 classes: Glass, Helmet, Vest) ---
        frame_count += 1

        # Apply CLAHE contrast enhancement so dark glasses have sharper edges
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_enhanced = clahe.apply(l)
        enhanced_frame = cv2.cvtColor(cv2.merge([l_enhanced, a, b]), cv2.COLOR_LAB2BGR)

        # Run PPE model at higher resolution with very low conf to catch weak detections
        results = local_model(enhanced_frame, verbose=False, imgsz=640, conf=0.05)

        # Save a sample frame every 300 frames for sandbox comparison / debugging
        if frame_count % 300 == 0:
            debug_path = f"debug_cam{source_index}_frame{frame_count}.jpg"
            cv2.imwrite(debug_path, enhanced_frame)
            total_boxes = sum(len(r.boxes) for r in results)
            print(f"[CAM-{source_index}] Frame {frame_count}: model returned {total_boxes} raw boxes | saved → {debug_path}")

        detected_classes = set()
        ppe_boxes = [] # Store coordinates to map to people later

        # Per-class confidence thresholds (model runs at conf=0.05 floor, we gate here)
        # Helmet: white/dark helmets in dim light score ~0.15 → 0.12 un-suppresses them
        #         (diagnostic showed a real helmet emitted at 0.15 but the old 0.18 gate
        #          dropped it → "Helmet: MISSING" false negative). Raise back toward 0.25
        #          after retraining on in-domain / CLAHE-baked data.
        # Vest:   kept 0.50 — red/coloured shirts false-positive at 0.40 in this room.
        CLASS_THRESHOLDS = {
            "Helmet": 0.12,
            "Vest":   0.50,
        }

        for result in results:
            for box in result.boxes:
                label_id = int(box.cls[0])
                if label_id >= len(local_model.names):
                    continue

                label = local_model.names[label_id]

                # IGNORE old Goggles completely
                if label == "Glass":
                    continue

                conf = float(box.conf[0])
                threshold = CLASS_THRESHOLDS.get(label, CONFIDENCE_THRESHOLD)
                if conf < threshold:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                detected_classes.add(label)
                ppe_boxes.append((x1, y1, x2, y2, label, conf))

                if frame_count % 30 == 0:
                    print(f"[CAM-{source_index}] ACCEPTED {label:<8} conf={conf:.3f} (threshold={threshold})")

        # De-duplicate overlapping same-class PPE boxes so a single helmet/vest
        # cannot show two stacked boxes (e.g. "Helmet 0.35" + "Helmet 0.44" on one
        # head). Keep the highest-confidence box; drop any same-class box that
        # overlaps it (IoU > 0.4) or sits nested inside it (containment > 0.6).
        _deduped = []
        for _bx in sorted(ppe_boxes, key=lambda b: b[5], reverse=True):
            _x1, _y1, _x2, _y2, _lbl, _cf = _bx
            _dup = False
            for _kx1, _ky1, _kx2, _ky2, _klbl, _kcf in _deduped:
                if _klbl != _lbl:
                    continue
                _ix1, _iy1 = max(_x1, _kx1), max(_y1, _ky1)
                _ix2, _iy2 = min(_x2, _kx2), min(_y2, _ky2)
                if _ix1 < _ix2 and _iy1 < _iy2:
                    _inter = (_ix2 - _ix1) * (_iy2 - _iy1)
                    _a1 = (_x2 - _x1) * (_y2 - _y1)
                    _a2 = (_kx2 - _kx1) * (_ky2 - _ky1)
                    _iou = _inter / max(_a1 + _a2 - _inter, 1)
                    _contain = _inter / max(min(_a1, _a2), 1)
                    if _iou > 0.4 or _contain > 0.6:
                        _dup = True
                        break
            if not _dup:
                _deduped.append(_bx)
        ppe_boxes = _deduped

        # --- GLOVE DETECTION (V2 primary + V3 bonus, union) ---
        # Requiring V2 & V3 to AGREE was too strict: V3 is nearly blind to some gloves
        # (measured: a dim blue glove scores V2=0.57 but V3=0.14), so agreement rejected
        # the REAL glove. Instead take the UNION of both models above a solid threshold
        # and let the downstream hand-reach ZONE filter drop wall/edge false positives.
        #
        # PROVEN CEILING: on this camera a real glove (~0.57) and a wall hallucination
        # (~0.63) overlap in V2 score — no threshold can separate them, so geometry only
        # mitigates. The permanent fix is a hard-negative retrain of the glove model.
        GLOVE_ACCEPT_CONF = 0.20   # acceptance gate (tune from GLOVE-DIAG logs below)
        GLOVE_FLOOR = 0.05         # run model this low so near-miss glove scores are visible
        MAX_CAM_GLOVES = 2
        _fh, _fw = enhanced_frame.shape[0], enhanced_frame.shape[1]
        _fa = _fh * _fw

        def _glove_candidates(_model):
            """Run one glove model at a LOW floor and keep boxes passing the size/shape
            sanity filters, returned as (conf, x1, y1, x2, y2). Acceptance-thresholding is
            done by the caller so we can also log near-miss scores for tuning."""
            _out = []
            if _model is None:
                return _out
            for _res in _model(enhanced_frame, verbose=False, conf=GLOVE_FLOOR, imgsz=640):
                for _bx in _res.boxes:
                    _c = float(_bx.conf[0])
                    _x1, _y1, _x2, _y2 = map(int, _bx.xyxy[0])
                    _bw, _bh = (_x2 - _x1), (_y2 - _y1)
                    if _bw * _bh / max(_fa, 1) > 0.12:               # too big (torso/vest)
                        continue
                    if _bw / max(_fw, 1) > 0.40:                     # too wide
                        continue
                    if max(_bw, _bh) / max(min(_bw, _bh), 1) > 3.0:  # not square-ish
                        continue
                    _out.append((_c, _x1, _y1, _x2, _y2))
            return _out

        # glove_model_v2 now holds the retrained v4 model (trained WITH this room as hard
        # negatives). It supersedes the old V3, so the live path uses it alone.
        _all_glove = _glove_candidates(glove_model_v2)
        # DIAGNOSTIC: log the best raw glove score (after size filter) every 15 frames so we
        # can read the true glove confidence when it's worn and set GLOVE_ACCEPT_CONF exactly.
        if frame_count % 15 == 0:
            _best = max((c for c, *_ in _all_glove), default=0.0)
            print(f"[CAM-{source_index}] GLOVE-DIAG best_raw={_best:.3f} "
                  f"gate={GLOVE_ACCEPT_CONF} n_at_floor={len(_all_glove)}")
        raw_glove_boxes = [b for b in _all_glove if b[0] >= GLOVE_ACCEPT_CONF]

        # Deduplicate overlapping boxes, keep top-2 by confidence
        accepted_gloves = []
        for conf, x1, y1, x2, y2 in sorted(raw_glove_boxes, key=lambda c: c[0], reverse=True):
            if len(accepted_gloves) >= MAX_CAM_GLOVES:
                break
            dominated = False
            for _, fx1, fy1, fx2, fy2 in accepted_gloves:
                ix1, iy1 = max(x1, fx1), max(y1, fy1)
                ix2, iy2 = min(x2, fx2), min(y2, fy2)
                if ix1 < ix2 and iy1 < iy2:
                    inter = (ix2 - ix1) * (iy2 - iy1)
                    union = (x2-x1)*(y2-y1) + (fx2-fx1)*(fy2-fy1) - inter
                    if inter / max(union, 1) > 0.3:
                        dominated = True
                        break
            if not dominated:
                accepted_gloves.append((conf, x1, y1, x2, y2))
                detected_classes.add("Glove")
                ppe_boxes.append((x1, y1, x2, y2, "Glove", conf))

        # Keep recent glove boxes on screen for ~1s so they hold steady instead of
        # flickering (small fast objects drop out for the odd frame).
        _gt = time.time()
        if accepted_gloves:
            last_glove_boxes = [(gx1, gy1, gx2, gy2, gc) for gc, gx1, gy1, gx2, gy2 in accepted_gloves]
            last_glove_box_time = _gt
        elif _gt - last_glove_box_time <= GLOVE_BOX_PERSIST:
            for gx1, gy1, gx2, gy2, gc in last_glove_boxes:
                detected_classes.add("Glove")
                ppe_boxes.append((gx1, gy1, gx2, gy2, "Glove", gc))
                if frame_count % 30 == 0:
                    print(f"[CAM-{source_index}] ACCEPTED Glove    conf={conf:.3f}")


                
        # Temporal smoothing of PPE presence — a class stays 'present' for a
        # couple of seconds after its last sighting, so flickery detections
        # (especially gloves) stop bouncing between OK and MISSING.
        now_ts = time.time()
        for _cls in detected_classes:
            last_ppe_seen[_cls] = now_ts
        stable_detected = {c for c in PPE_CLASSES if now_ts - last_ppe_seen.get(c, 0) <= PPE_PERSIST_SEC}

        # --- 2. Person Detection ---
        # Run pre-trained model solely to detect people (Class 0 is 'person' in COCO)
        # Because the user's room is exceptionally dark, we perform auto-brightness first
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        brightened = cv2.equalizeHist(gray)
        bright_frame = cv2.cvtColor(brightened, cv2.COLOR_GRAY2BGR)

        # conf=0.40 avoids detecting the same person 3-5x with overlapping boxes.
        # iou=0.45 ensures YOLO's own NMS merges any remaining duplicates.
        person_results = person_model(bright_frame, classes=[0], verbose=False, imgsz=416, conf=0.40, iou=0.45)

        # Collect all person boxes then deduplicate via IoU (safety net on top of YOLO NMS)
        raw_person_boxes = []
        for p_res in person_results:
            for p_box in p_res.boxes:
                px1, py1, px2, py2 = map(int, p_box.xyxy[0])
                pconf = float(p_box.conf[0])
                raw_person_boxes.append((pconf, px1, py1, px2, py2))

        # Keep only non-overlapping boxes (greedy NMS, highest conf first)
        clean_person_boxes = []
        for pconf, px1, py1, px2, py2 in sorted(raw_person_boxes, key=lambda x: x[0], reverse=True):
            dominated = False
            area_new = (px2 - px1) * (py2 - py1)
            for _, fx1, fy1, fx2, fy2 in clean_person_boxes:
                ix1, iy1 = max(px1, fx1), max(py1, fy1)
                ix2, iy2 = min(px2, fx2), min(py2, fy2)
                if ix1 < ix2 and iy1 < iy2:
                    inter = (ix2 - ix1) * (iy2 - iy1)
                    area_kept = (fx2 - fx1) * (fy2 - fy1)
                    # Overlap relative to the SMALLER box collapses nested / duplicate
                    # person detections into a single clean box (fixes the clutter).
                    if inter / max(min(area_new, area_kept), 1) > 0.5:
                        dominated = True
                        break
            if not dominated:
                clean_person_boxes.append((pconf, px1, py1, px2, py2))

        # Single-worker view: keep only the largest person box for a clean overlay.
        if clean_person_boxes:
            clean_person_boxes = [max(clean_person_boxes, key=lambda b: (b[3] - b[1]) * (b[4] - b[2]))]

        # Reject glove detections NOT on/near the worker (kills false gloves on the
        # wall or frame edges). Gloves must fall inside a hand-reach zone around the
        # person; with no person detected, no glove can be "worn".
        if clean_person_boxes:
            _, _ppx1, _ppy1, _ppx2, _ppy2 = clean_person_boxes[0]
            _gmx = int((_ppx2 - _ppx1) * 0.4)
            _gmy = int((_ppy2 - _ppy1) * 0.3)
            _kept = []
            for _b in ppe_boxes:
                if _b[4] == "Glove":
                    _cx, _cy = (_b[0] + _b[2]) // 2, (_b[1] + _b[3]) // 2
                    if not (_ppx1 - _gmx <= _cx <= _ppx2 + _gmx and _ppy1 <= _cy <= _ppy2 + _gmy):
                        continue
                _kept.append(_b)
            ppe_boxes = _kept
        else:
            ppe_boxes = [_b for _b in ppe_boxes if _b[4] != "Glove"]

        # Track if we found a violator to draw the red screen border
        global_violation = False
        person_count = len(clean_person_boxes)

        for _, px1, py1, px2, py2 in clean_person_boxes:
            # Check which PPE boxes fall inside this person's bounding box
            person_ppe = set()
            for d_box in ppe_boxes:
                dx1, dy1, dx2, dy2, d_label, d_conf = d_box
                cx, cy = (dx1 + dx2) // 2, (dy1 + dy2) // 2

                if d_label == "Glove":
                    # Expand zone for gloves — arms/hands extend beyond person bounding box
                    # 50% wider on each side, 30% taller below
                    margin_x = int((px2 - px1) * 0.5)
                    margin_y = int((py2 - py1) * 0.3)
                    in_zone = (px1 - margin_x <= cx <= px2 + margin_x and
                               py1 <= cy <= py2 + margin_y)
                else:
                    # Helmet/Vest must be strictly inside person box
                    in_zone = px1 <= cx <= px2 and py1 <= cy <= py2

                if in_zone:
                    person_ppe.add(d_label)

            # Check for missing PPE:
            # Helmet/Vest — use temporally-smoothed global detection (stable_detected)
            # Glove       — must be physically near person (person_ppe), so a glove
            #               on the wall/background is NOT counted as worn
            person_missing_ppe = set()
            for ppe_cls in PPE_CLASSES:
                if ppe_cls == "Glove":
                    if "Glove" not in person_ppe:
                        person_missing_ppe.add("Glove")
                else:
                    if ppe_cls not in stable_detected:
                        person_missing_ppe.add(ppe_cls)

            if person_missing_ppe:
                # Violator found — draw ONE clean RED bounding box around them
                cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 0, 255), 3)

                missing_text = "MISSING: " + ", ".join(person_missing_ppe)
                (tw, th), _ = cv2.getTextSize(missing_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)

                text_y_base = py1 - 10
                cv2.rectangle(frame, (px1, text_y_base - th - 6), (px1 + tw, text_y_base), (0, 0, 255), -1)
                cv2.putText(frame, missing_text, (px1, text_y_base - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

                global_violation = True
            else:
                # Fully compliant — draw a subtle green box (not red)
                cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 255, 0), 1)

        
        # --- 3. Draw Green PPE Boxes AFTER Red Person Boxes ---
        # This ensures the Green boxes (Helmet, Vest, Glass) are layered on top and clearly visible.
        for d_box in ppe_boxes:
            dx1, dy1, dx2, dy2, d_label, d_conf = d_box
            color = (0, 255, 0) # Green for wearing
            # Draw bounding box
            cv2.rectangle(frame, (dx1, dy1), (dx2, dy2), color, 2)
            
            # Draw label with background
            label_text = f"{d_label} {d_conf:.2f}" 
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(frame, (dx1, dy1 - th - 6), (dx1 + tw, dy1), color, -1)
            cv2.putText(frame, label_text, (dx1, dy1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)

        # EXTREME LOW LIGHT FALLBACK: If room is pitch black and person model fails,
        # but the logic dictates they are missing PPE (nothing detected):
        if person_count == 0:
            missing_ppe = PPE_CLASSES - stable_detected
            if missing_ppe:
                # Still show violation border and warning so user knows system is angry
                global_violation = True
                cv2.putText(frame, "TURN ON LIGHTS - CANNOT SEE PERSON", (20, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 3)

        # (Full-frame red border removed — the per-person box, its MISSING label,
        #  and the status panel already convey violations without the clutter.)

        # Log detection results periodically
        if frame_count % 100 == 0:
            print(f"[Camera {source_index}] Frame {frame_count}: Detected: {detected_classes if detected_classes else 'NONE'}")

        # --- Check for missing PPE and send alerts ---
        # Only flag violations when a PERSON is actually detected. You can't be missing
        # PPE if nobody is in view, so this removes the empty-room false alerts that were
        # tanking safety scores.
        missing_ppe = PPE_CLASSES - stable_detected
        now = time.time()

        if person_count > 0:
            for missing in missing_ppe:
                violation_type = f"Missing {missing}"

                # Throttle: only alert once per cooldown period
                if now - last_alert_time.get(violation_type, 0) > ALERT_COOLDOWN:
                    last_alert_time[violation_type] = now
                    send_alert(frame, violation_type, 0.99, f"Camera {source_index}")

        # --- Live compliance heartbeat (Option B) -----------------------------
        # Post current PPE state so the mobile Home can flip green/red instantly
        # without waiting for the 60-second violation cooldown. In-memory only on
        # the backend (no DB write). Rate-limited to LIVE_STATUS_INTERVAL.
        global _last_live_post
        if active_worker_id and now - _last_live_post >= LIVE_STATUS_INTERVAL:
            _last_live_post = now
            try:
                requests.post(LIVE_STATUS_URL, json={
                    "workerId": active_worker_id,
                    "personDetected": person_count > 0,
                    "present": sorted(stable_detected),
                    "missing": sorted(missing_ppe) if person_count > 0 else [],
                }, timeout=0.5)
            except Exception:
                pass   # never let a network hiccup stall inference
        
        # --- Draw status overlay ---
        # Draw a background box for the status list so it remains clearly visible
        overlay_x = 440
        overlay_y = 10
        cv2.rectangle(frame, (overlay_x - 10, overlay_y), (630, overlay_y + 85), (0, 0, 0), -1)
        
        y_offset = overlay_y + 20
        for ppe_type in ["Helmet", "Vest", "Glove"]:
            if ppe_type in stable_detected:
                status_color = (0, 255, 0)  # Green = detected
                status_text = f"{ppe_type}: OK"
            else:
                status_color = (0, 0, 255)  # Red = missing
                status_text = f"{ppe_type}: MISSING"
            cv2.putText(frame, status_text, (overlay_x, y_offset),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)
            y_offset += 25

        # Update global state
        with lock:
            output_frames[source_index] = frame.copy() 

def generate(source_index):
    """Generator for Flask video stream."""
    global output_frames, lock
    while True:
        with lock:
            if source_index not in output_frames:
                time.sleep(0.1)
                continue
            frame = output_frames[source_index]
            
        frame = cv2.resize(frame, (640, 360))
        (flag, encodedImage) = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
        if not flag: continue
        
        yield(b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + 
              bytearray(encodedImage) + b'\r\n')

@app.route("/video_feed/<int:source_index>")
def video_feed(source_index):
    if source_index >= len(SOURCES):
        return "Camera not found", 404
    return Response(generate(source_index),
                    mimetype = "multipart/x-mixed-replace; boundary=frame")

# Sandbox reuses the globally loaded PPE model — no separate load needed
sandbox_model = None

@app.route("/api/sandbox", methods=["POST"])
def sandbox():
    global sandbox_model
    if sandbox_model is None:
        sandbox_model = model  # Reuse the globally loaded ppe_model_v8
        print("[Sandbox] Using global ppe_model_v8 model ✅")

    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty file"}), 400

    img_bytes = file.read()
    
    # Robust Decode: Try cv2.imdecode first (fastest)
    nparr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Fallback to temp file if imdecode fails (WebP/AVIF issues)
    import tempfile
    import os
    if frame is None:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
                temp_file.write(img_bytes)
                temp_path = temp_file.name
            
            # Use PIL to read the temp file, then convert to numpy, then cv2 read it
            from PIL import Image
            img = Image.open(temp_path).convert('RGB')
            frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
            img.close()  # Must close file handles on Windows before deleting
            
            try:
                os.remove(temp_path)
            except Exception:
                pass # Temp file can persist safely
        except Exception as e:
            print(f"CRITICAL: Failed to decode image: {e}", flush=True)
            return jsonify({"error": f"Invalid image format. Ensure the file is not corrupted."}), 400

    # Do not apply auto-brightness here because internet photos are usually well-lit
    # Save a clean copy BEFORE any boxes are drawn (for glove model + human detection)
    clean_frame = frame.copy()
    results = sandbox_model(frame, verbose=False, imgsz=640, conf=0.05, agnostic_nms=True)
    
    detected = []
    
    for result in results:
        for box in result.boxes:
            label_id = int(box.cls[0])
            if label_id >= len(sandbox_model.names):
                continue
                
            label = sandbox_model.names[label_id]
            conf = float(box.conf[0])
            
            # IGNORE old Glass/Goggles from legacy PPE model
            if label == "Glass":
                continue
            
            print(f"[AI-ENGINE] Detected: {label:<8} | Raw Conf: {conf:.3f}")
            
            # Per-class confidence thresholds (precision-tuned from real testing data)
            # Helmet: Real=0.19+ (looking down) | False=0.164 (fedora) | Threshold=0.18
            # Vest:   Real=0.089+ (angled view) | False=0.080 (no vest) | Threshold=0.085
            if label == "Helmet":
                target_conf = 0.18
            else: # Vest
                target_conf = 0.085
                
            if conf < target_conf:
                print(f"            -> [REJECTED] {label} (Needed {target_conf})")
                continue
            
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            # Size filter: reject absurdly large boxes (hallucinations)
            box_area = (x2 - x1) * (y2 - y1)
            frame_area = frame.shape[0] * frame.shape[1]
            area_ratio = box_area / frame_area
            if area_ratio > 0.60:
                print(f"            -> [REJECTED] {label} (Hallucination - Box Too Large {area_ratio:.1%})")
                continue
            
            # Helmet shape heuristic: safety helmets are wide and round
            # A detection box that is extremely tall and narrow is likely a face, not a helmet
            if label == "Helmet":
                w = x2 - x1
                h = y2 - y1
                aspect = w / max(h, 1)
                if aspect < 0.5:  # Box is more than 2x taller than wide — not a helmet shape
                    print(f"            -> [REJECTED] Helmet (Wrong shape: aspect={aspect:.2f})")
                    continue
            
            print(f"            -> [ACCEPTED] {label} (Minimum {target_conf} met)")
                
            detected.append({"class": label, "confidence": conf})
            
            # Track helmet boxes for glove overlap filtering
            if label == "Helmet":
                if 'helmet_boxes' not in locals():
                    helmet_boxes = []
                helmet_boxes.append((x1, y1, x2, y2))
                
            # draw box with distinct colors per class
            color_map = {"Helmet": (0, 255, 255), "Vest": (0, 165, 255), "Glove": (255, 255, 0)}
            color = color_map.get(label, (0, 255, 0))
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label_text = f"{label} {conf:.2f}"
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
            cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
            cv2.putText(frame, label_text, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2)

    if 'helmet_boxes' not in locals():
        helmet_boxes = []
    
    # --- GLOVE ENSEMBLE for Sandbox (V2 + V3 on clean frame) ---
    # Two-phase detection with cross-model confirmation:
    #   Phase 1: Collect raw detections from both models (size + skin filters)
    #   Phase 2: V2 moderate detections (<0.55) require V3 confirmation in same region
    #   This blocks false positives on casual photos while keeping real gloves
    GLOVE_MIN_CONF = 0.25  # Internal YOLO floor
    V2_ACCEPT = 0.25       # V2 floor (flower blocked by size)
    V3_ACCEPT = 0.30       # V3 floor (flower blocked by confidence)
    V2_HIGH_CONF = 0.55    # V2 above this = auto-accept (definitely a real glove)
    MAX_GLOVES = 2         # A person only has 2 hands
    
    # Phase 1: Collect raw detections from each model
    v2_raw = []  # V2 detections that pass basic filters
    v3_raw = []  # V3 detections above V3_ACCEPT (candidates)
    v3_confirm_pool = []  # ALL V3 detections above GLOVE_MIN_CONF (for V2 cross-confirmation)
    
    for gm, gm_name in [(glove_model_v2, "V2"), (glove_model_v3, "V3")]:
        if gm is None:
            continue
        accept_conf = V2_ACCEPT if gm_name == "V2" else V3_ACCEPT
        g_results = gm(clean_frame, verbose=False, conf=GLOVE_MIN_CONF, iou=0.3, imgsz=640)
        for g_res in g_results:
            for box in g_res.boxes:
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                # Max size filter
                box_area = (x2 - x1) * (y2 - y1)
                frame_area = clean_frame.shape[0] * clean_frame.shape[1]
                area_ratio = box_area / frame_area
                if area_ratio > 0.28:
                    print(f"[AI-ENGINE] {gm_name} Glove {conf:.3f} -> [REJECTED] Box Too Large ({area_ratio:.1%})")
                    continue
                
                # V2-only minimum size filter (blocks flower)
                if gm_name == "V2" and area_ratio < 0.02:
                    print(f"[AI-ENGINE] V2 Glove {conf:.3f} -> [REJECTED] Too Small for V2 ({area_ratio:.1%})")
                    continue
                
                # Skin color detection (blocks bare hands)
                skin_blocked = False
                try:
                    roi = clean_frame[max(0,y1):y2, max(0,x1):x2]
                    if roi.size > 0:
                        hsv_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
                        lower_skin = np.array([0, 30, 60])
                        upper_skin = np.array([25, 170, 255])
                        skin_mask = cv2.inRange(hsv_roi, lower_skin, upper_skin)
                        skin_ratio = np.sum(skin_mask > 0) / max(skin_mask.size, 1)
                        if skin_ratio > 0.40:
                            print(f"[AI-ENGINE] {gm_name} Glove {conf:.3f} -> [REJECTED] Bare hand detected (skin={skin_ratio:.0%})")
                            skin_blocked = True
                except Exception:
                    pass
                if skin_blocked:
                    continue
                
                # V3: save to confirm pool BEFORE threshold (for V2 cross-confirmation)
                if gm_name == "V3":
                    v3_confirm_pool.append((conf, x1, y1, x2, y2))
                
                # Per-model confidence gate
                if conf < accept_conf:
                    print(f"[AI-ENGINE] {gm_name} Glove {conf:.3f} -> [REJECTED] Below {accept_conf}")
                    continue
                
                if gm_name == "V2":
                    v2_raw.append((conf, x1, y1, x2, y2))
                else:
                    v3_raw.append((conf, x1, y1, x2, y2))
    
    # Phase 2: Cross-model confirmation for moderate V2 detections
    all_glove_candidates = []
    
    # Helper: check if the CENTER of a glove box falls inside any helmet box
    # Goggles false positive: glove center is at head level (inside helmet) → REJECT
    # Real gloves at hand level: glove center is below helmet → PASS
    def overlaps_helmet(gx1, gy1, gx2, gy2):
        gcx = (gx1 + gx2) // 2  # glove center X
        gcy = (gy1 + gy2) // 2  # glove center Y
        for hx1, hy1, hx2, hy2 in helmet_boxes:
            if hx1 <= gcx <= hx2 and hy1 <= gcy <= hy2:
                return True
        return False
    
    # V3 detections: accept directly (filtered by threshold + helmet overlap)
    for conf, x1, y1, x2, y2 in v3_raw:
        if overlaps_helmet(x1, y1, x2, y2):
            print(f"[AI-ENGINE] V3 Glove {conf:.3f} -> [REJECTED] Overlaps helmet area")
            continue
        print(f"[AI-ENGINE] V3 Glove {conf:.3f} -> [CANDIDATE]")
        all_glove_candidates.append((conf, x1, y1, x2, y2, "V3"))
    
    # V2 detections: apply helmet overlap check (same as V3)
    for conf, x1, y1, x2, y2 in v2_raw:
        if overlaps_helmet(x1, y1, x2, y2):
            print(f"[AI-ENGINE] V2 Glove {conf:.3f} -> [REJECTED] Overlaps helmet area")
            continue
        print(f"[AI-ENGINE] V2 Glove {conf:.3f} -> [CANDIDATE]")
        all_glove_candidates.append((conf, x1, y1, x2, y2, "V2"))
    
    # Deduplicate overlapping boxes: if V2 and V3 both found the same hand, keep the higher conf
    final_gloves = []
    for candidate in sorted(all_glove_candidates, key=lambda c: c[0], reverse=True):
        if len(final_gloves) >= MAX_GLOVES:
            break  # A person only has 2 hands — stop after 2 best detections
        conf, cx1, cy1, cx2, cy2, src = candidate
        # Check if this box overlaps significantly with any already-accepted box
        dominated = False
        for _, fx1, fy1, fx2, fy2, _ in final_gloves:
            ix1 = max(cx1, fx1)
            iy1 = max(cy1, fy1)
            ix2 = min(cx2, fx2)
            iy2 = min(cy2, fy2)
            if ix1 < ix2 and iy1 < iy2:
                intersection = (ix2 - ix1) * (iy2 - iy1)
                area_c = (cx2 - cx1) * (cy2 - cy1)
                area_f = (fx2 - fx1) * (fy2 - fy1)
                iou = intersection / (area_c + area_f - intersection)
                if iou > 0.3:
                    dominated = True
                    break
        if not dominated:
            final_gloves.append(candidate)
    
    # Draw and register the final accepted gloves (max 2 clean boxes)
    for conf, x1, y1, x2, y2, src in final_gloves:
        print(f"[AI-ENGINE] ✅ ACCEPTED Glove from {src} | Conf: {conf:.3f}")
        detected.append({"class": "Glove", "confidence": conf})
        color = (255, 255, 0)  # Yellow for Glove
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        label_text = f"Glove {conf:.2f}"
        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
        cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
        cv2.putText(frame, label_text, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2)

    # 1. Ask Human Core (yolov8n) if there is a person (RUN BEFORE FALLBACKS)
    human_detected = False
    person_boxes = []
    if human_core is not None:
        hr = human_core(clean_frame, classes=[0], verbose=False) # Class 0 = Person
        for r in hr:
            for box in r.boxes:
                person_boxes.append(box.xyxy[0])
                human_detected = True

    # (Haar cascade Goggles fallback removed — replaced by dedicated Glove model)

    # --- FINAL COMPLIANCE LOGIC ---
    required_ppe = ["Helmet", "Vest", "Glove"]
    found_ppe = [d['class'] for d in detected]
    missing_ppe = [item for item in required_ppe if item not in found_ppe]
    
    if len(found_ppe) > 0:
        human_detected = True

    status = "COMPLIANT"
    
    # If a human is in the frame, but they don't have all PPE -> Violation
    if human_detected:
        if len(missing_ppe) > 0:
            status = f"VIOLATION: Person detected without {', '.join(missing_ppe)}"
            # If they have absolutely 0 PPE, classify as NORMAL CLOTHES
            if len(found_ppe) == 0:
                # Draw a red box over the whole frame if no person box found
                if len(person_boxes) > 0:
                    px1, py1, px2, py2 = map(int, person_boxes[0])
                else:
                    h, w = frame.shape[:2]
                    px1, py1, px2, py2 = 5, 5, w - 5, h - 5
                cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 0, 255), 3)
                cv2.putText(frame, "NORMAL CLOTHES - NO PPE!", (px1, max(28, py1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 255), 2)
                detected.append({"class": "NORMAL CLOTHES (Violation)", "confidence": 0.99})
            # If they have SOME PPE but are missing others, classify as INCOMPLETE
            elif len(found_ppe) > 0:
                if len(person_boxes) > 0:
                    px1, py1, px2, py2 = map(int, person_boxes[0])
                    cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 165, 255), 3)
                    cv2.putText(frame, f"INCOMPLETE PPE (Missing: {', '.join(missing_ppe)})", (px1, max(28, py1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
        else:
            status = "COMPLIANT: Full PPE Detected"
    else:
        status = "No Person Detected (Empty Room)"
        missing_ppe = [] 
    
    # encode back to base64
    _, buffer = cv2.imencode('.jpg', frame)
    b64_img = base64.b64encode(buffer).decode('utf-8')
    
    return jsonify({
        "image": f"data:image/jpeg;base64,{b64_img}",
        "detections": detected,
        "missing_ppe": missing_ppe,
        "status": status,
        "human_detected": human_detected
    })

@app.route("/")
def index():
    return jsonify({
        "status": "PPE Monitoring AI Engine v2.0 Running",
        "model": "ppe_model_v8 & glove_model_v8",
        "classes": ["Helmet", "Vest", "Glove"],
        "endpoints": [f"/video_feed/{i}" for i in range(len(SOURCES))]
    })

def poll_worker_status():
    """Background thread: polls the server every 5 s for online workers.
    Activates the camera when any worker is logged in; deactivates it when none are.

    A 3-second startup delay is applied before the first poll so the Node.js
    server has time to finish resetting stale isOnline DB flags from the
    previous session. Without this delay a crashed-and-restarted session could
    leave a worker marked online in the DB and cause detection to start
    immediately at boot before any real login occurs.
    """
    global camera_active, active_worker_id
    SERVER_URL = "http://127.0.0.1:5001/api/users/online-workers"
    was_active = False

    # Wait for the backend to reset stale isOnline flags before first poll.
    print("[CAMERA-CTRL] Camera is OFF — waiting for worker login...")
    time.sleep(3)

    while True:
        try:
            resp = requests.get(SERVER_URL, timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                count = data.get('count', 0)
                workers = data.get('workers', [])

                if count > 0:
                    worker = workers[0]  # Use the first (most recent) online worker
                    active_worker_id = worker.get('workerId')
                    if not was_active:
                        print(f"[CAMERA-CTRL] Worker '{worker.get('username')}' ({active_worker_id}) logged in → Camera ON")
                        camera_active.set()
                        was_active = True
                else:
                    active_worker_id = None
                    if was_active:
                        # Transition ON→OFF: log once and clear the event
                        print("[CAMERA-CTRL] No workers online → Camera OFF")
                        print("[CAMERA-CTRL] Camera is OFF — waiting for worker login...")
                        camera_active.clear()
                        was_active = False
            # If server unreachable, keep current state (no log spam)
        except Exception:
            pass
        time.sleep(5)


if __name__ == "__main__":
    # Guarantee camera starts OFF before any thread touches the Event
    camera_active.clear()

    # Start camera threads — they block internally until camera_active is set
    for i, source in enumerate(SOURCES):
        t = threading.Thread(target=camera_worker, args=(i, source))
        t.daemon = True
        t.start()

    # Start background poller that gates camera on worker login.
    # The poller itself prints the initial idle message and waits 3 s before
    # the first poll, so we do NOT print a duplicate message here.
    poller = threading.Thread(target=poll_worker_status, daemon=True)
    poller.start()

    print(f"Starting AI Engine Stream on http://localhost:5002")
    app.run(host="0.0.0.0", port=5002, debug=False, threaded=True, use_reloader=False)
