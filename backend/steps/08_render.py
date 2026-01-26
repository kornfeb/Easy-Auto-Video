import os
import json
from datetime import datetime
from core.logger import log_event
from core.errors import RenderError
from core.step_base import PipelineStep
from utils.video_renderer import render_video

class RenderStep(PipelineStep):
    def __init__(self):
        super().__init__("08_render", "Final Video Render")

    def run(self, project_id: str, project_path: str) -> bool:
        log_event(project_path, "pipeline.log", "[STEP 08] Starting final video rendering...")
        
        project_json_path = os.path.join(project_path, "project.json")
        video_format = "portrait"
        transition_id = "none"
        transition_duration = 0.5
        
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                pdata = json.load(f)
                v_set = pdata.get("settings", {}).get("video", {})
                video_format = v_set.get("format", "portrait")
                transition_id = v_set.get("transition", "slideright") # Use slideright as default for premium feel
                transition_duration = v_set.get("transition_duration", 1.0)

        from core.project import get_video_output_path
        output_file = get_video_output_path(project_path)

        result = render_video(
            project_path, 
            video_format=video_format, 
            transition_id=transition_id, 
            transition_duration=transition_duration,
            output_file=output_file
        )
        
        if result.get("status") == "FAIL":
            err = result.get("error", "Unknown error")
            raise RenderError(f"Render failed: {err}", message_th=f"การเรนเดอร์วิดีโอล้มเหลว: {err}")

            
        # Save video path to project.json for easy access
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                pdata = json.load(f)
            
            # Save path relative to BASE_DIR for easier serving
            from core.config import BASE_DIR
            rel_path = os.path.relpath(output_file, BASE_DIR)
            pdata["video_path"] = rel_path
            pdata["last_updated"] = datetime.now().isoformat()
            
            with open(project_json_path, 'w') as f:
                json.dump(pdata, f, indent=2)

        log_event(project_path, "pipeline.log", f"[STEP 08] Render completed: {result.get('output_file')}")
        return True
