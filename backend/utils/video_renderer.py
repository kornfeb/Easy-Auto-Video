import os
import json
import subprocess
import time
import math
from core.logger import log_event

def get_ffmpeg_env():
    """Configures PATH to include local bin/ffmpeg if available."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bin_dir = os.path.join(base_dir, "bin")
    env = os.environ.copy()
    if os.path.exists(bin_dir):
        env["PATH"] = bin_dir + os.pathsep + env.get("PATH", "")
    return env

def render_video(project_path, video_format="portrait", transition_id="none", transition_duration=0.5):
    """
    Renders the final video using FFmpeg.
    video_format: 'portrait' (1080x1920) or 'landscape' (1920x1080)
    transition_id: 'none', 'fade', 'slideleft', 'slideright', etc.
    transition_duration: overlap duration in seconds (half taken from each clip)
    """
    try:
        log_event(project_path, "render.log", f"[RENDER] Starting render process ({video_format})...")
        log_event(project_path, "render.log", f"[RENDER] Transition: {transition_id} ({transition_duration}s)")
        
        # Resolution Config
        if video_format == "landscape":
            WIDTH, HEIGHT = 1920, 1080
        else:
            WIDTH, HEIGHT = 1080, 1920
            
        log_event(project_path, "render.log", f"[RENDER] Target Resolution: {WIDTH}x{HEIGHT}")

        # 1. Load Timeline
        timeline_path = os.path.join(project_path, "timeline.json")
        if not os.path.exists(timeline_path):
            return {"status": "FAIL", "error": "timeline.json not found"}
            
        with open(timeline_path, 'r') as f:
            timeline = json.load(f)
            
        # 1.5 Check Dry Run Status
        dry_run_path = os.path.join(project_path, "dry_run_report.json")
        if os.path.exists(dry_run_path):
             with open(dry_run_path, 'r') as f:
                 report = json.load(f)
             if report.get("status") == "FAIL":
                 err = f"Render Blocked: Dry Run Validation Failed ({len(report.get('errors', []))} errors)."
                 log_event(project_path, "render.log", f"[RENDER] {err}")
                 return {"status": "FAIL", "error": err}
            
        # 2. Check Audio
        audio_path = os.path.join(project_path, "output", "final_audio_mix.wav")
        if not os.path.exists(audio_path):
            log_event(project_path, "render.log", "[RENDER] final_audio_mix.wav not found, checking voice.mp3")
            audio_path = os.path.join(project_path, "audio", "voice.mp3")
            if not os.path.exists(audio_path):
                 return {"status": "FAIL", "error": "No audio source found"}

        # 3. Prepare Assets
        input_dir = os.path.join(project_path, "input")
        output_dir = os.path.join(project_path, "output")
        output_file = os.path.join(output_dir, "final_video.mp4")
        os.makedirs(output_dir, exist_ok=True)
        
        # 4. Filter Construction
        segments = timeline.get("segments", [])
        silence_start = timeline.get("silence_start_duration", 1.5)
        silence_end = timeline.get("silence_end_duration", 1.5)
        
        if not segments:
            return {"status": "FAIL", "error": "Timeline has no segments"}

        # Determine Transition Mode
        XFADE_MAP = {
            'fade': 'fade',
            'slideleft': 'slideleft',
            'slideright': 'slideright',
            'circleopen': 'circleopen',
            'wipedown': 'wipedown',
            'wipeup': 'wipeup',
            'none': None
        }
        xfade_key = XFADE_MAP.get(transition_id)
        
        # Downgrade check
        min_seg_dur = min([s['duration'] for s in segments])
        if xfade_key and min_seg_dur < transition_duration * 2:
            log_event(project_path, "render.log", f"[RENDER] Warning: Segments too short ({min_seg_dur}s) for transition. Downgrading to hard cut.")
            xfade_key = None

        inputs = []
        filter_parts = []
        
        # Input 0: Audio
        inputs.extend(["-i", audio_path])
        
        # -- Intro (Stream [v_intro]) --
        filter_parts.append(f"color=c=black:s={WIDTH}x{HEIGHT}:d={silence_start}:r=30,setsar=1[v_intro]")
        
        # -- Images --
        input_idx = 1
        video_chain_output = "[v_intro]" # Default if no segments (impossible per check)
        
        if not xfade_key:
            # --- Classic Concat Method (No transition) ---
            concat_nodes = ["[v_intro]"]
            
            for i, seg in enumerate(segments):
                img_path = os.path.join(input_dir, seg["image"])
                if not os.path.exists(img_path):
                    filter_parts.append(f"color=c=black:s={WIDTH}x{HEIGHT}:d={seg['duration']}:r=30,setsar=1[v{i}]")
                    concat_nodes.append(f"[v{i}]")
                    continue
                    
                inputs.extend(["-loop", "1", "-i", img_path])
                frames = int(seg["duration"] * 30) + 5
                
                # Standard Zoompan
                kp_filter = (
                    f"[{input_idx}:v]"
                    f"scale=w={WIDTH}:h={HEIGHT}:force_original_aspect_ratio=increase,"
                    f"crop={WIDTH}:{HEIGHT}:(iw-ow)/2:(ih-oh)/2,"
                    f"setsar=1,"
                    f"format=yuv420p," 
                    f"zoompan=z='min(zoom+0.001,1.5)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={WIDTH}x{HEIGHT}:fps=30,"
                    f"trim=duration={seg['duration']},setpts=PTS-STARTPTS[v{i}]"
                )
                filter_parts.append(kp_filter)
                concat_nodes.append(f"[v{i}]")
                input_idx += 1
                
            # Trailing
            last_seg_idx = input_idx - 1 
            filter_parts.append(
                f"[{last_seg_idx}:v]"
                f"scale=w={WIDTH}:h={HEIGHT}:force_original_aspect_ratio=increase,"
                f"crop={WIDTH}:{HEIGHT}:(iw-ow)/2:(ih-oh)/2,setsar=1,"
                f"trim=duration={silence_end},setpts=PTS-STARTPTS[v_end]"
            )
            concat_nodes.append("[v_end]")
            
            # Concat
            n_segments = len(concat_nodes)
            concat_str = "".join(concat_nodes)
            filter_parts.append(f"{concat_str}concat=n={n_segments}:v=1:a=0[v_out]")
            
        else:
            # --- Xfade Method ---
            # 1. Process all images into streams [v0], [v1]... with PADDING
            accumulated_time = 0
            xfade_chain_last = None
            
            # Since we concat Intro + ImageBlock + Outro
            # We must build the ImageBlock stream separately
            
            for i, seg in enumerate(segments):
                img_path = os.path.join(input_dir, seg["image"])
                
                # Padding Logic
                pad_start = transition_duration / 2 if i > 0 else 0
                pad_end = transition_duration / 2 if i < len(segments)-1 else 0
                visual_dur = seg['duration'] + pad_start + pad_end
                
                if not os.path.exists(img_path):
                    filter_parts.append(f"color=c=black:s={WIDTH}x{HEIGHT}:d={visual_dur}:r=30,setsar=1[v{i}]")
                else:
                    inputs.extend(["-loop", "1", "-i", img_path])
                    frames = int(visual_dur * 30) + 10 # Extra buffer
                    
                    kp_filter = (
                        f"[{input_idx}:v]"
                        f"scale=w={WIDTH}:h={HEIGHT}:force_original_aspect_ratio=increase,"
                        f"crop={WIDTH}:{HEIGHT}:(iw-ow)/2:(ih-oh)/2,"
                        f"setsar=1,"
                        f"format=yuv420p," 
                        f"zoompan=z='min(zoom+0.001,1.5)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={WIDTH}x{HEIGHT}:fps=30,"
                        f"trim=duration={visual_dur},setpts=PTS-STARTPTS[v{i}]"
                    )
                    filter_parts.append(kp_filter)
                    input_idx += 1
                
                # Build Chain
                if i == 0:
                    xfade_chain_last = f"[v{i}]"
                    accumulated_time = seg['duration']
                else:
                    # Offset relative to start of first image in block
                    # Cut happens at accumulated_time of previous segments
                    offset = accumulated_time - (transition_duration / 2)
                    
                    next_node = f"[x{i}]"
                    filter_parts.append(
                        f"{xfade_chain_last}[v{i}]xfade=transition={xfade_key}:duration={transition_duration}:offset={offset}{next_node}"
                    )
                    xfade_chain_last = next_node
                    accumulated_time += seg['duration']
            
            # End of loop. xfade_chain_last is the [video_block]
            
            # Now handle Intro and Outro via Concat
            # Intro is [v_intro]
            # Outro needs [v_max]
            
            # Re-use last input for Outro (Freeze)
            last_seg_idx = input_idx - 1
            filter_parts.append(
                f"[{last_seg_idx}:v]"
                f"scale=w={WIDTH}:h={HEIGHT}:force_original_aspect_ratio=increase,"
                f"crop={WIDTH}:{HEIGHT}:(iw-ow)/2:(ih-oh)/2,setsar=1,"
                f"trim=duration={silence_end},setpts=PTS-STARTPTS[v_end]"
            )
            
            # Concat: Intro -> ImageBlock -> Outro
            # Note: Concat filters often require consistent streams.
            # Xfade output SAR/FPS should match.
            filter_parts.append(f"[v_intro]{xfade_chain_last}[v_end]concat=n=3:v=1:a=0[v_out]")

        
        full_filter = ";".join(filter_parts)
        
        # 5. Build Command
        cmd = ["ffmpeg", "-y"]
        cmd.extend(inputs)
        cmd.extend([
            "-filter_complex", full_filter,
            "-map", "[v_out]",
            "-map", "0:a", 
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest", 
            output_file
        ])
        
        # 6. Execute
        log_event(project_path, "render.log", f"[RENDER] Executing FFmpeg... (Files: {input_idx-1})")
        log_event(project_path, "render.log", f"CMD: {' '.join(cmd)}") 
        
        t0 = time.time()
        process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            env=get_ffmpeg_env()
        )
        
        stdout, stderr = process.communicate()
        t1 = time.time()
        
        if process.returncode != 0:
            err_msg = stderr.decode('utf-8')
            log_event(project_path, "render.log", f"[RENDER] FAIL: FFmpeg error:\n{err_msg[-500:]}")
            return {"status": "FAIL", "error": "FFmpeg execution failed (see logs)"}
            
        duration = t1 - t0
        file_size = os.path.getsize(output_file) / (1024*1024)
        
        # Determine Resolution (using portable ffprobe if avail) for final report
        # (Skipping probe here to save time, using configured width/height)
        
        log_event(project_path, "render.log", f"[RENDER] SUCCESS in {duration:.1f}s. Output: {file_size:.1f}MB")
        
        return {
            "status": "PASS", 
            "output_file": "final_video.mp4",
            "render_time": duration,
            "file_size_mb": file_size,
            "format": video_format,
            "transition": transition_id
        }
        
    except Exception as e:
        log_event(project_path, "render.log", f"[RENDER] CRITICAL FAIL: {str(e)}")
        return {"status": "FAIL", "error": str(e)}
