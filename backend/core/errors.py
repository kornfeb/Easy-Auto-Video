class PipelineError(Exception):
    def __init__(self, code: str, message: str, message_th: str = "", recoverable: bool = True, detail: str = None):
        self.code = code
        self.message = message
        self.message_th = message_th
        self.recoverable = recoverable
        self.detail = detail
        super().__init__(self.message)

    def to_dict(self):
        return {
            "code": self.code,
            "message": self.message,
            "message_th": self.message_th,
            "recoverable": self.recoverable,
            "detail": self.detail
        }

class ValidationError(PipelineError):
    def __init__(self, message: str, message_th: str = "", detail: str = None):
        super().__init__("VALIDATION_ERROR", message, message_th, recoverable=True, detail=detail)

class ScriptGenerationError(PipelineError):
    def __init__(self, message: str, message_th: str = "", detail: str = None):
        super().__init__("SCRIPT_GEN_ERROR", message, message_th, recoverable=True, detail=detail)

class TTSError(PipelineError):
    def __init__(self, message: str, message_th: str = "", detail: str = None):
        super().__init__("TTS_ERROR", message, message_th, recoverable=True, detail=detail)

class ImageError(PipelineError):
    def __init__(self, message: str, message_th: str = "", detail: str = None):
        super().__init__("IMAGE_ERROR", message, message_th, recoverable=True, detail=detail)

class RenderError(PipelineError):
    def __init__(self, message: str, message_th: str = "", detail: str = None):
        super().__init__("RENDER_ERROR", message, message_th, recoverable=False, detail=detail)
