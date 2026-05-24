# Model retraining — close the live-feed domain gap

Two separate retrains, two separate notebooks:

| Model | Fixes | Notebook | Base dataset (you zip + upload) | Extra ingredient |
|---|---|---|---|---|
| **PPE (Helmet/Vest)** | misses real helmets (false negatives) | `PPE_Retrain_Colab.ipynb` | `/home/sharma/Downloads/PPE_Filtered` | — |
| **Glove** | fires on the wall (false positives) | `GLOVE_Retrain_Colab.ipynb` | `Training Work/gloves_retrain_v3` | `glove_hard_negatives.zip` (prepared, in this folder) |

---

# PPE (Helmet/Vest) retrain — close the live-feed domain gap

Fixes the **helmet false-negative** at its root (the 0.12 gate in
`ai-engine/main.py` is only a band-aid).

## ⭐ Easiest path: the Colab notebook
Open **`PPE_Retrain_Colab.ipynb`** in Google Colab (needs a GPU runtime). It does
prune → CLAHE bake → train end-to-end. You only: (1) zip `PPE_Filtered` → upload the
zip to Google Drive, (2) set runtime to GPU, (3) Run all. It saves the new
`ppe_v9_clahe_best.pt` to your Drive.

The three standalone scripts below are the same steps for a **local CUDA GPU** box.

---

Run them in order.

| Step | Script | Where it runs | Needs GPU? |
|---|---|---|---|
| 1. Cap background images at 12% | `prune_negatives.py` | any machine | no |
| 2. Bake CLAHE into a dataset copy | `clahe_bake.py` | any machine | no |
| 3. Retrain PPE model | `train_ppe.py` | **Colab / CUDA GPU** | **yes** |

## Why
- Live feed applies `CLAHE(clipLimit=2.0)` before inference; training data did not →
  the model sees an unfamiliar distribution → misses real PPE.
- The PPE train set was **20% background** (7,633 empty labels / 37,936) — over the
  healthy 10–15%, which over-suppresses weak-but-correct detections.

## Run order
```bash
cd retraining

# 1) prune negatives  (edit DRY_RUN=False after checking the numbers)
python prune_negatives.py

# 2) bake CLAHE  ->  /home/sharma/Downloads/PPE_Filtered_clahe/
python clahe_bake.py

# 3) train on a GPU (Colab). Produces runs/detect/ppe_v9_clahe/weights/best.pt
python train_ppe.py
```

## After training
1. Copy `best.pt` to the server's `ai-engine/` and update the model path.
2. Raise the Helmet gate in `ai-engine/main.py` from `0.12` back to `~0.25`
   (the model is now confident in your lighting, so the low gate is no longer needed).

## Paths
All scripts point at `/home/sharma/Downloads/PPE_Filtered` (the Helmet/Vest dataset).
Edit the constants at the top of each file if your dataset moves (e.g. onto Colab).

---

# GLOVE retrain — kill the wall false positives

**Why:** measured on your live frame, a wall scores ~0.63 while a real glove scores
~0.57 in the glove model. No threshold separates them — the model itself must be
retrained to learn *"this wall is not a glove."*

**Datasets (where to find them):**
- **Base positives:** `Training Work/gloves_retrain_v3` (3,350 train / 751 val,
  single `Glove` class — the dataset that trained your live model). Zip this folder →
  upload `gloves_retrain_v3.zip` to Google Drive.
- **Hard negatives (already prepared for you):**
  `retraining/glove_hard_negatives/` and its ready-to-upload
  `retraining/glove_hard_negatives.zip` (6.4 MB). These are 84 augmented images built
  from the **12 gloveless frames your own camera saved** (`debug_cam0_frame*.jpg`) —
  your real room/wall, labelled empty (= no glove). Upload this zip to Drive too.

**Run:** open `GLOVE_Retrain_Colab.ipynb` in Colab (GPU) → Run all. It CLAHE-bakes the
base, merges the room hard-negatives into train, trains, and saves
`glove_v4_hardneg_best.pt` to your Drive.

**Deploy:** overwrite `Training Work/glove_model_v2/weights/best.pt` with the new
weights (or add as `glove_model_v4` and update `GLOVE_V2_PATH` in `main.py`), restart
the engine. Point the camera at the wall → should stay 0 gloves.

> Note: 12 real frames (→84 augmented) is a modest hard-negative set — it will
> strongly reduce the wall false positives for *this* room. If you can later record
> more gloveless clips of the deployment area, drop them into
> `glove_hard_negatives/images/` (with matching empty `.txt` in `labels/`) and re-zip.
