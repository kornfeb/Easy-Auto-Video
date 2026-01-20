import os
import json

def get_crops_path(project_path):
    return os.path.join(project_path, "input", "crops.json")

def load_crops(project_path):
    path = get_crops_path(project_path)
    if os.path.exists(path):
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_crop(project_path, filename, roi, crop_box, confidence=1.0, type="unknown"):
    crops = load_crops(project_path)
    crops[filename] = {
        "roi": roi,
        "crop_box": crop_box,
        "confidence": confidence,
        "type": type,
        "updated_at": os.path.getmtime(os.path.join(project_path, "input", filename)) if os.path.exists(os.path.join(project_path, "input", filename)) else 0
    }
    path = get_crops_path(project_path)
    with open(path, 'w') as f:
        json.dump(crops, f, indent=2)

def get_crop_data(project_path, filename):
    crops = load_crops(project_path)
    return crops.get(filename)
