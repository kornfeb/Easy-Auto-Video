import os
from core.logger import log_event
from core.errors import PipelineError
from core.step_base import PipelineStep
from utils.timeline_manager import build_timeline

class TimelineGenStep(PipelineStep):
    def __init__(self):
        super().__init__("06_timeline_gen", "Generate New Timeline")

    def run(self, project_id: str, project_path: str) -> bool:
        log_event(project_path, "pipeline.log", "[STEP 06] Generating timeline...")
        
        result = build_timeline(project_path)
        
        if result.get("status") == "FAIL":
            raise PipelineError(f"Timeline failed: {result.get('error')}", message_th="สร้างไทม์ไลน์ไม่สำเร็จ")
            
        log_event(project_path, "pipeline.log", "[STEP 06] Timeline generation completed.")
        return True
