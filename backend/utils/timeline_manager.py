import os
import json
from utils.tts_handler import get_actual_duration
from core.logger import log_event

def build_timeline(project_path, bgm_config=None):
    """
    Constructs a timeline.json based on ACTUAL voice duration (including silence padding).
    Uses settings from project.json if available.
    """
    
    from core.global_settings import get_settings
    settings = get_settings()
    
    # Defaults from Global Settings
    silence_start = settings.video.intro_silence_sec
    silence_end = settings.video.outro_silence_sec
    default_duration = settings.video.default_duration_sec # Used if we need target duration fallback logic
    
    log_event(project_path, "pipeline.log", f"[TIMELINE] Loaded global settings: Intro={silence_start}s, Outro={silence_end}s")

    # Load Settings
    project_json_path = os.path.join(project_path, "project.json")
    ken_burns_global = True
    if os.path.exists(project_json_path):
        try:
            with open(project_json_path, 'r') as f:
                pdata = json.load(f)
                video_settings = pdata.get("settings", {}).get("video", {})
                silence_start = video_settings.get("intro_silence", 0.0)
                silence_end = video_settings.get("outro_silence", 0.0)
                ken_burns_global = video_settings.get("ken_burns_enabled", True)
        except:
            pass
            
    # 1. Get Voice Duration
    voice_path = os.path.join(project_path, "audio", "voice_processed.mp3")
    if not os.path.exists(voice_path):
        voice_path = os.path.join(project_path, "audio", "voice.mp3")
        
    if not os.path.exists(voice_path):
        log_event(project_path, "pipeline.log", "[TIMELINE] FAIL: voice source not found")
        return {
            "status": "FAIL", 
            "error": "Missing dependency: voice.mp3 not found",
            "detail": "Please generate the voiceover first in the Voice Studio step."
        }
    
    total_audio_duration = get_actual_duration(voice_path)
    if total_audio_duration <= 0:
        log_event(project_path, "pipeline.log", "[TIMELINE] FAIL: Invalid voice duration")
        return {
            "status": "FAIL", 
            "error": "Invalid audio file",
            "detail": "The generated voice file seems to be empty or corrupted. Please regenerate it."
        }
    
    log_event(project_path, "pipeline.log", 
             f"[TIMELINE] Audio duration detected: {total_audio_duration}s")
    
    # Apply max duration limit from global settings
    max_duration = default_duration
    usable_audio_duration = total_audio_duration
    
    if total_audio_duration > max_duration:
        usable_audio_duration = max_duration
        log_event(project_path, "pipeline.log", 
                 f"[TIMELINE] WARNING: Audio ({total_audio_duration}s) exceeds max duration ({max_duration}s). Trimming to {max_duration}s")
    
    # Usable duration (excluding silence padding)
    usable_duration = usable_audio_duration - silence_start - silence_end
    if usable_duration <= 0:
        # If silence padding makes usable_duration negative or zero,
        # we should still allow some duration for content,
        # or return an error if the total usable_audio_duration is too short.
        if usable_audio_duration <= 0:
            log_event(project_path, "pipeline.log", "[TIMELINE] FAIL: Audio too short after trimming/silence")
            return {"status": "FAIL", "error": "Audio duration too short."}
        else:
            # If usable_duration is negative due to silence, cap it at 0 for calculation,
            # but ensure total duration is still respected.
            usable_duration = 0.0
            log_event(project_path, "pipeline.log", "[TIMELINE] WARNING: Silence padding exceeds usable audio duration. Content duration set to 0.")
        
    log_event(project_path, "pipeline.log", 
             f"[TIMELINE] Usable duration (excluding silence): {usable_duration}s")

    # 3. Get Images
    input_dir = os.path.join(project_path, "input")
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    images = [f for f in os.listdir(input_dir) if any(f.lower().endswith(ext) for ext in valid_exts)]
    
    # Remove cover.jpg from the list if it's already there to ensure no duplicates
    # Case-insensitive check for reliability
    target_cover_names = {"cover.jpg", "cover.png", "cover.jpeg", "cover.webp"}
    
    # Also get source_image_id if stored in project.json
    source_img_to_exclude = None
    if os.path.exists(project_json_path):
        try:
             with open(project_json_path, 'r') as f:
                 pdata = json.load(f)
                 source_img_to_exclude = pdata.get("cover", {}).get("source_image_id")
        except:
             pass

    images = [img for img in images if img.lower() not in target_cover_names]
    if source_img_to_exclude:
         images = [img for img in images if img != source_img_to_exclude]
    
    # Check if cover exists in root and should be included as a product image
    cover_path = os.path.join(project_path, "cover.jpg")
    if os.path.exists(cover_path):
         images.insert(0, "../cover.jpg")
             
    from utils.sort_utils import natural_sort_key
    images.sort(key=lambda x: natural_sort_key(x) if not x.startswith("../") else ["", -1]) # Sort cover first

    if not images:
        log_event(project_path, "pipeline.log", "[TIMELINE] FAIL: No images found")
        return {"status": "FAIL", "error": "No images found in input folder."}
    
    num_images = len(images)
    log_event(project_path, "pipeline.log", f"[TIMELINE] Found {num_images} images")

    use_cover_intro = False
    
    

    segments = []
    current_time = 0.0
    effects = ["zoom_in", "zoom_out", "pan_left", "pan_right", "none"]

    # Distribution Logic (Treat everything as regular segments)
    base_duration = usable_duration / num_images if num_images > 0 else 0
    
    for i, img_name in enumerate(images):
        segment_duration = base_duration
        
        # EXCEPTION 1: First Image (Apply Start Silence padding)
        if i == 0:
            segment_duration += silence_start
            
        # EXCEPTION 2: Last Image (Absorb any rounding errors to match total duration)
        if i == num_images - 1:
            segment_duration = usable_audio_duration - current_time
        
        if segment_duration < 0: segment_duration = 0

        # Ken Burns Defaults
        is_video = any(img_name.lower().endswith(ext) for ext in [".mp4", ".webm", ".mov"])
        ken_burns = {
            "enabled": ken_burns_global and not is_video,
            "preset": "subtle"
        }

        segments.append({
            "image": img_name,
            "start": round(current_time, 3),
            "end": round(current_time + segment_duration, 3),
            "duration": round(segment_duration, 3),
            "effect": effects[i % len(effects)],
            "ken_burns": ken_burns
        })
        current_time += segment_duration

    # 6. Background Music Config (Legacy Check, but mainly we use settings later in mixer)
    if not bgm_config:
        bgm_config = {
            "file": "bgm.mp3",
            "volume": 0.15,
            "ducking": True
        }

    # 7. Final Timeline
    timeline = {
        "project_id": os.path.basename(project_path),
        "total_audio_duration": round(total_audio_duration, 3),
        "usable_audio_duration": round(usable_audio_duration, 3),  # Trimmed duration if max applied
        "silence_start_duration": silence_start,
        "silence_end_duration": silence_end,
        "usable_duration": round(usable_duration, 3),
        "segments": segments,
        "audio": {
            "voice": {
                "file": "voice.mp3",
                "volume": 1.0,
                "trim_to": round(usable_audio_duration, 3) if usable_audio_duration < total_audio_duration else None
            },
            "bgm": bgm_config
        },
        "metadata": {
            "generated_at": os.path.getmtime(voice_path),
            "num_images": num_images,
            "max_duration_applied": usable_audio_duration < total_audio_duration,
            "settings_used": {
                "silence_start": silence_start,
                "silence_end": silence_end,
                "max_duration": max_duration
            }
        }
    }

    # 8. Save
    timeline_path = os.path.join(project_path, "timeline.json")
    with open(timeline_path, 'w', encoding='utf-8') as f:
        json.dump(timeline, f, indent=2, ensure_ascii=False)
    
    log_event(project_path, "pipeline.log", 
             f"[TIMELINE] SUCCESS: Timeline generated with {len(segments)} segments")

    return {"status": "OK", "timeline": timeline}
