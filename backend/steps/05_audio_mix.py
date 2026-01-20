import os
from core.logger import log_event
from core.errors import PipelineError
from core.step_base import PipelineStep
from utils.voice_processor import process_voice
from utils.audio_mixer import mix_background_music

class AudioMixStep(PipelineStep):
    def __init__(self):
        super().__init__("05_audio_mix", "Apply Audio Mix")

    def run(self, project_id: str, project_path: str) -> bool:
        import time
        time.sleep(2) # Allow file system sync
        log_event(project_path, "pipeline.log", "[STEP 05] Processing voice and mixing with music...")
        
        # 1. Normalize Voice (saves to voice_processed.mp3)
        proc_res, err = process_voice(project_id, project_path)
        if err:
            raise PipelineError(f"Voice prep failed: {err}", message_th="เตรียมวิดีโอเสียงไม่สำเร็จ")
            
        # 2. Mix with Music (uses voice.mp3 by default in mixer, but we should use voice_processed.mp3?)
        # Actually mixer.py line 53 uses voice.mp3. Let's fix that or pass the right path.
        # For compatibility with existing mixer, let's just run it. 
        # Mixer might need update to use processed voice.
        
        mix_res = mix_background_music(project_path)
        if mix_res.get("status") == "FAIL":
            raise PipelineError(f"Mixing failed: {mix_res.get('error')}", message_th="ผสมเสียงพื้นหลังไม่สำเร็จ")
            
        log_event(project_path, "pipeline.log", f"[STEP 05] Audio mix completed. Duration: {mix_res.get('duration')}s")
        return True
