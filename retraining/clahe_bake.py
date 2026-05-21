#!/usr/bin/env python3
"""
Fix 2 (Option A) — bake CLAHE into a copy of the dataset.

Your live engine applies CLAHE(clipLimit=2.0, tileGridSize=(8,8)) to every frame
before inference (ai-engine/main.py). The training images were NOT CLAHE-processed,
so the model sees a different distribution at runtime -> domain gap -> false negatives.

This makes an EXACT copy of the dataset with the SAME CLAHE applied to every image,
and copies the labels unchanged. Train on the copy and train == inference by design.

Runs on CPU (no GPU needed). 38k images takes a while — that is expected.
"""
import os, glob, shutil, cv2

SRC = "/home/sharma/Downloads/PPE_Filtered"          # original dataset root
DST = "/home/sharma/Downloads/PPE_Filtered_clahe"    # CLAHE-baked copy (created)
SPLITS = ["train", "valid", "test"]
IMG_EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")

# IDENTICAL to ai-engine/main.py so the model trains on what it sees at inference
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))


def bake_image(src_path, dst_path):
    img = cv2.imread(src_path)
    if img is None:
        return False
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = clahe.apply(l)
    out = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
    cv2.imwrite(dst_path, out)
    return True


def main():
    for split in SPLITS:
        src_img = os.path.join(SRC, split, "images")
        src_lbl = os.path.join(SRC, split, "labels")
        if not os.path.isdir(src_img):
            continue
        dst_img = os.path.join(DST, split, "images")
        dst_lbl = os.path.join(DST, split, "labels")
        os.makedirs(dst_img, exist_ok=True)
        os.makedirs(dst_lbl, exist_ok=True)

        # labels copied unchanged (CLAHE does not move boxes)
        if os.path.isdir(src_lbl):
            for lf in glob.glob(os.path.join(src_lbl, "*.txt")):
                shutil.copy2(lf, os.path.join(dst_lbl, os.path.basename(lf)))

        imgs = [p for p in glob.glob(os.path.join(src_img, "*")) if p.lower().endswith(IMG_EXTS)]
        done = 0
        for p in imgs:
            if bake_image(p, os.path.join(dst_img, os.path.basename(p))):
                done += 1
            if done % 2000 == 0:
                print(f"  {split}: {done}/{len(imgs)}")
        print(f"{split}: baked {done}/{len(imgs)} images")

    # write a data.yaml with relative paths that works on Linux/Colab
    yaml_path = os.path.join(DST, "data.yaml")
    with open(yaml_path, "w") as f:
        f.write(
            "path: .\n"
            "train: train/images\n"
            "val: valid/images\n"
            "test: test/images\n"
            "nc: 3\n"
            "names:\n  0: Glass\n  1: Helmet\n  2: Vest\n"
        )
    print(f"\nDone. CLAHE-baked dataset at: {DST}")
    print(f"Wrote {yaml_path} — point training at this.")


if __name__ == "__main__":
    main()
