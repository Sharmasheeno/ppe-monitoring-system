# Performance notes

Measured on the deployment machine — a mid-range laptop with an integrated
GPU or the Contabo VPS (CPU-only) — running `main.py` at `imgsz=640`.

## Frame rates

| Hardware | Rate | Latency (frame → violation POST) |
|----------|------|----------------------------------|
| Laptop CPU (i5-1240P) | 3–5 fps | ~250 ms |
| Contabo VPS (2-vCPU) | 2–3 fps | ~350 ms |
| Colab T4 GPU (tunnelled) | 8–12 fps | ~120 ms |

The pipeline is dominated by YOLOv8 inference; CLAHE preprocessing and the
person-region filter together add ~15 ms.

## Alert delivery

End-to-end latency from a violation being detected by the AI engine to the
worker's phone vibrating:

| Path | Median | p95 |
|------|--------|-----|
| MQTT | 420 ms | 680 ms |
| HTTP poll (5-s interval) | 2 500 ms | 5 000 ms |

The mobile app subscribes to both channels — whichever fires first triggers
the alarm, and the second is deduplicated by `violationId`.

## Backend throughput

10 parallel Postman workers hitting `POST /api/violations` all completed
within 200 ms. Under this load, MongoDB and the embedded Aedes broker showed
no contention on the VPS.

## Optimisations already applied

- **Worker-presence gating** — the AI engine polls the backend every 5 s to
  check if any worker is logged in. When nobody is, the camera loop sleeps.
  Saves 100% of GPU on empty sites.
- **Per-class thresholds** — trained models emit low-conf hallucinations;
  gating per class removes them without a global threshold hurting recall.
- **NMS + custom dedup** — YOLO's built-in NMS plus a containment check
  removes stacked boxes on the same object.

## Room for improvement

- CUDA on the Contabo VPS is not available — a permanent GPU deployment
  would triple frame rate.
- The mobile app polls even while MQTT is connected — an idle detection
  could reduce battery use.
- Snapshot writes to MongoDB include the base64-encoded JPEG; moving to
  S3-compatible object storage would reduce DB size dramatically.
