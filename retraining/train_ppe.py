#!/usr/bin/env python3
"""
Fix 2 — retrain the PPE (Helmet/Vest) model to close the domain gap.

Run this on a GPU machine (Google Colab with a T4/A100, or a local CUDA box).
It will NOT train usefully on CPU — 38k images x 120 epochs needs a GPU.

Recommended flow:
  1) python prune_negatives.py         (cap background at 12%, on the dataset)
  2) python clahe_bake.py              (bake CLAHE -> PPE_Filtered_clahe/)
  3) python train_ppe.py               (this file — trains on the baked set)
  4) copy runs/detect/*/weights/best.pt  ->  ai-engine/ on the Contabo server
  5) raise the Helmet gate in main.py back to ~0.25 once mAP is healthy

The hsv_v / hsv_h args are the key knobs for your dim, green-fluorescent room.
"""
from ultralytics import YOLO

# If you baked CLAHE (Option A), point at the baked set:
DATA = "/home/sharma/Downloads/PPE_Filtered_clahe/data.yaml"
# If you did NOT bake and want probabilistic CLAHE instead, set USE_ALBU_CLAHE = True
# and point DATA at the ORIGINAL PPE_Filtered/data.yaml.
USE_ALBU_CLAHE = False


def enable_albumentations_clahe():
    """Option B: inject CLAHE + MotionBlur into Ultralytics' Albumentations pipeline."""
    import ultralytics.data.augment as aug
    import albumentations as A

    _orig_init = aug.Albumentations.__init__

    def _patched_init(self, p=1.0):
        _orig_init(self, p)
        self.transform = A.Compose(
            [
                A.CLAHE(clip_limit=2.0, p=0.5),        # matches inference preprocessing
                A.MotionBlur(blur_limit=7, p=0.2),     # live motion blur
                A.RandomBrightnessContrast(p=0.3),
            ],
            bbox_params=A.BboxParams(format="yolo", label_fields=["class_labels"]),
        )

    aug.Albumentations.__init__ = _patched_init
    print("[train] Albumentations CLAHE(p=0.5) + MotionBlur enabled")


def main():
    if USE_ALBU_CLAHE:
        enable_albumentations_clahe()

    model = YOLO("yolov8s.pt")   # or resume from your current best.pt
    model.train(
        data=DATA,
        epochs=120,
        imgsz=640,
        batch=16,
        # --- lighting / colour augmentation for dim + fluorescent feeds ---
        hsv_h=0.03,     # hue jitter -> handles the green colour cast
        hsv_s=0.7,      # saturation
        hsv_v=0.5,      # VALUE (brightness) jitter -> #1 knob for dim/variable light
        # --- geometric / regularisation ---
        mosaic=1.0,
        mixup=0.15,
        degrees=5,
        translate=0.1,
        scale=0.5,
        erasing=0.4,
        name="ppe_v9_clahe",
    )
    print("\nDone. Best weights: runs/detect/ppe_v9_clahe/weights/best.pt")
    print("Copy that best.pt to ai-engine/ on the server and update the model path.")


if __name__ == "__main__":
    main()
