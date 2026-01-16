import os
from core.logger import log_event
from core.errors import PipelineError
from core.step_base import PipelineStep
from utils.voice_processor import process_voice

class VoicePrepStep(PipelineStep):
    def __init__(self):
        super().__init__("voice_prep", "Voice Preparation")

    def run(self, project_id: str, project_path: str) -> bool:
        log_event(project_path, "pipeline.log", "[STEP19] Starting voice normalization and prep...")
        
        result, error = process_voice(project_id, project_path)
        
        if error:
            raise PipelineError(
                f"Voice preparation failed: {error}",
                message_th=f"การเตรียมไฟล์เสียงล้มเหลว: {error}",
                detail=error
            )
            
        log_event(project_path, "pipeline.log", f"[STEP19] Voice processed successfully. Final duration: {result['processed_duration']}s")
        return True
