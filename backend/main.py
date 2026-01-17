import os
import json
import subprocess
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import mimetypes
mimetypes.init()
mimetypes.add_type('audio/mpeg', '.mp3')
mimetypes.add_type('audio/wav', '.wav')

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from core.config import PROJECTS_DIR
from core import project as project_utils
from core.errors import PipelineError
from core.logger import log_event
from core.state import set_done # Import here
from upload import downloader
from core import step_registry
from utils.cover_generator import (
    CoverTextGenRequest, CoverImageGenRequest, CoverPromptGenRequest,
    generate_cover_text_ai, generate_cover_image_ai, generate_cover_prompt_ai
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Assets
app.mount("/media", StaticFiles(directory=PROJECTS_DIR), name="media")
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")), name="static")

# --- SETTINGS MODELS ---
class ScriptSettings(BaseModel):
    template: str = """เขียนบทโฆษณาสั้นๆ สไตล์ {{tone}} สำหรับสินค้า "{{product_name}}"
เน้นจุดเด่นเรื่อง: {{product_benefits}}
ปิดท้ายด้วยคำเชิญชวน: "{{cta}}"
ใช้ประโยคกระชับ เข้าใจง่าย น่าสนใจ
ความยาวประมาณ {{word_count}} คำ"""
    word_count: int = 40

class VideoSettings(BaseModel):
    duration: int = 20
    intro_silence: float = 1.5
    outro_silence: float = 1.5

class VoiceSettings(BaseModel):
    provider: str = "openai"
    profile: str = "alloy"
    speed: float = 1.0
    breathing_pause: bool = True

class MusicSettings(BaseModel):
    track: str = "" # Default none or select first available
    volume: float = 0.2
    duck_voice: bool = True

class MixSettings(BaseModel):
    voice_gain: float = 1.0
    music_gain: float = 0.2

class ProjectSettings(BaseModel):
    script: ScriptSettings = ScriptSettings()
    video: VideoSettings = VideoSettings()
    voice: VoiceSettings = VoiceSettings()
    music: MusicSettings = MusicSettings()
    mix: MixSettings = MixSettings()

# --- SETTINGS ENDPOINTS ---
@app.get("/projects/{project_id}/settings")
def get_project_settings(project_id: str):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    json_path = os.path.join(project_path, "project.json")
    if not os.path.exists(json_path):
        return ProjectSettings().dict()

    with open(json_path, 'r') as f:
        data = json.load(f)
    
    # Return existing settings or default
    return data.get("settings", ProjectSettings().dict())

@app.post("/projects/{project_id}/settings")
def update_project_settings(project_id: str, settings: ProjectSettings):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
        
    json_path = os.path.join(project_path, "project.json")
    if os.path.exists(json_path):
        with open(json_path, 'r') as f:
            data = json.load(f)
    else:
        # Should normally exist, but fallback
        data = project_utils.initialize_project_structure(project_id)
        
    data["settings"] = settings.dict()
    data["last_updated"] = datetime.now().isoformat()
    
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)
        
    return {"status": "OK", "settings": data["settings"]}

# --- EXISTING ENDPOINTS ---

@app.get("/voice/profiles")
def get_voice_profiles():
    from utils.tts_handler import get_voice_profiles
    return get_voice_profiles()

@app.get("/projects/{project_id}/voice/files")
def get_project_voice_files(project_id: str):
    from utils.tts_handler import list_voice_files
    project_path = os.path.join(PROJECTS_DIR, project_id)
    return list_voice_files(project_path, project_id)

class VoiceGenerateRequest(BaseModel):
    profile_id: str
    text: str
    provider: str
    voice: Optional[str] = None
    speed: float = 1.0

@app.post("/projects/{project_id}/voice/generate")
def generate_project_voice(project_id: str, request: VoiceGenerateRequest):
    from utils.tts_handler import generate_voice
    project_path = os.path.join(PROJECTS_DIR, project_id)
    
    # We now trust the payload's text if provided, 
    # but still fall back to script file if text is blank (for safety)
    content = request.text or ""
    if not content:
        script_path = os.path.join(project_path, "script", "script.txt")
        if os.path.exists(script_path):
            with open(script_path, 'r', encoding='utf-8') as f:
                content = f.read()
    
    if not content:
        raise HTTPException(status_code=400, detail="Script content is empty.")
        
    # generate_voice in tts_handler needs updating to accept provider/voice directly
    # but for now we'll pass the richer object or keep signature
    result = generate_voice(
        project_id, 
        project_path, 
        content, 
        request.profile_id, 
        request.speed,
        provider=request.provider,
        voice_name=request.voice
    )
    
    if result.get("status") == "FAIL":
        raise HTTPException(status_code=500, detail=result.get("error", "Voice generation failed"))
    
    # Update project timestamp
    timestamp_update(project_path)

    return result

def timestamp_update(project_path):
    project_json_path = os.path.join(project_path, "project.json")
    if os.path.exists(project_json_path):
        with open(project_json_path, 'r') as f: data = json.load(f)
        data["last_updated"] = datetime.now().isoformat()
        with open(project_json_path, 'w') as f: json.dump(data, f, indent=2)

@app.delete("/projects/{project_id}/voice/{filename}")
def delete_project_voice(project_id: str, filename: str):
    from utils.tts_handler import delete_voice_file
    project_path = os.path.join(PROJECTS_DIR, project_id)
    success, msg = delete_voice_file(project_path, filename)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    
    # Update project timestamp
    project_json_path = os.path.join(project_path, "project.json")
    if os.path.exists(project_json_path):
        with open(project_json_path, 'r') as f: data = json.load(f)
        data["last_updated"] = datetime.now().isoformat()
        with open(project_json_path, 'w') as f: json.dump(data, f, indent=2)
        
    return {"message": msg}

class VoiceActivateRequest(BaseModel):
    filename: str

@app.post("/projects/{project_id}/voice/activate")
def activate_project_voice(project_id: str, request: VoiceActivateRequest):
    from utils.tts_handler import set_active_voice
    project_path = os.path.join(PROJECTS_DIR, project_id)
    success, msg = set_active_voice(project_path, request.filename)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    
    # Update project timestamp
    project_json_path = os.path.join(project_path, "project.json")
    if os.path.exists(project_json_path):
        with open(project_json_path, 'r') as f: data = json.load(f)
        data["last_updated"] = datetime.now().isoformat()
        with open(project_json_path, 'w') as f: json.dump(data, f, indent=2)
        
    return {"message": msg}

@app.post("/projects/{project_id}/timeline/generate")
def generate_project_timeline(project_id: str):
    from utils.timeline_manager import build_timeline
    project_path = os.path.join(PROJECTS_DIR, project_id)
    result = build_timeline(project_path)
    if result.get("status") == "FAIL":
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    timestamp_update(project_path)
    return result

@app.get("/projects/{project_id}/timeline")
def get_project_timeline(project_id: str):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    timeline_path = os.path.join(project_path, "timeline.json")
    if not os.path.exists(timeline_path):
        raise HTTPException(status_code=404, detail="Timeline not found")
    with open(timeline_path, 'r') as f:
        return json.load(f)

@app.post("/projects/{project_id}/timeline/update")
def update_project_timeline(project_id: str, timeline_data: dict):
    """Update timeline with user modifications (reordering, effect changes)"""
    project_path = os.path.join(PROJECTS_DIR, project_id)
    timeline_path = os.path.join(project_path, "timeline.json")
    
    # Save updated timeline
    with open(timeline_path, 'w') as f:
        json.dump(timeline_data, f, indent=2, ensure_ascii=False)
    
    # Update project timestamp
    timestamp_update(project_path)
    
    return {"status": "OK", "message": "Timeline updated successfully"}

@app.post("/projects/{project_id}/render/dry-run")
def dry_run_valication(project_id: str):
    """Perform a dry run validation before actual rendering."""
    from utils.render_validator import validate_render
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    
    report = validate_render(project_path)
    return report

# --- Music Support ---
@app.get("/music/files")
def list_music_files():
    assets_dir = os.path.join(os.path.dirname(__file__), "assets", "music")
    if not os.path.exists(assets_dir):
        return []
    valid_exts = {".mp3", ".wav"}
    files = [f for f in os.listdir(assets_dir) if any(f.lower().endswith(ext) for ext in valid_exts)]
    return sorted(files)

class MusicConfig(BaseModel):
    music_file: str
    enabled: bool = True
    volume_adj: int = -20

@app.post("/projects/{project_id}/music/mix")
def mix_project_audio(project_id: str, config: MusicConfig):
    from utils.audio_mixer import mix_background_music
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    # Save to project.json
    json_path = os.path.join(project_path, "project.json")
    if os.path.exists(json_path):
        with open(json_path, 'r') as f:
            data = json.load(f)
        data["music_config"] = config.dict()
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    # Run Mixer
    music_file = config.music_file if config.enabled else "none"
    result = mix_background_music(project_path, music_file, config.volume_adj)
    
    if result.get("status") == "FAIL":
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    timestamp_update(project_path)
    return result

class RenderRequest(BaseModel):
    video_format: str = "portrait"
    transition_id: str = "none"
    transition_duration: float = 0.5

@app.post("/projects/{project_id}/render")
def render_project_video(project_id: str, request: RenderRequest):
    from utils.video_renderer import render_video
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    result = render_video(
        project_path, 
        video_format=request.video_format,
        transition_id=request.transition_id,
        transition_duration=request.transition_duration
    )
    
    if result.get("status") == "FAIL":
        raise HTTPException(status_code=500, detail=result.get("error"))
        
    timestamp_update(project_path)
    return result

@app.get("/projects/{project_id}/download/video")
def download_project_video(project_id: str):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    video_path = os.path.join(project_path, "output", "final_video.mp4")
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
        
    # Determine Resolution (using portable ffprobe if avail)
    resolution = "1080x1920" # Default
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        bin_dir = os.path.join(base_dir, "bin")
        env = os.environ.copy()
        if os.path.exists(bin_dir):
            env["PATH"] = bin_dir + os.pathsep + env.get("PATH", "")
            
        cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0", 
               "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", video_path]
        res_output = subprocess.check_output(cmd, env=env).decode("utf-8").strip()
        if res_output:
            resolution = res_output
    except Exception as e:
        print(f"Error probing video resolution: {e}")

    # Generate Filename: projectname-YYMMDD-vTime-widthxhigh.mp4
    now = datetime.now()
    date_str = now.strftime("%y%m%d") # YYMMDD
    time_str = now.strftime("v%H%M")  # vTime
    
    filename = f"{project_id}-{date_str}-{time_str}-{resolution}.mp4"

    return FileResponse(
        video_path, 
        media_type="video/mp4", 
        filename=filename
    )

@app.get("/projects/{project_id}/assets")
def list_project_assets(project_id: str):
    return project_utils.list_assets(project_id)

@app.get("/projects/{project_id}/logs")
def get_project_logs(project_id: str):
    return project_utils.get_project_logs(project_id)

@app.get("/projects/{project_id}/logs/download")
def download_project_logs(project_id: str):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    log_file = os.path.join(project_path, "log", "pipeline.log")
    
    if not os.path.exists(log_file):
        raise HTTPException(
            status_code=404, 
            detail="Log file not found. Run pipeline steps first."
        )
        
    return FileResponse(
        path=log_file,
        filename=f"{project_id}_pipeline.log",
        media_type="text/plain"
    )

# Pipeline
class PipelineStepRequest(BaseModel):
    step_name: str

@app.post("/projects/{project_id}/run")
def run_pipeline_step(project_id: str, request: PipelineStepRequest):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    # Load project data
    project_json_path = os.path.join(project_path, "project.json")
    with open(project_json_path, 'r') as f:
        data = json.load(f)
    
    if "pipeline" not in data:
        data["pipeline"] = {}

    now = datetime.now().isoformat()
    data["last_updated"] = now
    
    try:
        # Check if step is disabled in config.json
        config_path = os.path.join(project_path, "input", "config.json")
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
                disabled_steps = config.get("disabled_steps", [])
                if request.step_name in disabled_steps:
                    raise PipelineError("STEP_DISABLED", f"Step '{request.step_name}' is disabled in config.json", message_th=f"ขั้นตอน '{request.step_name}' ถูกปิดใช้งานใน config.json")

        # Orchestration using Registry
        from core.step_registry import get_step
        step_obj = get_step(request.step_name)
        
        if not step_obj:
            raise PipelineError("INVALID_STEP", f"Step '{request.step_name}' is not recognized", message_th=f"ไม่พบขั้นตอน '{request.step_name}' ในระบบ")

        # Run the step
        step_obj.run(project_id, project_path)
        set_done(project_path, f"{request.step_name}.done")

        data["pipeline"][request.step_name] = {
            "status": "completed",
            "updated_at": now,
            "error": None
        }
    except PipelineError as e:
        # Standardized Error Handling
        msg = f"[ERROR] {e.code}: {e.message}"
        if e.message_th:
            msg += f" ({e.message_th})"
        log_event(project_path, "pipeline.log", msg)
        if e.detail:
            log_event(project_path, "pipeline.log", f"[DETAIL] {e.detail}")
            
        data["pipeline"][request.step_name] = {
            "status": "failed",
            "updated_at": now,
            "error": e.to_dict()
        }
        
        with open(project_json_path, 'w') as f:
            json.dump(data, f, indent=2)
            
        return {"message": "Step failed", "pipeline": data["pipeline"], "error": e.to_dict()}
    except Exception as e:
        # Fallback for unexpected errors
        log_event(project_path, "pipeline.log", f"[CRITICAL] Unexpected error: {str(e)}")
        data["pipeline"][request.step_name] = {
            "status": "failed",
            "updated_at": now,
            "error": {"code": "UNKNOWN_ERROR", "message": str(e), "recoverable": True}
        }
        with open(project_json_path, 'w') as f:
            json.dump(data, f, indent=2)
        return {"message": "Unexpected error", "pipeline": data["pipeline"]}

    # Success Save
    with open(project_json_path, 'w') as f:
        json.dump(data, f, indent=2)
        
    return {"message": f"Step {request.step_name} completed", "pipeline": data["pipeline"]}

# Project Management
class ProjectInitRequest(BaseModel):
    project_id: str
    product_name: str = None

@app.post("/projects/initialize")
def init_project(request: ProjectInitRequest):
    try:
        return project_utils.initialize_project_structure(request.project_id, request.product_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/projects/{project_id}/run/auto")
def run_pipeline_auto(project_id: str):
    """
    Auto-run the entire pipeline based on STEP_REGISTRY.
    Skips completed or disabled steps.
    """
    from core.step_registry import STEP_REGISTRY
    project_path = os.path.join(PROJECTS_DIR, project_id)
    
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    # Load config for disabled steps
    disabled_steps = []
    config_path = os.path.join(project_path, "input", "config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                disabled_steps = config.get("disabled_steps", [])
        except:
            pass

    execution_results = []
    
    for step in STEP_REGISTRY:
        # Skip if disabled
        if step.step_id in disabled_steps:
            execution_results.append({"step_id": step.step_id, "status": "skipped", "reason": "disabled"})
            continue
            
        # Skip if already completed (Step-based logic)
        # Note: is_completed checks for state/step_id.done
        # But we also update project.json. Let's stick to the prompt's request for stepX.done check.
        if step.is_completed(project_path):
            execution_results.append({"step_id": step.step_id, "status": "skipped", "reason": "already_done"})
            continue
            
        # Run step using existing orchestration logic (via internal function or similar)
        # To avoid duplicating logic, we'll just call the run_pipeline_step logic or refactor it.
        # For this refactor, let's just use the step object directly.
        try:
            # We need to manually handle the project.json update here or share a helper
            step.run(project_id, project_path)
            set_done(project_path, f"{step.step_id}.done")
            
            # Record success in project.json
            project_json_path = os.path.join(project_path, "project.json")
            with open(project_json_path, 'r') as f:
                data = json.load(f)
            
            if "pipeline" not in data: data["pipeline"] = {}
            now = datetime.now().isoformat()
            data["pipeline"][step.step_id] = {"status": "completed", "updated_at": now, "error": None}
            data["last_updated"] = now
            
            with open(project_json_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            execution_results.append({"step_id": step.step_id, "status": "completed"})
            
        except PipelineError as e:
            # Record failure
            project_json_path = os.path.join(project_path, "project.json")
            with open(project_json_path, 'r') as f:
                data = json.load(f)
            if "pipeline" not in data: data["pipeline"] = {}
            now = datetime.now().isoformat()
            data["pipeline"][step.step_id] = {"status": "failed", "updated_at": now, "error": e.to_dict()}
            data["last_updated"] = now
            with open(project_json_path, 'w') as f:
                json.dump(data, f, indent=2)
                
            execution_results.append({"step_id": step.step_id, "status": "failed", "error": e.code})
            break # Stop on first failure
            
    return {"results": execution_results}

@app.get("/pipeline/steps")
def list_pipeline_steps():
    from core.step_registry import STEP_REGISTRY
    return [{"id": s.step_id, "label": s.label} for s in STEP_REGISTRY]

class ProjectConfigRequest(BaseModel):
    disabled_steps: list[str]

@app.post("/projects/{project_id}/config")
def update_project_config(project_id: str, request: ProjectConfigRequest):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
        
    config_path = os.path.join(project_path, "input", "config.json")
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    
    config = {}
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            try:
                config = json.load(f)
            except:
                pass
                
    config["disabled_steps"] = request.disabled_steps
    
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
        
    return {"message": "Configuration updated", "config": config}

@app.post("/projects/{project_id}/reset-step/{step_id}")
def reset_project_step(project_id: str, step_id: str):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
        
    done_file = os.path.join(project_path, "state", f"{step_id}.done")
    if os.path.exists(done_file):
        os.remove(done_file)
        
    # Also update project.json status
    project_json_path = os.path.join(project_path, "project.json")
    if os.path.exists(project_json_path):
        with open(project_json_path, 'r') as f:
            data = json.load(f)
        if "pipeline" in data and step_id in data["pipeline"]:
            data["pipeline"][step_id]["status"] = "pending"
            data["pipeline"][step_id]["error"] = None
            with open(project_json_path, 'w') as f:
                json.dump(data, f, indent=2)
                
    return {"message": f"Step {step_id} reset"}

@app.get("/projects/{project_id}/script")
def get_project_script(project_id: str):
    from utils.script_generator import count_words
    project_path = os.path.join(PROJECTS_DIR, project_id)
    script_path = os.path.join(project_path, "script", "script.txt")
    
    content = ""
    if os.path.exists(script_path):
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
    return {
        "content": content,
        "word_count": count_words(content)
    }

class ScriptSaveRequest(BaseModel):
    content: str

@app.post("/projects/{project_id}/script")
def save_project_script(project_id: str, request: ScriptSaveRequest):
    from utils.script_generator import count_words
    project_path = os.path.join(PROJECTS_DIR, project_id)
    script_path = os.path.join(project_path, "script", "script.txt")
    
    # Calculate counts for logging
    old_content = ""
    if os.path.exists(script_path):
        with open(script_path, 'r', encoding='utf-8') as f:
            old_content = f.read()
            
    prev_word_count = count_words(old_content)
    new_word_count = count_words(request.content)
    
    # Save file
    os.makedirs(os.path.dirname(script_path), exist_ok=True)
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(request.content)
        
    # Update project.json status
    project_json_path = os.path.join(project_path, "project.json")
    if os.path.exists(project_json_path):
        with open(project_json_path, 'r') as f:
            data = json.load(f)
        
        if "pipeline" not in data: data["pipeline"] = {}
        if "script_gen" not in data["pipeline"]:
             data["pipeline"]["script_gen"] = {}
             
        now = datetime.now().isoformat()
        data["pipeline"]["script_gen"]["status"] = "MANUAL_EDIT"
        data["pipeline"]["script_gen"]["updated_at"] = now
        data["last_updated"] = now
        
        with open(project_json_path, 'w') as f:
            json.dump(data, f, indent=2)
            
    # Log the action
    log_msg = f"[MANUAL_EDIT] Script updated. Prev words: {prev_word_count}, New words: {new_word_count}"
    log_event(project_path, "pipeline.log", f"Project: {project_id} - {log_msg}")
    
    return {"message": "Script saved", "word_count": new_word_count}

@app.get("/projects")
def list_projects():
    return project_utils.list_projects_metadata()

class UpdateProductRequest(BaseModel):
    product_name: str

@app.post("/projects/{project_id}/update/product")
def update_project_product(project_id: str, request: UpdateProductRequest):
    result = project_utils.update_product_name(project_id, request.product_name)
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Product name updated", "product_name": result}

# Upload
class BulkUrlUploadRequest(BaseModel):
    urls: list[str]

@app.post("/projects/{project_id}/upload/urls")
def upload_urls(project_id: str, request: BulkUrlUploadRequest):
    result = downloader.download_images_from_urls(project_id, request.urls)
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return result

# --- Cover Image Management ---
class CoverOverlayConfig(BaseModel):
    title: str = ""
    subtitle: str = ""
    position: str = "bottom"
    font: str = "Thai_Default"
    weight: str = "regular"
    color: str = "#FFFFFF"
    background: str = "none"

class CoverSetRequest(BaseModel):
    source: str  # "existing", "upload", "url"
    image_id: Optional[str] = None
    url: Optional[str] = None
    use_as_intro: bool = False

@app.post("/projects/{project_id}/cover/set")
def set_project_cover(project_id: str, request: CoverSetRequest):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    cover_filename = "cover.jpg" # Standardize name
    cover_path = os.path.join(project_path, cover_filename)
    
    # 1. Handle Image Source
    if request.source == "existing":
        if not request.image_id:
            raise HTTPException(status_code=400, detail="image_id required for existing source")
        
        src_path = os.path.join(project_path, "input", request.image_id)
        if not os.path.exists(src_path):
             raise HTTPException(status_code=404, detail="Source image not found")
        
        # Copy to cover path AND source path
        import shutil
        shutil.copy2(src_path, cover_path)
        shutil.copy2(src_path, os.path.join(project_path, "cover_source.jpg"))
        
    elif request.source == "url":
        if not request.url:
            raise HTTPException(status_code=400, detail="URL required")
            
        # Download
        import requests
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(request.url, headers=headers, stream=True, timeout=10)
            response.raise_for_status()
            
            with open(cover_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            shutil.copy2(cover_path, os.path.join(project_path, "cover_source.jpg"))

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")
            
    # 2. Update Project Metadata
    json_path = os.path.join(project_path, "project.json")
    if os.path.exists(json_path):
        with open(json_path, 'r') as f: data = json.load(f)
        
        # Restore text overlay if exists
        text_overlay = data.get("cover", {}).get("text_overlay", {})
        
        data["cover"] = {
            "source": request.source,
            "image_id": request.image_id,
            "file_path": cover_filename,
            "use_as_intro": request.use_as_intro,
            "text_overlay": text_overlay,
            "updated_at": datetime.now().isoformat()
        }
        data["last_updated"] = datetime.now().isoformat()
        
        with open(json_path, 'w') as f: json.dump(data, f, indent=2)

    # Re-render text if exists
    if text_overlay.get("title") or text_overlay.get("subtitle"):
        from utils.image_processor import render_cover_overlay
        render_cover_overlay(project_path, text_overlay)


    return {"status": "OK", "cover_url": f"/media/{project_id}/{cover_filename}?t={datetime.now().timestamp()}"}

class CoverOptionsRequest(BaseModel):
    use_as_intro: bool

@app.post("/projects/{project_id}/cover/options")
def update_cover_options(project_id: str, request: CoverOptionsRequest):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    json_path = os.path.join(project_path, "project.json")
    if os.path.exists(json_path):
        with open(json_path, 'r') as f: data = json.load(f)
        
        if "cover" not in data: data["cover"] = {}
        data["cover"]["use_as_intro"] = request.use_as_intro
        data["last_updated"] = datetime.now().isoformat()
        
        with open(json_path, 'w') as f: json.dump(data, f, indent=2)
        
    return {"status": "OK", "use_as_intro": request.use_as_intro}


@app.post("/projects/{project_id}/cover/upload")
async def upload_project_cover(project_id: str, file: UploadFile = File(...), use_as_intro: bool = False):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
        
    cover_filename = "cover.jpg"
    cover_path = os.path.join(project_path, cover_filename)
    
    try:
        contents = await file.read()
        with open(cover_path, "wb") as f:
            f.write(contents)
            
        import shutil
        shutil.copy2(cover_path, os.path.join(project_path, "cover_source.jpg"))
            
        # Update metadata
        json_path = os.path.join(project_path, "project.json")
        if os.path.exists(json_path):
            with open(json_path, 'r') as f: data = json.load(f)
            
            text_overlay = data.get("cover", {}).get("text_overlay", {})
            
            data["cover"] = {
                "source": "upload",
                "image_id": None,
                "file_path": cover_filename,
                "use_as_intro": use_as_intro,
                "text_overlay": text_overlay,
                "updated_at": datetime.now().isoformat()
            }
            data["last_updated"] = datetime.now().isoformat()
            
            with open(json_path, 'w') as f: json.dump(data, f, indent=2)
            
        return {"status": "OK", "cover_url": f"/media/{project_id}/{cover_filename}?t={datetime.now().timestamp()}"}
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/projects/{project_id}/cover/render-text")
def render_cover_text(project_id: str, config: CoverOverlayConfig):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Save config to project.json
    project_json_path = os.path.join(project_path, "project.json")
    try:
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                data = json.load(f)
        else:
            data = {}
            
        if "cover" not in data: data["cover"] = {}
        data["cover"]["text_overlay"] = config.dict()
        data["last_updated"] = datetime.now().isoformat()
        
        with open(project_json_path, 'w') as f:
            json.dump(data, f, indent=2)
    except:
        pass

    from utils.image_processor import render_cover_overlay
    result = render_cover_overlay(project_path, config.dict())
    
    if result["status"] == "FAIL":
        raise HTTPException(status_code=500, detail=result["error"])
        
    # Valid timestamp to bust cache
    ts = int(datetime.now().timestamp())
    return {"status": "OK", "cover_url": f"/media/{project_id}/cover.jpg?t={ts}"}

@app.post("/projects/{project_id}/cover/gen-text")
def generate_cover_text_endpoint(project_id: str, request: CoverTextGenRequest):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = generate_cover_text_ai(project_path, request.product_name, request.tone)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.post("/projects/{project_id}/cover/gen-image")
def generate_cover_image_endpoint(project_id: str, request: CoverImageGenRequest):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = generate_cover_image_ai(project_path, request.prompt)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.post("/projects/{project_id}/cover/gen-prompt")
def generate_cover_prompt_endpoint(project_id: str, request: CoverPromptGenRequest):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = generate_cover_prompt_ai(project_path, request.product_name, request.image_filename)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
