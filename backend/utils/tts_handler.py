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

# Real Voice Profiles (100% Gemini Next-Gen)
VOICE_PROFILES = [
    {"id": "gm_puck", "name": "Gemini Puck", "service": "gemini", "voice": "Puck", "gender": "male", "tone": "Energetic & Fast", "preview": "/static/previews/natural_1.mp3"},
    {"id": "gm_charon", "name": "Gemini Charon", "service": "gemini", "voice": "Charon", "gender": "male", "tone": "Deep & Narrative", "preview": "/static/previews/natural_1.mp3"},
    {"id": "gm_zephyr", "name": "Gemini Zephyr", "service": "gemini", "voice": "Zephyr", "gender": "female", "tone": "Neutral & Natural", "preview": "/static/previews/female_1.mp3"},
    {"id": "gm_aoede", "name": "Gemini Aoede", "service": "gemini", "voice": "Aoede", "gender": "female", "tone": "Clear & Professional", "preview": "/static/previews/female_1.mp3"},
    {"id": "gm_kore", "name": "Gemini Kore", "service": "gemini", "voice": "Kore", "gender": "female", "tone": "Bright & Friendly", "preview": "/static/previews/female_1.mp3"},
    {"id": "gm_fenrir", "name": "Gemini Fenrir", "service": "gemini", "voice": "Fenrir", "gender": "male", "tone": "Deep & Authoritative", "preview": "/static/previews/male_1.mp3"},
    {"id": "gm_sadaltager", "name": "Gemini Sadaltager", "service": "gemini", "voice": "Sadaltager", "gender": "male", "tone": "Smooth & Resonant", "preview": "/static/previews/male_1.mp3"}
]

def get_voice_profiles():
    # Only return Gemini profiles as it's the primary system now
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
        # Invalidate processed cache
        processed_path = os.path.join(audio_dir, "voice_processed.mp3")
        if os.path.exists(processed_path):
            os.remove(processed_path)
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

def generate_voice(project_id, project_path, script_content, profile_id="oa_echo", speed=1.0, provider=None, voice_name=None, style_instructions=None):
    """
    Generates a voice audio file using real TTS services.
    Validates output integrity before confirming success.
    Reads global defaults for pauses and silence from project.json
    """
    audio_dir = os.path.join(project_path, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    
    timestamp = int(time.time())
    filename = f"voice---{profile_id}---{speed}---{timestamp}.mp3"
    audio_file = os.path.join(audio_dir, filename)
    
    # Load Project Settings
    pause_breathing = False
    silence_start = 0.0
    silence_end = 0.0
    
    project_json_path = os.path.join(project_path, "project.json")
    if os.path.exists(project_json_path):
        try:
            with open(project_json_path, 'r') as f:
                pdata = json.load(f)
                settings = pdata.get("settings", {})
                
                # Breathing Pause
                pause_breathing = settings.get("voice", {}).get("breathing_pause", False)
                
                # Silence Padding
                video_settings = settings.get("video", {})
                silence_start = video_settings.get("intro_silence", 0.0)
                silence_end = video_settings.get("outro_silence", 0.0)
        except:
            pass

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
        # Save to temporary file first
        temp_file = audio_file + ".raw.mp3"
            
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
            tts.save(temp_file)
            
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
                
                if hasattr(response, 'write_to_file'):
                    response.write_to_file(temp_file)
                else:
                    response.stream_to_file(temp_file)
            else:
                raise ValueError("OpenAI API Key missing")
        elif active_provider == "gemini":
            from utils.gemini_tts import generate_gemini_tts
            # Log script stats
            char_count = len(re.sub(r'[^\u0E00-\u0E7F]', '', script_content))
            word_count = len(script_content.replace(" ", "").replace("\n", "")) // 4
            log_event(project_path, "pipeline.log", 
                     f"[TTS] [GEMINI] Script: {char_count} Thai chars, {word_count} words")
            
            # Use provided style_instructions or default
            effective_style = style_instructions or "Read aloud in a warm and friendly tone"
            
            audio_data = generate_gemini_tts(
                text=script_content,
                voice_name=active_voice or "Puck",
                style_instructions=effective_style
            )
            with open(temp_file, "wb") as f:
                f.write(audio_data)
        else:
            raise ValueError(f"Unknown provider: {active_provider}")
            
        # Apply audio processing
        from utils.audio_processor import add_silence_padding, add_sentence_pauses
        
        # Step 1: Add sentence pauses -> saves to pause_file
        pause_file = audio_file + ".paused.mp3"
        
        if pause_breathing:
            add_sentence_pauses(temp_file, pause_file, script_content, 
                              pause_duration=0.4, project_path=project_path)
            source_for_padding = pause_file if os.path.exists(pause_file) and os.path.getsize(pause_file) > 100 else temp_file
        else:
            source_for_padding = temp_file
        
        # Step 2: Add silence padding -> saves to FINAL audio_file
        success = add_silence_padding(source_for_padding, audio_file, 
                          start_silence=silence_start, end_silence=silence_end, project_path=project_path)
                          
        if not success:
             # Fallback: copy raw source to final
             shutil.copy2(source_for_padding, audio_file)

        # Cleanup
        if os.path.exists(temp_file):
            try: os.remove(temp_file)
            except: pass
        if os.path.exists(pause_file):
             try: os.remove(pause_file)
             except: pass

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
            try: os.remove(audio_file)
            except: pass
        return {"status": "FAIL", "error": error_detail}

    # Finalize
    duration = get_actual_duration(audio_file)
    if duration == 0:
        log_event(project_path, "pipeline.log", f"[VOICE_GENERATE] [WARNING] {filename} has 0 duration. Deleting.")
        try: os.remove(audio_file)
        except: pass
        return {"status": "FAIL", "error": "Duration detected as 0"}

    # Update default voice.mp3
    default_voice = os.path.join(audio_dir, "voice.mp3")
    try:
        shutil.copy2(audio_file, default_voice)
        # Invalidate processed cache
        processed_path = os.path.join(audio_dir, "voice_processed.mp3")
        if os.path.exists(processed_path):
            os.remove(processed_path)
    except:
        pass
    
    log_event(project_path, "pipeline.log", 
             f"[VOICE_GENERATE] [OK] {filename} | Actual: {duration}s | Method: {encoding_method} | Speed: {speed} | Padding: {silence_start}s+{silence_end}s")
    
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
    
    # Sort by timestamp descending
    files.sort(key=lambda x: x.get("timestamp", "0"), reverse=True)
    return files
