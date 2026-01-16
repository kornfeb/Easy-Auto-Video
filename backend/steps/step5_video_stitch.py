from core.logger import log_event
from core.errors import RenderError
from core.step_base import PipelineStep
from steps.step4_build_timeline import TimelineBuilderStep

class VideoStitchStep(PipelineStep):
    def __init__(self):
        super().__init__("video_stitch", "Video Stitching")

    def run(self, project_id: str, project_path: str) -> bool:
        try:
            TimelineBuilderStep().run(project_id, project_path)
        except Exception as e:
            raise RenderError(
                "Cannot start render: Timeline builder failed", 
                message_th="ไม่สามารถเริ่ม Render ได้ เนื่องจากขั้นตอนการสร้างไทม์ไลน์ล้มเหลว",
                detail=str(e)
            )
        
        log_event(project_path, "pipeline.log", "[INFO] Mocking FFmpeg process...")
        log_event(project_path, "pipeline.log", "[INFO] Video stitching completed.")
        return True
