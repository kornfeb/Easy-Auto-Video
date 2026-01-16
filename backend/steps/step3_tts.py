import os
from core.logger import log_event
from core.errors import TTSError
from core.step_base import PipelineStep

class TTSStep(PipelineStep):
    def __init__(self):
        super().__init__("tts", "Text-to-Speech")

    def run(self, project_id: str, project_path: str) -> bool:
        script_path = os.path.join(project_path, "script", "script.txt")
        if not os.path.exists(script_path):
            raise TTSError(
                "Script file missing", 
                message_th="ไม่พบไฟล์สคริปต์ (script.txt)",
                detail="Run Script Generation first."
            )
            
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()

        from utils.tts_handler import generate_voice
        log_event(project_path, "pipeline.log", "[INFO] TTS process started...")
        
        # Use default profile and speed for automation
        result = generate_voice(project_id, project_path, content, profile_id="oa_echo", speed=1.0)
        
        log_event(project_path, "pipeline.log", f"[INFO] Voice generated: {result['filename']} ({result['duration']}s)")
        log_event(project_path, "pipeline.log", "[INFO] TTS process completed.")
        return True
