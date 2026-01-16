import os
import json
import time
import subprocess
import shutil
from core.logger import log_event
from gtts import gTTS
import traceback
import re

# OpenAI client helper
def get_openai_client():
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=key)
    except ImportError:
        return None

# Real Voice Profiles
VOICE_PROFILES = [
    # Google (gTTS)
    {"id": "g_th_std", "name": "Google Standard", "service": "gtts", "lang": "th", "gender": "neutral", "tone": "Balanced", "preview": "/static/previews/natural_1.mp3"},
    {"id": "g_th_news", "name": "Google News Style", "service": "gtts", "lang": "th", "gender": "female", "tone": "Formal & Clear", "preview": "/static/previews/female_1.mp3"},
    {"id": "g_th_warm", "name": "Google Warm Thai", "service": "gtts", "lang": "th", "gender": "male", "tone": "Friendly & Soft", "preview": "/static/previews/male_1.mp3"},
    
    # OpenAI (Premium)
    {"id": "oa_alloy", "name": "OpenAI Alloy", "service": "openai", "voice": "alloy", "gender": "neutral", "tone": "Versatile & Warm", "preview": "/static/previews/natural_1.mp3"},
    {"id": "oa_nova", "name": "OpenAI Nova", "service": "openai", "voice": "nova", "gender": "female", "tone": "Dynamic & Energetic", "preview": "/static/previews/female_1.mp3"},
    {"id": "oa_echo", "name": "OpenAI Echo", "service": "openai", "voice": "echo", "gender": "male", "tone": "Deep & Confident", "preview": "/static/previews/male_1.mp3"},
    {"id": "oa_shimmer", "name": "OpenAI Shimmer", "service": "openai", "voice": "shimmer", "gender": "female", "tone": "Bright & Professional", "preview": "/static/previews/female_1.mp3"}
]

def get_voice_profiles():
    # Filter OpenAI profiles if API key is missing
    if not os.environ.get("OPENAI_API_KEY"):
        return [p for p in VOICE_PROFILES if p["service"] == "gtts"]
    return VOICE_PROFILES

def delete_voice_file(project_path, filename):
    """
    Deletes a specific voice variant file.
    Does NOT allow deleting master files.
    """
    if filename in ["voice.mp3", "voice_processed.mp3"]:
        return False, "Cannot delete master files"
        
    audio_path = os.path.join(project_path, "audio", filename)
    if os.path.exists(audio_path):
        os.remove(audio_path)
        return True, "File deleted"
    return False, "File not found"

def set_active_voice(project_path, filename):
    """
    Sets a specific voice file as the active voice.mp3.
    """
    audio_dir = os.path.join(project_path, "audio")
    source = os.path.join(audio_dir, filename)
    target = os.path.join(audio_dir, "voice.mp3")
    
    if os.path.exists(source):
        import shutil
        shutil.copy2(source, target)
        return True, "Voice set as active"
    return False, "Source file not found"

def get_actual_duration(file_path):
    """
    Get actual audio duration using afinfo or ffprobe.
    Retries up to 3 times to handle OS file locking/latency.
    """
    if not os.path.exists(file_path) or os.path.getsize(file_path) < 100:
        return 0.0

    for attempt in range(3):
        try:
            # Preference 1: afinfo (Mac standard)
            result = subprocess.run(['afinfo', '-b', file_path], capture_output=True, text=True)
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if 'sec' in line:
                        parts = line.strip().split(' ')
                        if len(parts) > 0:
                            try:
                                return float(parts[0])
                            except ValueError:
                                continue
            
            # Preference 2: ffprobe (Cross-platform precision)
            if shutil.which("ffprobe"):
                cmd = [
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", file_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode == 0 and result.stdout.strip():
                    return round(float(result.stdout.strip()), 3)
        except Exception:
            pass
        time.sleep(0.2) # Small wait before retry
    return 0.0

def sanitize_text(text):
    """
    Cleans text to prevent TTS failures by removing emojis 
    and unsupported special characters.
    """
    if not text: return ""
    # Only keep alphanumeric, Thai, spaces, and standard punctuation [.,!?]
    return re.sub(r'[^\w\sก-๙.,!?]', '', text)

def generate_voice(project_id, project_path, script_content, profile_id="oa_echo", speed=1.0, provider=None, voice_name=None):
    """
    Generates a voice audio file using real TTS services.
    Validates output integrity before confirming success.
    """
    audio_dir = os.path.join(project_path, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    
    timestamp = int(time.time())
    filename = f"voice---{profile_id}---{speed}---{timestamp}.mp3"
    audio_file = os.path.join(audio_dir, filename)
    
    # Provider/Voice Resolution
    active_provider = provider
    active_voice = voice_name
    
    if not active_provider:
        profile = next((p for p in VOICE_PROFILES if p["id"] == profile_id), VOICE_PROFILES[0])
        active_provider = profile.get("service", "gtts")
        active_voice = profile.get("voice") or profile.get("lang", "th")

    status = "OK"
    error_detail = None
    encoding_method = active_provider

    try:
        if active_provider == "gtts":
            # gTTS uses lang as voice essentially
            lang = active_voice if len(active_voice) <= 5 else "th"
            is_slow = speed < 1.0
            clean_text = sanitize_text(script_content)
            
            # Log script stats
            char_count = len(re.sub(r'[^\u0E00-\u0E7F]', '', script_content))
            word_count = len(script_content.replace(" ", "").replace("\n", "")) // 4
            log_event(project_path, "pipeline.log", 
                     f"[TTS] Script: {char_count} Thai chars, {word_count} words, est. {word_count * 0.5:.1f}s")
            
            tts = gTTS(text=clean_text, lang=lang, slow=is_slow)
            
            # Save to temporary file first
            temp_file = audio_file + ".raw.mp3"
            tts.save(temp_file)
            
            # Apply audio processing
            from utils.audio_processor import add_silence_padding, add_sentence_pauses
            
            # Step 1: Add sentence pauses
            pause_file = audio_file + ".paused.mp3"
            add_sentence_pauses(temp_file, pause_file, script_content, 
                              pause_duration=0.4, project_path=project_path)
            
            # Step 2: Add silence padding
            add_silence_padding(pause_file, audio_file, 
                              start_silence=1.5, end_silence=1.5, project_path=project_path)
            
            # Clean up temp files
            if os.path.exists(temp_file):
                os.remove(temp_file)
            if os.path.exists(pause_file):
                os.remove(pause_file)
        
        elif active_provider == "openai":
            client = get_openai_client()
            if client:
                # Log script stats
                char_count = len(re.sub(r'[^\u0E00-\u0E7F]', '', script_content))
                word_count = len(script_content.replace(" ", "").replace("\n", "")) // 4
                log_event(project_path, "pipeline.log", 
                         f"[TTS] Script: {char_count} Thai chars, {word_count} words, est. {word_count * 0.5:.1f}s")
                
                response = client.audio.speech.create(
                    model="tts-1",
                    voice=active_voice or "alloy",
                    input=script_content,
                    speed=speed
                )
                
                # Save to temporary file first
                temp_file = audio_file + ".raw.mp3"
                if hasattr(response, 'write_to_file'):
                    response.write_to_file(temp_file)
                else:
                    response.stream_to_file(temp_file)
                
                # Apply audio processing
                from utils.audio_processor import add_silence_padding, add_sentence_pauses
                
                # Step 1: Add sentence pauses
                pause_file = audio_file + ".paused.mp3"
                add_sentence_pauses(temp_file, pause_file, script_content, 
                                  pause_duration=0.4, project_path=project_path)
                
                # Step 2: Add silence padding
                add_silence_padding(pause_file, audio_file, 
                                  start_silence=1.5, end_silence=1.5, project_path=project_path)
                
                # Clean up temp files
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                if os.path.exists(pause_file):
                    os.remove(pause_file)
            else:
                raise ValueError("OpenAI API Key missing")
        else:
            raise ValueError(f"Unknown provider: {active_provider}")
            
        # Integrity Check
        if not os.path.exists(audio_file) or os.path.getsize(audio_file) < 1024:
            raise ValueError("Generated file is too small or missing")

    except Exception as e:
        print(f"!!! TTS GENERATION ERROR [{active_provider}] !!!")
        traceback.print_exc()
        status = "FAIL"
        error_detail = str(e)
        log_event(project_path, "pipeline.log", f"[VOICE_GENERATE] [FAIL] {filename}: {error_detail}")
        if os.path.exists(audio_file):
            os.remove(audio_file)
        return {"status": "FAIL", "error": error_detail}

    # Finalize
    duration = get_actual_duration(audio_file)
    if duration == 0:
        log_event(project_path, "pipeline.log", f"[VOICE_GENERATE] [WARNING] {filename} has 0 duration. Deleting.")
        os.remove(audio_file)
        return {"status": "FAIL", "error": "Duration detected as 0"}

    # Update default voice.mp3
    default_voice = os.path.join(audio_dir, "voice.mp3")
    shutil.copy2(audio_file, default_voice)
    
    log_event(project_path, "pipeline.log", 
             f"[VOICE_GENERATE] [OK] {filename} | Actual: {duration}s | Method: {encoding_method} | Speed: {speed} | Padding: 1.5s+1.5s")
    
    return {
        "status": status,
        "filename": filename,
        "profile_id": profile_id,
        "speed": speed,
        "duration": duration,
        "timestamp": timestamp,
        "url": f"/media/{project_id}/audio/{filename}",
        "method": encoding_method
    }

def list_voice_files(project_path, project_id):
    """
    Lists all generated voice files in the project with actual durations.
    """
    audio_dir = os.path.join(project_path, "audio")
    if not os.path.exists(audio_dir):
        return []
    
    files = []
    for f in os.listdir(audio_dir):
        file_path = os.path.join(audio_dir, f)
        
        # Skip directories or tiny broken files
        if not os.path.isfile(file_path) or os.path.getsize(file_path) < 100:
            continue

        actual_dur = get_actual_duration(file_path)
        if actual_dur <= 0:
            continue # Don't show files that browser can't play

        if f.startswith("voice---") and f.endswith(".mp3"):
            parts = f[:-4].split('---')
            if len(parts) >= 4:
                try:
                    files.append({
                        "filename": f,
                        "profile_id": parts[1],
                        "speed": float(parts[2]),
                        "timestamp": parts[3],
                        "duration": actual_dur,
                        "url": f"/media/{project_id}/audio/{f}"
                    })
                except:
                    pass
        elif f == "voice.mp3":
            files.append({
                "filename": f,
                "label": "RAW_TTS (Current)",
                "duration": actual_dur,
                "url": f"/media/{project_id}/audio/{f}"
            })
        elif f == "voice_processed.mp3":
            files.append({
                "filename": f,
                "label": "PROCESSED_VOICE",
                "duration": actual_dur,
                "url": f"/media/{project_id}/audio/{f}"
            })
    
    return sorted(files, key=lambda x: x.get('timestamp', '0'), reverse=True)
