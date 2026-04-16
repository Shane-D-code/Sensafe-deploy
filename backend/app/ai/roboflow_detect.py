import requests
import hashlib
from app.core.ml_config import MODELS

def calculate_image_hash(image_path: str) -> str:
    """Calculate SHA256 hash of image for deduplication"""
    sha256_hash = hashlib.sha256()
    with open(image_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def calculate_severity(detections: list) -> str:
    """
    Calculate severity based on number and type of detections
    
    Rules:
    - 0 detections: none
    - 1-2 detections: low
    - 3-5 detections: medium
    - 6+ detections: high
    """
    count = len(detections)
    if count == 0:
        return "none"
    elif count <= 2:
        return "low"
    elif count <= 5:
        return "medium"
    else:
        return "high"

def detect_all(image_path: str):
    """
    Detect exits using all configured Roboflow models
    
    Returns combined predictions from all models with enhanced metadata
    """
    results = {}
    
    # Call each model
    for model in MODELS:
        try:
            with open(image_path, "rb") as f:
                response = requests.post(
                    model.url,
                    files={"file": f},
                    timeout=30
                )
                response.raise_for_status()
                results[model.name] = response.json()
        except Exception as e:
            # Log error but continue with other models
            print(f"Error calling {model.name} model: {e}")
            results[model.name] = {"predictions": [], "error": str(e)}
    
    # Combine all predictions
    combined = []
    for model_name, data in results.items():
        if "predictions" in data:
            for p in data["predictions"]:
                p["model"] = model_name
                combined.append(p)
    
    return combined