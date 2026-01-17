import os
import json
from utils.tts_handler import get_actual_duration
from core.logger import log_event

def build_timeline(project_path, bgm_config=None):
    """
    Constructs a timeline.json based on ACTUAL voice duration (including silence padding).
    Uses settings from project.json if available.
    """
    
    # Defaults
    silence_start = 1.5
    silence_end = 1.5

    # Load Settings
    project_json_path = os.path.join(project_path, "project.json")
    if os.path.exists(project_json_path):
        try:
            with open(project_json_path, 'r') as f:
                pdata = json.load(f)
                video_settings = pdata.get("settings", {}).get("video", {})
                silence_start = video_settings.get("intro_silence", 1.5)
                silence_end = video_settings.get("outro_silence", 1.5)
        except:
            pass
            
    # 1. Get Voice Duration
    voice_path = os.path.join(project_path, "audio", "voice.mp3")
    if not os.path.exists(voice_path):
        log_event(project_path, "pipeline.log", "[TIMELINE] FAIL: voice.mp3 not found")
        return {"status": "FAIL", "error": "voice.mp3 not found. Generate voice first."}
    
    total_audio_duration = get_actual_duration(voice_path)
    if total_audio_duration <= 0:
        log_event(project_path, "pipeline.log", "[TIMELINE] FAIL: Invalid voice duration")
        return {"status": "FAIL", "error": "Invalid voice duration."}
    
    log_event(project_path, "pipeline.log", 
             f"[TIMELINE] Audio duration detected: {total_audio_duration}s")
    
    # 2. Calculate Usable Duration (exclude silence regions)
    usable_duration = total_audio_duration - silence_start - silence_end
    
    if total_audio_duration <= 0:
         log_event(project_path, "pipeline.log", "[TIMELINE] FAIL: Audio too short")
         return {"status": "FAIL", "error": "Audio duration too short."}
    
    log_event(project_path, "pipeline.log", 
             f"[TIMELINE] Usable duration (excluding silence): {usable_duration}s")

    # 3. Get Images
    input_dir = os.path.join(project_path, "input")
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    images = [f for f in os.listdir(input_dir) if any(f.lower().endswith(ext) for ext in valid_exts)]
    images.sort()

    if not images:
        log_event(project_path, "pipeline.log", "[TIMELINE] FAIL: No images found")
        return {"status": "FAIL", "error": "No images found in input folder."}
    
    num_images = len(images)
    log_event(project_path, "pipeline.log", f"[TIMELINE] Found {num_images} images")

    # 4. Check Cover Image Settings (Intro)
    use_cover_intro = False
    cover_file = "cover.jpg"
    
    if os.path.exists(project_json_path):
        try:
            with open(project_json_path, 'r') as f:
                pdata = json.load(f)
                if "cover" in pdata and pdata["cover"].get("use_as_intro"):
                    use_cover_intro = True
                    cover_file = pdata["cover"].get("file_path", "cover.jpg")
                    if not os.path.exists(os.path.join(project_path, cover_file)):
                        log_event(project_path, "pipeline.log", "[TIMELINE] WARN: Cover intro requested but file missing. Ignoring.")
                        use_cover_intro = False
        except Exception as e:
            log_event(project_path, "pipeline.log", f"[TIMELINE] WARN: Reading project.json failed: {e}")

    # 5. Hybrid Distribution Logic
    if num_images == 0:
        return {"status": "FAIL", "error": "No images"}

    segments = []
    current_time = 0.0
    effects = ["zoom_in", "zoom_out", "pan_left", "pan_right", "none"]
    
    # CASE A: Use Cover Intro
    if use_cover_intro:
        log_event(project_path, "pipeline.log", f"[TIMELINE] Using Cover Image as {silence_start}s Intro")
        
        segments.append({
            "image": f"../{cover_file}",
            "start": 0.0,
            "end": silence_start,
            "duration": silence_start,
            "effect": "none"
        })
        current_time = silence_start
        
        base_duration = usable_duration / num_images
        
        for i, img_name in enumerate(images):
             segment_duration = base_duration
             
             # EXCEPTION: Last Image
             if i == num_images - 1:
                 # Ensure it covers end silence
                 segment_duration = total_audio_duration - current_time

             if segment_duration < 0: segment_duration = 0

             segments.append({
                "image": img_name,
                "start": round(current_time, 3),
                "end": round(current_time + segment_duration, 3),
                "duration": round(segment_duration, 3),
                "effect": effects[i % len(effects)]
             })
             current_time += segment_duration

    # CASE B: No Intro (Use First Image to Cover Start Silence)
    else:
        base_duration = usable_duration / num_images
        
        for i, img_name in enumerate(images):
            segment_duration = base_duration
            
            # EXCEPTION 1: First Image
            if i == 0:
                segment_duration += silence_start
                
            # EXCEPTION 2: Last Image
            if i == num_images - 1:
                segment_duration = total_audio_duration - current_time
            
            if segment_duration < 0: segment_duration = 0

            segments.append({
                "image": img_name,
                "start": round(current_time, 3),
                "end": round(current_time + segment_duration, 3),
                "duration": round(segment_duration, 3),
                "effect": effects[i % len(effects)]
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
        "silence_start_duration": silence_start,
        "silence_end_duration": silence_end,
        "usable_duration": round(usable_duration, 3),
        "segments": segments,
        "audio": {
            "voice": {
                "file": "voice.mp3",
                "volume": 1.0
            },
            "bgm": bgm_config
        },
        "metadata": {
            "generated_at": os.path.getmtime(voice_path),
            "num_images": num_images,
            "settings_used": {
                "silence_start": silence_start,
                "silence_end": silence_end
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
