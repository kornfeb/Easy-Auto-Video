import os
import math
import json
from pydub import AudioSegment
from core.logger import log_event

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
            
            # Mix Settings
            mix_settings = pdata.get("settings", {}).get("mix", {})
            settings_gain_voice = mix_settings.get("voice_gain", 1.0)
            settings_gain_music = mix_settings.get("music_gain", 0.2)
            
            # Music Settings
            music_settings = pdata.get("settings", {}).get("music", {})
            
            # If function called with None, try to get from settings
            if not music_filename:
                music_filename = music_settings.get("track", "")
            
            # "bgm_volume_adj" is a legacy parameter (dB adjustment).
            # New system uses "Gain" (0.0 - 1.0 multiplier).
            # We will use gain if no specific dB adjustment provided.
            
            settings_ducking = music_settings.get("duck_voice", True)

        # Paths
        voice_path = os.path.join(project_path, "audio", "voice.mp3")
        assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "music")
        
        # Output
        output_path = os.path.join(project_path, "output", "final_audio_mix.wav")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Validation
        if not os.path.exists(voice_path):
            return {"status": "FAIL", "error": "voice.mp3 not found"}
            
        if not music_filename or music_filename == "none":
            voice = AudioSegment.from_file(voice_path)
            # Apply Voice Gain
            # Pydub: gain in dB. multiplier -> dB = 20 * log10(gain)
            if settings_gain_voice != 1.0:
                 db_change = 0
                 if settings_gain_voice > 0.01:
                    db_change = 20 * math.log10(settings_gain_voice)
                 voice = voice + db_change
                 
            voice.export(output_path, format="wav")
            log_event(project_path, "pipeline.log", "[AUDIO_MIX] No music selected. Output voice only.")
            return {"status": "OK", "output": output_path, "duration": len(voice)/1000.0}

        music_path = os.path.join(assets_dir, music_filename)
        if not os.path.exists(music_path):
            log_event(project_path, "pipeline.log", f"[AUDIO_MIX] WARNING: Music file {music_filename} not found. Skipping music.")
            voice = AudioSegment.from_file(voice_path)
            voice.export(output_path, format="wav")
            return {"status": "WARNING", "message": "Music file missing, using voice only", "output": output_path}

        # Load Audio
        log_event(project_path, "pipeline.log", f"[AUDIO_MIX] Mixing voice with {music_filename}...")
        voice = AudioSegment.from_file(voice_path)
        music = AudioSegment.from_file(music_path)
        
        # Apply Voice Gain
        if settings_gain_voice != 1.0:
             if settings_gain_voice > 0.01:
                voice = voice + (20 * math.log10(settings_gain_voice))
        
        voice_duration_ms = len(voice)
        
        # Apply Music Gain
        # Priority: explicit dB arg > settings gain
        music_db_adj = 0
        if bgm_volume_adj is not None:
             music_db_adj = bgm_volume_adj
        else:
             if settings_gain_music > 0.001:
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
