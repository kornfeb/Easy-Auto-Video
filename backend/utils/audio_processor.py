import os
import re
import subprocess
import tempfile
from core.logger import log_event

def add_silence_padding(audio_path, output_path, start_silence=1.5, end_silence=1.5, project_path=None):
    """
    Add silence padding to the beginning and end of an audio file.
    
    Args:
        audio_path: Path to input audio file
        output_path: Path to save output audio file
        start_silence: Seconds of silence at start (default 1.5s)
        end_silence: Seconds of silence at end (default 1.5s)
        project_path: Optional project path for logging
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Check if sox is available (preferred for audio manipulation)
        if subprocess.run(['which', 'sox'], capture_output=True).returncode == 0:
            return _add_silence_sox(audio_path, output_path, start_silence, end_silence, project_path)
        else:
            # Fallback to Python-based solution
            return _add_silence_pydub(audio_path, output_path, start_silence, end_silence, project_path)
    except Exception as e:
        if project_path:
            log_event(project_path, "pipeline.log", f"[AUDIO] Silence padding failed: {str(e)}")
        return False

def _add_silence_sox(audio_path, output_path, start_silence, end_silence, project_path):
    """
    Add silence using SoX (Sound eXchange) command-line tool.
    """
    try:
        cmd = [
            'sox',
            audio_path,
            output_path,
            'pad',
            str(start_silence),
            str(end_silence)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            if project_path:
                log_event(project_path, "pipeline.log", 
                         f"[AUDIO] Added silence: {start_silence}s start, {end_silence}s end (sox)")
            return True
        else:
            if project_path:
                log_event(project_path, "pipeline.log", f"[AUDIO] SoX error: {result.stderr}")
            return False
            
    except Exception as e:
        if project_path:
            log_event(project_path, "pipeline.log", f"[AUDIO] SoX failed: {str(e)}")
        return False

def _add_silence_pydub(audio_path, output_path, start_silence, end_silence, project_path):
    """
    Add silence using pydub (Python audio library).
    Fallback when sox is not available.
    """
    try:
        from pydub import AudioSegment
        from pydub.silence import detect_silence
        
        # Load audio
        audio = AudioSegment.from_file(audio_path)
        
        # Create silence segments
        start_silence_ms = int(start_silence * 1000)
        end_silence_ms = int(end_silence * 1000)
        
        silence_start = AudioSegment.silent(duration=start_silence_ms)
        silence_end = AudioSegment.silent(duration=end_silence_ms)
        
        # Combine
        padded_audio = silence_start + audio + silence_end
        
        # Export
        padded_audio.export(output_path, format="mp3")
        
        if project_path:
            log_event(project_path, "pipeline.log", 
                     f"[AUDIO] Added silence: {start_silence}s start, {end_silence}s end (pydub)")
        return True
        
    except ImportError:
        if project_path:
            log_event(project_path, "pipeline.log", 
                     "[AUDIO] pydub not available, silence padding skipped")
        # Copy file as-is if no tools available
        import shutil
        shutil.copy2(audio_path, output_path)
        return False
    except Exception as e:
        if project_path:
            log_event(project_path, "pipeline.log", f"[AUDIO] pydub failed: {str(e)}")
        return False

def add_sentence_pauses(audio_path, output_path, script_text, pause_duration=0.4, project_path=None):
    """
    Add natural pauses between sentences in the audio.
    
    Args:
        audio_path: Path to input audio file
        output_path: Path to save output audio file
        script_text: The script text to detect sentence boundaries
        pause_duration: Duration of pause between sentences in seconds (default 0.4s)
        project_path: Optional project path for logging
    
    Returns:
        bool: True if successful, False otherwise
    
    Note: This is a simplified implementation. For production, you'd want to use
    speech recognition to detect actual sentence boundaries in the audio.
    """
    try:
        from pydub import AudioSegment
        
        # Load audio
        audio = AudioSegment.from_file(audio_path)
        
        # Detect sentence count (Thai sentences typically end with . or space after clause)
        sentences = re.split(r'[.!?]\s+', script_text)
        sentence_count = len([s for s in sentences if s.strip()])
        
        if sentence_count <= 1:
            # No sentences to split, just copy
            import shutil
            shutil.copy2(audio_path, output_path)
            return True
        
        # Estimate duration per sentence
        total_duration_ms = len(audio)
        duration_per_sentence = total_duration_ms / sentence_count
        
        # Create output with pauses
        pause_ms = int(pause_duration * 1000)
        silence = AudioSegment.silent(duration=pause_ms)
        
        result = AudioSegment.empty()
        
        for i in range(sentence_count):
            start_ms = int(i * duration_per_sentence)
            end_ms = int((i + 1) * duration_per_sentence)
            
            segment = audio[start_ms:end_ms]
            result += segment
            
            # Add pause between sentences (not after last one)
            if i < sentence_count - 1:
                result += silence
        
        # Export
        result.export(output_path, format="mp3")
        
        if project_path:
            log_event(project_path, "pipeline.log", 
                     f"[AUDIO] Added {sentence_count-1} sentence pauses ({pause_duration}s each)")
        return True
        
    except ImportError:
        if project_path:
            log_event(project_path, "pipeline.log", 
                     "[AUDIO] pydub not available, sentence pauses skipped")
        import shutil
        shutil.copy2(audio_path, output_path)
        return False
    except Exception as e:
        if project_path:
            log_event(project_path, "pipeline.log", f"[AUDIO] Sentence pause processing failed: {str(e)}")
        return False

def get_audio_duration(file_path):
    """
    Get duration of audio file in seconds.
    """
    try:
        # Try afinfo first (Mac)
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
        
        # Try ffprobe
        if subprocess.run(['which', 'ffprobe'], capture_output=True).returncode == 0:
            cmd = [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0 and result.stdout.strip():
                return round(float(result.stdout.strip()), 3)
        
        # Fallback to pydub
        from pydub import AudioSegment
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000.0
        
    except Exception:
        return 0.0
