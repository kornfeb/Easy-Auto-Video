import os
import json
from core.logger import log_event
from core.errors import PipelineError
from core.step_base import PipelineStep
from utils.cover_generator import generate_cover_text_ai
from utils.image_processor import render_cover_overlay

class TextHookStep(PipelineStep):
    def __init__(self):
        super().__init__("02_text_hook", "Generate Hook & Overlay")

    def run(self, project_id: str, project_path: str) -> bool:
        log_event(project_path, "pipeline.log", "[STEP 02] Generating AI Hook for cover...")
        
        project_json_path = os.path.join(project_path, "project.json")
        if not os.path.exists(project_json_path):
            raise PipelineError("Project settings missing", message_th="ไม่พบไฟล์ project.json")
            
        with open(project_json_path, 'r') as f:
            data = json.load(f)
            
        # Try to get product_name from input/product.json first, then project.json
        product_name = None
        product_json_path = os.path.join(project_path, "input", "product.json")
        if os.path.exists(product_json_path):
            try:
                with open(product_json_path, 'r') as f:
                    product_data = json.load(f)
                    product_name = product_data.get("product_name")
            except:
                pass
        
        # Fallback to project.json
        if not product_name:
            product_name = data.get("product_name", "น่าสนใจ")
        
        # 1. Generate Hook Text
        res = generate_cover_text_ai(project_path, product_name)
        
        # Initialize with default styling
        text_overlay = {
            "position": "center",
            "color": "#FFFFFF",
            "background": "gradient",
            "font": "Thai_Default",
            "weight": "regular"
        }
        
        if "error" in res:
            log_event(project_path, "pipeline.log", f"[STEP 02] AI Hook Error: {res['error']}. Using fallback.")
            text_overlay["title"] = f"รีวิว {product_name}"
            text_overlay["subtitle"] = "ของคุณภาพดี ต้องมีติดบ้าน"
        else:
            options = res.get("options", [])
            if options:
                text_overlay["title"] = options[0].get("title", "พรีเมียม")
                text_overlay["subtitle"] = options[0].get("subtitle", "ราคาคุ้มค่า")
        
        # Save to project.json
        if "cover" not in data: data["cover"] = {}
        data["cover"]["text_overlay"] = text_overlay
        with open(project_json_path, 'w') as f:
            json.dump(data, f, indent=2)
            
        # 2. Render Overlay
        log_event(project_path, "pipeline.log", f"[STEP 02] Rendering overlay: {text_overlay['title']}")
        render_res = render_cover_overlay(project_path, text_overlay)
        
        if render_res.get("status") == "FAIL":
            log_event(project_path, "pipeline.log", f"[STEP 02] WARN: Overlay failed: {render_res.get('error')}")
            
        log_event(project_path, "pipeline.log", "[STEP 02] Hook generation completed.")
        return True
