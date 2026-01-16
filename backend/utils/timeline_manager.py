import os
import json
from utils.tts_handler import get_actual_duration
from core.logger import log_event

# Audio processing constants (must match audio_processor.py)
SILENCE_START = 1.5  # seconds
SILENCE_END = 1.5    # seconds

def build_timeline(project_path, bgm_config=None):
    """
    Constructs a timeline.json based on ACTUAL voice duration (including silence padding).
    
    Timeline Structure:
    - total_audio_duration: Full audio length including all silence
    - silence_start_duration: Leading silence (1.5s)
    - silence_end_duration: Trailing silence (1.5s)
    - usable_duration: Time available for images (total - silence_start - silence_end)
    - segments: Image segments distributed across usable duration
    """
    
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
    usable_duration = total_audio_duration - SILENCE_START - SILENCE_END
    
    if usable_duration <= 0:
        log_event(project_path, "pipeline.log", 
                 f"[TIMELINE] FAIL: Audio too short ({total_audio_duration}s < {SILENCE_START + SILENCE_END}s)")
        return {"status": "FAIL", "error": "Audio duration too short for timeline."}
    
    log_event(project_path, "pipeline.log", 
             f"[TIMELINE] Usable duration (excluding silence): {usable_duration}s")

    # 3. Get Images
    input_dir = os.path.join(project_path, "input")
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    images = [f for f in os.listdir(input_dir) if any(f.lower().endswith(ext) for ext in valid_exts)]
    images.sort()  # Ensure consistent order

    if not images:
        log_event(project_path, "pipeline.log", "[TIMELINE] FAIL: No images found")
        return {"status": "FAIL", "error": "No images found in input folder."}
    
    num_images = len(images)
    log_event(project_path, "pipeline.log", f"[TIMELINE] Found {num_images} images")

    # 4. Distribute Images Across Usable Duration
    duration_per_image = usable_duration / num_images
    log_event(project_path, "pipeline.log", 
             f"[TIMELINE] Duration per image: {duration_per_image:.3f}s")
    
    # 5. Create Segments (starting AFTER leading silence)
    segments = []
    current_time = SILENCE_START  # Start after leading silence
    
    effects = ["zoom_in", "zoom_out", "pan_left", "pan_right", "none"]
    
    for i, img_name in enumerate(images):
        segment_duration = round(duration_per_image, 3)
        
        # Last image takes the remainder to ensure we end exactly at silence_end
        if i == num_images - 1:
            segment_duration = round(total_audio_duration - SILENCE_END - current_time, 3)
            
        segments.append({
            "image": img_name,
            "start": round(current_time, 3),
            "end": round(current_time + segment_duration, 3),
            "duration": segment_duration,
            "effect": effects[i % len(effects)]
        })
        current_time += segment_duration

    # 6. Background Music Config
    if not bgm_config:
        bgm_config = {
            "file": "bgm.mp3",
            "volume": 0.15,
            "ducking": True
        }

    # 7. Final Timeline Structure (Audio-Aware)
    timeline = {
        "project_id": os.path.basename(project_path),
        "total_audio_duration": round(total_audio_duration, 3),
        "silence_start_duration": SILENCE_START,
        "silence_end_duration": SILENCE_END,
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
            "duration_per_image": round(duration_per_image, 3)
        }
    }

    # 8. Save to file
    timeline_path = os.path.join(project_path, "timeline.json")
    with open(timeline_path, 'w', encoding='utf-8') as f:
        json.dump(timeline, f, indent=2, ensure_ascii=False)
    
    log_event(project_path, "pipeline.log", 
             f"[TIMELINE] SUCCESS: Timeline generated with {num_images} segments")

    return {"status": "OK", "timeline": timeline}
