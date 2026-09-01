# Roadmap

Ordered by expected user impact.

## Near-term (0–3 months)

- [ ] **Multi-camera support** — a real site has several zones; today one
  process handles one camera. Extend `main.py` to spawn a thread per
  configured camera source and merge detection streams into the same
  backend endpoint.

- [ ] **Edge deployment** — containerise the AI engine and deploy on a
  Raspberry Pi 5 or NVIDIA Jetson Nano. Removes network bandwidth as a
  bottleneck and eliminates the cloud dependency entirely.

- [ ] **Automated compliance reports** — a scheduled job that emails
  supervisors a weekly PDF summarising violations per worker, most common
  missing items and compliance-score trend.

## Medium-term (3–6 months)

- [ ] **Retraining pipeline in-product** — a data-collection page in the
  admin dashboard where supervisors can flag false detections. Flagged
  frames feed a nightly retraining job.

- [ ] **Wearable integration** — a Bluetooth band or hard-hat beacon so a
  worker who left their phone in a locker still receives the haptic alert.

- [ ] **Facial recognition for worker identification** — currently the
  system assumes one worker per camera zone. Face embedding would allow
  per-worker tracking when several workers share a zone.

## Long-term (6–12 months)

- [ ] **On-device inference in the mobile app** — a smaller PPE model
  bundled with the Flutter app, so a supervisor's phone can do spot-checks
  without needing infrastructure.

- [ ] **Multi-language interface** — Somali + Arabic dashboards and mobile
  UI for the target deployment region.

- [ ] **Federated retraining across deployments** — sites contribute
  gradient updates without sharing raw imagery.
