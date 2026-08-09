# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-08-07

First stable release supporting the Group 42 thesis defence.

### Added
- YOLOv8-based PPE detection engine (helmet, vest, glove) with CLAHE preprocessing
- Node.js backend with embedded Aedes MQTT broker and Socket.io
- React + Vite supervisor dashboard: live camera monitor, violation logs, analytics
- Flutter cross-platform mobile app with MQTT + HTTP-poll dual-path alerts
- Retraining Colab notebooks for both PPE and glove models
- Per-worker compliance score (30-day rolling window)
- Person-region gating so PPE detections only count when a person is present
- Dedup pass on overlapping same-class boxes

### Fixed
- Helmet false positives on bare heads (raised class threshold from 0.12 to 0.35)
- Glove hallucinations on wall textures (V2 + V3 union with size/shape filters)
