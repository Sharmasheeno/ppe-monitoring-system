# Model training

Both models are trained in Google Colab (T4 GPU) using the notebooks in `retraining/`.

## Datasets

### PPE model (Helmet + Vest)
- Source: Roboflow *Construction Site Safety* + Kaggle *PPE Detection* + hard-negative frames from the deployment camera.
- Size: 37 955 train / 585 valid / 2 335 test.
- Label format: YOLO, three classes (Glass, Helmet, Vest); Glass filtered at inference time.

### Glove model
- Source: Roboflow *Safety Gloves v3* + hard-negative frames captured from the deployment camera itself.
- Size: 3 350 train / 751 valid / 380 test.
- Label format: YOLO, one class (Glove).

## Training regime

### PPE model
- Base weights: `yolov8s.pt`
- Epochs: 30 (early-stop patience 10)
- Optimizer: AdamW, `lr0=0.001`, freeze first 10 layers
- Augmentation: mosaic 1.0, mixup 0.1, HSV jitter (h=0.015, s=0.7, v=0.4), fliplr 0.5

### Glove model
- Base weights: `yolov8s.pt`
- Epochs: 120 (early-stopped at 94, patience 30)
- Optimizer: SGD, `lr0=0.01`, no freeze
- Augmentation: wider hue jitter (h=0.05), rotation ±5°, otherwise as above

## Reproducing the runs

Upload the dataset zips to Google Drive, then open the corresponding Colab notebook
in `retraining/` and run all cells. The trained weights are saved to
`runs/detect/<name>/weights/best.pt` — copy them into `Training Work/<name>/weights/`.

## Retraining with new hard negatives

1. Collect misdetection frames from the deployment (the AI engine already saves
   sample frames every 300 iterations to `ai-engine/debug_cam0_frame*.jpg`).
2. Label them in Roboflow.
3. Re-run the notebook; the mosaic augmentation will mix them with the existing set.
