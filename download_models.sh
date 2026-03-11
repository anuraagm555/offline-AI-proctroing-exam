#!/bin/bash
mkdir -p frontend/models
cd frontend/models

echo "Downloading Face API Models..."

# Tiny Face Detector (Manifest)
curl -L -o tiny_face_detector_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json

# Tiny Face Detector (Shard)
curl -L -o tiny_face_detector_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1

echo "Models downloaded."
