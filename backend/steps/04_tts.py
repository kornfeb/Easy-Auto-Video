import os
import random
from core.logger import log_event
from core.errors import TTSError
from core.step_base import PipelineStep
from core.global_settings import get_settings
from utils.tts_handler import generate_voice, get_voice_profiles

class TTSStep(PipelineStep):
    def __init__(self):
        super().__init__("04_tts", "Generate Neural Voice")

    def run(self, project_id: str, project_path: str) -> bool:
        log_event(project_path, "pipeline.log", "[STEP 04] Generating voiceover...")
        
        script_path = os.path.join(project_path, "script", "script.txt")
        if not os.path.exists(script_path):
            raise TTSError("Script missing", message_th="ไม่พบไฟล์สคริปต์")
            
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Use default voice profile from global settings
        settings = get_settings()
        profile_id = settings.voice.default_voice_profile
        
        # If random, pick a random voice from available profiles
        if profile_id == "random":
            profiles = get_voice_profiles()
            selected_profile = random.choice(profiles)
            profile_id = selected_profile["id"]
            log_event(project_path, "pipeline.log", f"[STEP 04] Randomly selected voice: {selected_profile['name']} ({profile_id})")
        
        result = generate_voice(project_id, project_path, content, profile_id=profile_id, speed=1.0)
        
        log_event(project_path, "pipeline.log", f"[STEP 04] Completed: {result['filename']}")
        return True
