from core.logger import log_event
from core.errors import ScriptGenerationError, ValidationError
from core.step_base import PipelineStep
from steps.step1_validate import ValidateStep
from utils.script_generator import generate_script

class ScriptGenStep(PipelineStep):
    def __init__(self):
        super().__init__("script_gen", "Script Generation")

    def run(self, project_id: str, project_path: str) -> bool:
        # Step 1 validation
        try:
            ValidateStep().run(project_id, project_path)
        except ValidationError:
            raise # Re-raise
        except Exception as e:
            raise ScriptGenerationError(
                "Prerequisite validation failed", 
                message_th="การตรวจสอบข้อกำหนดเบื้องต้นล้มเหลว",
                detail=str(e)
            )
        
        # Call the modular generator
        script, success = generate_script(project_id, project_path)
        
        if not success:
            log_event(project_path, "pipeline.log", "[WARNING] Script generation used fallback due to word limit constraints.")
            
        log_event(project_path, "pipeline.log", f"[RESULT] Script generated successfully.")
        return True
