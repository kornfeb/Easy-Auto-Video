import os
from core.logger import log_event
from core.errors import ValidationError
from core.step_base import PipelineStep

class ValidateStep(PipelineStep):
    def __init__(self):
        super().__init__("validate", "Validate Input")

    def run(self, project_id: str, project_path: str) -> bool:
        input_dir = os.path.join(project_path, "input")
        valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
        
        if not os.path.exists(input_dir):
            raise ValidationError(
                "Input directory /input is missing", 
                message_th="ไม่พบโฟลเดอร์ /input ในโปรเจกต์"
            )
            
        image_files = [f for f in os.listdir(input_dir) if any(f.lower().endswith(ext) for ext in valid_exts)]
        
        if len(image_files) == 0:
            raise ValidationError(
                "No valid image files found in /input", 
                message_th="ไม่พบไฟล์รูปภาพที่ใช้งานได้ในโฟลเดอร์ /input",
                detail="Supported types: jpg, jpeg, png, webp"
            )
        
        log_msg = f"[STEP 1] Found {len(image_files)} image(s) in /input (Validated)"
        log_event(project_path, "pipeline.log", log_msg)
        return True
