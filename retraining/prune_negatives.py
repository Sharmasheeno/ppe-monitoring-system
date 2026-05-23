#!/usr/bin/env python3
"""
Fix 3 — Negative-image pruning.

Caps the fraction of background (empty-label) images in a YOLO train split so the
model stops over-suppressing real detections. Your PPE_Filtered/train started at
~20% background; the healthy range is 10-15%. This script MOVES (never deletes)
the excess negatives + their label files into backup_negatives/ so it is fully
reversible — just move them back to undo.

Run DRY first (default), read the numbers, then set DRY_RUN = False.
"""
import os, glob, shutil, random

# ---- point these at the split you are pruning -----------------------------
LABELS_DIR = "/home/sharma/Downloads/PPE_Filtered/train/labels"
IMAGES_DIR = "/home/sharma/Downloads/PPE_Filtered/train/images"
BACKUP_DIR = "/home/sharma/Downloads/PPE_Filtered/backup_negatives"
CAP        = 0.12          # target max background fraction of the final dataset
IMG_EXTS   = (".jpg", ".jpeg", ".png", ".bmp", ".webp")
DRY_RUN    = True          # <-- set False to actually move files
random.seed(42)            # deterministic selection
# ---------------------------------------------------------------------------


def find_image(stem):
    for ext in IMG_EXTS:
        p = os.path.join(IMAGES_DIR, stem + ext)
        if os.path.exists(p):
            return p
    return None


def main():
    label_files = glob.glob(os.path.join(LABELS_DIR, "*.txt"))
    negatives = [f for f in label_files if os.path.getsize(f) == 0]
    total, neg = len(label_files), len(negatives)
    pos = total - neg

    max_neg = int(pos * CAP / (1 - CAP))     # negatives allowed at the CAP
    to_move = max(0, neg - max_neg)

    print(f"Labels dir : {LABELS_DIR}")
    print(f"Total      : {total}")
    print(f"Positives  : {pos}")
    print(f"Background  : {neg}  ({100 * neg / max(total, 1):.2f}%)")
    print(f"Cap {CAP:.0%}   : keep {min(neg, max_neg)} background, MOVE {to_move}")

    if to_move == 0:
        print("\nAlready at/under the cap — nothing to do.")
        return

    os.makedirs(os.path.join(BACKUP_DIR, "labels"), exist_ok=True)
    os.makedirs(os.path.join(BACKUP_DIR, "images"), exist_ok=True)

    moved = 0
    for lf in random.sample(negatives, to_move):
        stem = os.path.splitext(os.path.basename(lf))[0]
        img = find_image(stem)
        if DRY_RUN:
            print(f"  [dry] would move {stem}")
        else:
            shutil.move(lf, os.path.join(BACKUP_DIR, "labels", os.path.basename(lf)))
            if img:
                shutil.move(img, os.path.join(BACKUP_DIR, "images", os.path.basename(img)))
            moved += 1

    new_frac = 100 * max_neg / (pos + max_neg)
    if DRY_RUN:
        print(f"\nDRY RUN — nothing moved. New background would be ~{new_frac:.1f}%.")
        print("Set DRY_RUN = False and re-run to apply.")
    else:
        print(f"\nMoved {moved} background pairs -> {BACKUP_DIR}")
        print(f"New background fraction ~{new_frac:.1f}%.  To undo: move them back.")


if __name__ == "__main__":
    main()
