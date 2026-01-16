import os
from core.logger import log_event
from core.step_base import PipelineStep
from utils.timeline_manager import build_timeline

class TimelineStep(PipelineStep):
    def __init__(self):
        super().__init__("timeline_builder", "Timeline Builder")

    def run(self, project_id: str, project_path: str) -> bool:
        log_event(project_path, "pipeline.log", "[INFO] Timeline building started...")
        
        # We can pass custom config here if needed from project settings
        result = build_timeline(project_path)
        
        if result.get("status") == "FAIL":
            log_event(project_path, "pipeline.log", f"[ERROR] Timeline failed: {result['error']}")
            return False
            
        log_event(project_path, "pipeline.log", "[INFO] Timeline building completed successfully.")
        return True
