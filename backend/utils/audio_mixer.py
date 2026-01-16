import os
import math
from pydub import AudioSegment
from core.logger import log_event

def mix_background_music(project_path, music_filename, bgm_volume_adj=-20):
    """
    Mixes voice.mp3 with a background music file.
    
    Args:
        project_path (str): Path to the project directory.
        music_filename (str): Filename of the music in assets/music/.
        bgm_volume_adj (int): dB adjustment for music (default -20dB).
        
    Returns:
        dict: Result status and output path.
    """
    try:
        # Runtime Path Fix: Ensure backend/bin is in PATH for FFmpeg
        # file: backend/utils/audio_mixer.py -> base: backend/
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        bin_dir = os.path.join(base_dir, "bin")
        if os.path.exists(bin_dir):
            # Check if executing Pydub needs specific path setup or just env var
            os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
            
            # Explicitly set for Pydub if needed (sometimes env var update isn't enough for already loaded modules, but usually is)
            from pydub import AudioSegment
            AudioSegment.converter = os.path.join(bin_dir, "ffmpeg")
            # AudioSegment.ffprobe = os.path.join(bin_dir, "ffprobe") # Pydub doesn't expose this easily, depends on PATH

        # Paths
        voice_path = os.path.join(project_path, "audio", "voice.mp3")
        assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "music")
        music_path = os.path.join(assets_dir, music_filename)
        output_path = os.path.join(project_path, "output", "final_audio_mix.wav")
        
        # Validation
        if not os.path.exists(voice_path):
            return {"status": "FAIL", "error": "voice.mp3 not found"}
            
        if not music_filename or music_filename == "none":
            # No music, just copy voice to output (convert to wav for standardization)
            voice = AudioSegment.from_file(voice_path)
            # Ensure output dir exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            voice.export(output_path, format="wav")
            log_event(project_path, "pipeline.log", "[AUDIO_MIX] No music selected. Output voice only.")
            return {"status": "OK", "output": output_path, "duration": len(voice)/1000.0}

        if not os.path.exists(music_path):
            log_event(project_path, "pipeline.log", f"[AUDIO_MIX] WARNING: Music file {music_filename} not found. Skipping music.")
            # Fallback to voice only
            voice = AudioSegment.from_file(voice_path)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            voice.export(output_path, format="wav")
            return {"status": "WARNING", "message": "Music file missing, using voice only", "output": output_path}

        # Load Audio
        log_event(project_path, "pipeline.log", f"[AUDIO_MIX] Mixing voice with {music_filename}...")
        voice = AudioSegment.from_file(voice_path)
        music = AudioSegment.from_file(music_path)
        
        voice_duration_ms = len(voice)
        
        # Prepare Music
        # 1. Adjust Volume
        music = music + bgm_volume_adj
        
        # 2. Loop if necessary
        if len(music) < voice_duration_ms:
            loops = math.ceil(voice_duration_ms / len(music))
            music = music * loops
            
        # 3. Trim to exact voice duration
        music = music[:voice_duration_ms]
        
        # 4. Fade In/Out (0.5s = 500ms)
        fade_duration = 500
        # Only fade if duration is long enough
        if len(music) > fade_duration * 2:
            music = music.fade_in(fade_duration).fade_out(fade_duration)
            
        # Mix
        # Overlay music under voice
        # position=0 means start at beginning
        final_mix = voice.overlay(music, position=0)
        
        # Export
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        final_mix.export(output_path, format="wav")
        
        duration_sec = len(final_mix) / 1000.0
        log_event(project_path, "pipeline.log", f"[AUDIO_MIX] SUCCESS: Mixed audio generated ({duration_sec:.2f}s)")
        
        return {"status": "OK", "output": output_path, "duration": duration_sec}
        
    except Exception as e:
        error_msg = f"Audio mixing failed: {str(e)}"
        if "ffmpeg" in str(e).lower() or "ffprobe" in str(e).lower() or "no such file" in str(e).lower():
             error_msg += " (FFmpeg might be missing. Install it with: brew install ffmpeg)"
        log_event(project_path, "pipeline.log", f"[AUDIO_MIX] FAIL: {error_msg}")
        return {"status": "FAIL", "error": error_msg}
