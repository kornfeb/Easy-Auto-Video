import os
import json
from core.logger import log_event
from core.errors import PipelineError
from core.step_base import PipelineStep
from utils.timeline_manager import build_timeline

class TimelineBuilderStep(PipelineStep):
    def __init__(self):
        super().__init__("timeline_builder", "Timeline Builder")

    def run(self, project_id: str, project_path: str) -> bool:
        log_event(project_path, "pipeline.log", "[STEP4] Starting timeline builder...")
        
        # Call the new audio-aware timeline builder
        # Note: build_timeline now accepts (project_path, bgm_config=None)
        # It returns a dict with {"status": "OK"|"FAIL", "timeline": ..., "error": ...}
        result = build_timeline(project_path)
        
        if result.get("status") == "FAIL":
            error_msg = result.get("error", "Unknown error")
            raise PipelineError(
                f"Timeline building failed: {error_msg}",
                message_th=f"สร้างไทม์ไลน์ไม่สำเร็จ: {error_msg}",
                detail=error_msg
            )
            
        timeline = result.get("timeline", {})
        segments_count = len(timeline.get("segments", []))
        total_duration = timeline.get("total_audio_duration", 0)
        
        log_event(project_path, "pipeline.log", 
                 f"[STEP4] Timeline generated successfully. Duration: {total_duration}s, Images: {segments_count}")
        return True
