import os
from core.logger import log_event
from core.errors import PipelineError
from core.step_base import PipelineStep
from utils.render_validator import validate_render

class DryRunStep(PipelineStep):
    def __init__(self):
        super().__init__("07_dryrun", "Run Diagnostics (Dryrun)")

    def run(self, project_id: str, project_path: str) -> bool:
        log_event(project_path, "pipeline.log", "[STEP 07] Running diagnostics...")
        
        report = validate_render(project_path)
        
        if report.get("status") == "FAIL":
            errors = ", ".join(report.get("errors", []))
            raise PipelineError(f"Diagnostics failed: {errors}", message_th=f"การตรวจสอบความพร้อมล้มเหลว: {errors}")
            
        log_event(project_path, "pipeline.log", "[STEP 07] Diagnostics passed.")
        return True
