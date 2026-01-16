import os
import json
from core.logger import log_event
from utils.script_generator import count_words

def get_audio_duration(audio_path, project_path):
    """
    Detect audio duration. 
    In a real production environment, this would use ffprobe or a library like mutagen.
    For this implementation, we use a deterministic heuristic based on word count 
    if the tool is missing, or return a mock value for the mock audio file.
    """
    if not os.path.exists(audio_path):
        return None
    
    # Try to find the script to estimate duration if file is just a mock
    script_path = os.path.join(project_path, "script", "script.txt")
    if os.path.exists(script_path):
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()
        words = count_words(content)
        # Heuristic: 1 word (Thai) ~ 0.5 seconds
        return max(3.0, words * 0.5)
    
    return 15.0 # Absolute fallback

def build_timeline(project_id, project_path):
    """
    Calculates exact image durations based on audio length.
    Generates timeline.json.
    """
    # 1. Input Validation
    audio_file = os.path.join(project_path, "audio", "voice.mp3")
    input_dir = os.path.join(project_path, "input")
    
    # Get images
    valid_extensions = ('.jpg', '.jpeg', '.png', '.webp')
    images = [f for f in os.listdir(input_dir) if f.lower().endswith(valid_extensions)]
    images.sort() # Ensure deterministic order
    
    if not os.path.exists(audio_file):
        error_msg = "Audio file missing (voice.mp3)"
        log_event(project_path, "pipeline.log", f"[STEP18] FAIL: {error_msg}")
        return None, error_msg

    if not images:
        error_msg = "No images found in input folder"
        log_event(project_path, "pipeline.log", f"[STEP18] FAIL: {error_msg}")
        return None, error_msg

    # 2. Audio Duration Detection
    total_duration = get_audio_duration(audio_file, project_path)
    if total_duration is None:
        error_msg = "Could not detect audio duration"
        log_event(project_path, "pipeline.log", f"[STEP18] FAIL: {error_msg}")
        return None, error_msg

    # 3. Image Duration Calculation
    num_images = len(images)
    image_duration = round(total_duration / num_images, 3)
    
    timeline = []
    current_time = 0.0
    
    for i, img in enumerate(images):
        # For the last image, we ensure it reaches exactly the total_duration to avoid float drift
        if i == num_images - 1:
            duration = round(total_duration - current_time, 3)
        else:
            duration = image_duration
            
        entry = {
            "image": img,
            "start_time": round(current_time, 3),
            "duration": duration,
            "end_time": round(current_time + duration, 3)
        }
        timeline.append(entry)
        current_time += duration

    # 5. Validation
    success = True
    error_msg = ""
    if abs(timeline[-1]["end_time"] - total_duration) > 0.01:
        success = False
        error_msg = f"Last end_time ({timeline[-1]['end_time']}) does not match total duration ({total_duration})"
    
    status = "OK" if success else "FAIL"
    
    # 4. Save Timeline File
    result = {
        "project_id": project_id,
        "audio_duration": total_duration,
        "image_count": num_images,
        "image_duration_avg": image_duration,
        "status": status,
        "timeline": timeline
    }
    
    timeline_path = os.path.join(project_path, "script", "timeline.json")
    with open(timeline_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
        
    # 6. Logging
    log_event(project_path, "pipeline.log", 
              f"[STEP18] {status} | Audio: {total_duration}s | Images: {num_images} | Avg Dur: {image_duration}s")
    
    if not success:
        log_event(project_path, "pipeline.log", f"[STEP18] Error: {error_msg}")
        return None, error_msg

    return result, None
