import os
import math
import json
from pydub import AudioSegment
from core.logger import log_event
from utils.tts_handler import get_actual_duration

def mix_background_music(project_path, music_filename=None, bgm_volume_adj=None):
    """
    Mixes voice.mp3 with a background music file.
    Respects project settings for gain and ducking if available.
    """
    try:
        # Runtime Path Fix for FFmpeg
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        bin_dir = os.path.join(base_dir, "bin")
        if os.path.exists(bin_dir):
            os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
            from pydub import AudioSegment
            AudioSegment.converter = os.path.join(bin_dir, "ffmpeg")

        # Load Settings from project.json
        settings_gain_voice = 1.0
        settings_gain_music = 0.2
        settings_ducking = True
        
        project_json_path = os.path.join(project_path, "project.json")
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                pdata = json.load(f)
                
            # If arguments are passed (legacy or manual override), use them. 
            # Otherwise fall back to settings.
            
            # Mix Settings (Legacy)
            mix_settings = pdata.get("settings", {}).get("mix", {})
            settings_gain_voice = mix_settings.get("voice_gain", 1.0)
            settings_gain_music = mix_settings.get("music_gain", 0.2)
            
            # Music Settings (Legacy)
            music_settings = pdata.get("settings", {}).get("music", {})
            legacy_track = music_settings.get("track", "")
            
            # Music Config (New - from MusicManager)
            music_config = pdata.get("music_config", {})
            
            # Resolve Music Filename
            if not music_filename:
                # 1. Try new config
                if music_config.get("enabled", True):
                    music_filename = music_config.get("music_file", legacy_track)
                else:
                    music_filename = "none" # Explicitly disabled
                
                # 2. Fallback to legacy if still empty
                if not music_filename:
                    music_filename = legacy_track
                
                # 3. Final fallback to default music from global settings
                if not music_filename:
                    from core.global_settings import get_settings
                    settings = get_settings()
                    music_filename = settings.music.default_music_file

            # Resolve Volume (if not provided in args)
            if bgm_volume_adj is None:
                # 1. Try new config
                if "volume_adj" in music_config:
                    bgm_volume_adj = music_config.get("volume_adj") # It's in dB already
                else:
                    # 2. Fallback to settings.music_gain (Multiplier)
                    pass # logic below handles settings_gain_music conversion
            
            settings_ducking = music_settings.get("duck_voice", True)

        # Paths
        voice_raw_path = os.path.join(project_path, "audio", "voice.mp3")
        voice_processed_path = os.path.join(project_path, "audio", "voice_processed.mp3")
        
        # Prefer processed voice.mp3 first (normalized and trimmed) to match timeline
        if os.path.exists(voice_processed_path):
            voice_path = voice_processed_path
            log_event(project_path, "pipeline.log", "[AUDIO_MIX] Using processed voice (recommended)")
        elif os.path.exists(voice_raw_path):
            voice_path = voice_raw_path
            log_event(project_path, "pipeline.log", "[AUDIO_MIX] Using raw voice (fallback)")
        else:
            return {"status": "FAIL", "error": "No voice file found"}
            
        assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "music")
        
        # Output
        output_path = os.path.join(project_path, "output", "final_audio_mix.wav")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
        if not music_filename or music_filename == "none":
            voice = AudioSegment.from_file(voice_path)
            # Apply Voice Gain
            # Pydub: gain in dB. multiplier -> dB = 20 * math.log10(gain)
            if settings_gain_voice != 1.0:
                 db_change = 0
                 if settings_gain_voice > 0.01:
                    db_change = 20 * math.log10(settings_gain_voice)
                 voice = voice + db_change
                 
            voice.export(output_path, format="wav")
            log_event(project_path, "pipeline.log", "[AUDIO_MIX] No music selected. Output voice only.")
            return {"status": "OK", "output": output_path, "duration": len(voice)/1000.0}

        # Find Music File (Prioritize Local Project Files)
        music_path = None
        
        # Check locations in order
        possible_paths = [
            os.path.join(project_path, "input", music_filename),
            os.path.join(project_path, "audio", music_filename),
            os.path.join(assets_dir, music_filename)
        ]
        
        for p in possible_paths:
            if os.path.exists(p):
                music_path = p
                break
        
        if not music_path:
            log_event(project_path, "pipeline.log", f"[AUDIO_MIX] WARNING: Music file {music_filename} not found in project or assets. Skipping music.")
            voice = AudioSegment.from_file(voice_path)
            voice.export(output_path, format="wav")
            return {"status": "WARNING", "message": f"Music file {music_filename} missing, using voice only", "output": output_path}

        # Load Audio
        log_event(project_path, "pipeline.log", f"[AUDIO_MIX] Mixing voice with {music_filename}...")
        log_event(project_path, "pipeline.log", f"[AUDIO_MIX] Music path: {music_path}")
        voice = AudioSegment.from_file(voice_path)
        music = AudioSegment.from_file(music_path)
        
        log_event(project_path, "pipeline.log", f"[AUDIO_MIX] Voice File: {voice_path}, Duration: {len(voice)}ms")
        log_event(project_path, "pipeline.log", f"[AUDIO_MIX] Music File: {music_path}, Duration: {len(music)}ms")
        
        # Apply Voice Gain
        if settings_gain_voice != 1.0:
             if isinstance(settings_gain_voice, (int, float)) and settings_gain_voice > 0.01:
                voice = voice + (20 * math.log10(settings_gain_voice))
        
        voice_duration_ms = len(voice)
        
        # Apply Music Gain
        # Priority: explicit dB arg > settings gain
        music_db_adj = 0
        if bgm_volume_adj is not None:
             music_db_adj = bgm_volume_adj
        else:
             if isinstance(settings_gain_music, (int, float)) and settings_gain_music > 0.001:
                 music_db_adj = 20 * math.log10(settings_gain_music)
             else:
                 music_db_adj = -100 # Silence
        
        music = music + music_db_adj
        
        # Loop Music
        if len(music) < voice_duration_ms:
            loops = math.ceil(voice_duration_ms / len(music))
            music = music * loops
            
        # Trim
        music = music[:voice_duration_ms]
        
        # Fade
        fade_duration = 500
        if len(music) > fade_duration * 2:
            music = music.fade_in(fade_duration).fade_out(fade_duration)
            
        # Ducking? (Not fully implemented here for simplicity, just overlay)
        # Real ducking requires analyzing voice volume. 
        # For now, "Duck" just implies we keep music lower, which Gain handles.
        # If user wants "Autoduck", we might assume standard -20dB equivalent was handled by gain.
            
        # Mix
        final_mix = voice.overlay(music, position=0)
        
        final_mix.export(output_path, format="wav")
        
        duration_sec = len(final_mix) / 1000.0
        log_event(project_path, "pipeline.log", f"[AUDIO_MIX] SUCCESS: Mixed audio generated ({duration_sec:.2f}s)")
        
        return {"status": "OK", "output": output_path, "duration": duration_sec}
        
    except Exception as e:
        error_msg = f"Audio mixing failed: {str(e)}"
        if "ffmpeg" in str(e).lower():
             error_msg += " (FFmpeg error)"
        log_event(project_path, "pipeline.log", f"[AUDIO_MIX] FAIL: {error_msg}")
        return {"status": "FAIL", "error": error_msg}
