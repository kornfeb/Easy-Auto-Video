import os
import shutil
from core.logger import log_event
from core.errors import PipelineError
from core.step_base import PipelineStep

class CoverSelectionStep(PipelineStep):
    def __init__(self):
        super().__init__("01_cover_selection", "Select Cover image")

    def run(self, project_id: str, project_path: str) -> bool:
        log_event(project_path, "pipeline.log", "[STEP 01] Selecting cover image (Goal: 2nd Image)...")
        
        input_dir = os.path.join(project_path, "input")
        valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
        
        # 1. Get images from input
        if not os.path.exists(input_dir):
            raise PipelineError("Input folder missing", message_th="ไม่พบโฟลเดอร์ /input")
            
        images = sorted([f for f in os.listdir(input_dir) if any(f.lower().endswith(ext) for ext in valid_exts) and f != "cover.jpg" and not f.startswith("ai_cover")])
        
        if not images:
            raise PipelineError("No images found for cover", message_th="ไม่พบรูปภาพในโฟลเดอร์ /input")
            
        # Select 2nd image if available, else 1st
        selected_image = images[1] if len(images) > 1 else images[0]
        label = "2nd" if len(images) > 1 else "1st"
        
        source_path = os.path.join(project_path, "cover_source.jpg")
        cover_path = os.path.join(project_path, "cover.jpg")
        
        log_event(project_path, "pipeline.log", f"[STEP 01] Selecting {label} image: {selected_image}")
        
        import json
        project_json_path = os.path.join(project_path, "project.json")
        with open(project_json_path, 'r') as f:
            data = json.load(f)
        if "cover" not in data: data["cover"] = {}
        data["cover"]["source_image_id"] = selected_image
        with open(project_json_path, 'w') as f:
            json.dump(data, f, indent=2)

        shutil.copy2(os.path.join(input_dir, selected_image), source_path)
        # Also copy to cover.jpg initially (clean version)
        shutil.copy2(source_path, cover_path)
        
        log_event(project_path, "pipeline.log", "[STEP 01] Cover selection completed.")
        return True
