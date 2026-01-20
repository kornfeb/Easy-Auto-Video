import os
from core.logger import log_event
from core.errors import ScriptGenerationError
from core.step_base import PipelineStep
from utils.script_generator import generate_script

class ScriptGenStep(PipelineStep):
    def __init__(self):
        super().__init__("03_script_gen", "Auto generate Script")

    def run(self, project_id: str, project_path: str) -> bool:
        log_event(project_path, "pipeline.log", "[STEP 03] Generating script...")
        
        script, success = generate_script(project_id, project_path)
        
        if not success:
            log_event(project_path, "pipeline.log", "[STEP 03] WARN: Script generation used fallback.")
            
        log_event(project_path, "pipeline.log", "[STEP 03] Script generation completed.")
        return True
