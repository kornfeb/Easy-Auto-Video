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

def get_zoompan_filter(seg, width, height, frames, crop_data=None):
    kb = seg.get("ken_burns", {})
    if not kb.get("enabled", True):
        return f"crop={width}:{height}:(iw-ow)/2:(ih-oh)/2,setsar=1,fps=30"
    
    preset = kb.get("preset", "subtle")
    z_start, z_end = 1.0, 1.07
    x_expr, y_expr = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    if preset == "zoom_in": z_start, z_end = 1.0, 1.15
    elif preset == "zoom_out": z_start, z_end = 1.15, 1.0
    
    if crop_data and crop_data.get("roi"):
        roi = crop_data["roi"]
        dims = crop_data.get("dimensions", {})
        if dims.get("w") and dims.get("h"):
            rx, ry = (roi[0]+roi[2])/2, (roi[1]+roi[3])/2
            nx, ny = rx/dims['w'], ry/dims['h']
            x_expr, y_expr = f"(iw*{nx})-(iw/zoom/2)", f"(ih*{ny})-(ih/zoom/2)"

    z_expr = f"{z_start}+({z_end}-{z_start})*(on/{frames})"
    x_expr = f"clip({x_expr},0,iw-iw/zoom)"
    y_expr = f"clip({y_expr},0,ih-ih/zoom)"
    return f"zoompan=z='{z_expr}':d={frames}:x='{x_expr}':y='{y_expr}':s={width}x{height}:fps=30"

def render_video(project_path, video_format="portrait", transition_id="none", transition_duration=0):
    """
    Final high-stability renderer using Concat method. 
    Transitions (xfade) are disabled for this build to ensure 100% success rate.
    """
    cleanup_files = []
    try:
        log_event(project_path, "render.log", f"[RENDER] Starting high-stability concat render...")
        WIDTH, HEIGHT = (1080, 1920) if video_format == "portrait" else (1920, 1080)
        
        timeline_path = os.path.join(project_path, "timeline.json")
        with open(timeline_path, 'r') as f: timeline = json.load(f)
        
        audio_path = os.path.join(project_path, "output", "final_audio_mix.wav")
        if not os.path.exists(audio_path):
            audio_path = os.path.join(project_path, "audio", "voice_processed.mp3")
            if not os.path.exists(audio_path):
                audio_path = os.path.join(project_path, "audio", "voice.mp3")

        from utils.crop_manager import load_crops
        from PIL import Image
        crops_data = load_crops(project_path)
        input_dir = os.path.join(project_path, "input")
        output_file = os.path.join(project_path, "output", "final_video.mp4")
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        if os.path.exists(output_file): os.remove(output_file)

        segments = timeline.get("segments", [])
        inputs = ["-i", audio_path]
        filter_parts = []
        concat_nodes = []
        
        for i, seg in enumerate(segments):
            img_name = seg["image"]
            img_path = os.path.abspath(os.path.join(input_dir, img_name))
            if img_name.startswith("../"): img_path = os.path.abspath(os.path.join(project_path, img_name[3:]))
            
            # Formate normalization via PIL
            temp_jpg = os.path.join(project_path, f"input_stb_{i}.jpg")
            try:
                with Image.open(img_path) as im: im.convert("RGB").save(temp_jpg, "JPEG")
                img_path = temp_jpg
                cleanup_files.append(temp_jpg)
            except: pass

            inputs.extend(["-loop", "1", "-r", "30", "-i", img_path])
            dur = seg['duration']
            frames = int(math.ceil((dur + 1.0) * 30))
            kb = get_zoompan_filter(seg, WIDTH, HEIGHT, frames)
            
            node = f"[v{i}]"
            filter_parts.append(
                f"[{i+1}:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT},"
                f"setsar=1,fps=30,{kb},format=yuv420p,trim=duration={dur},setpts=PTS-STARTPTS{node}"
            )
            concat_nodes.append(node)
            
        full_filter = ";".join(filter_parts)
        concat_str = "".join(concat_nodes)
        
        cmd = ["ffmpeg", "-y"]
        cmd.extend(inputs)
        cmd.extend([
            "-filter_complex", f"{full_filter};{concat_str}concat=n={len(segments)}:v=1:a=0,format=yuv420p[v_out]",
            "-map", "[v_out]", "-map", "0:a",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "23",
            "-c:a", "aac", "-b:a", "192k", "-shortest", output_file
        ])
        
        log_event(project_path, "render.log", f"[RENDER] Launching Concat Render...")
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=get_ffmpeg_env())
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            log_event(project_path, "render.log", f"[RENDER] FAIL: {stderr.decode('utf-8')[-200:]}")
            return {"status": "FAIL", "error": "Render failed"}
            
        return {"status": "PASS", "output_file": "final_video.mp4"}
    except Exception as e:
        return {"status": "FAIL", "error": str(e)}
    finally:
        for f in cleanup_files:
            try: os.remove(f)
            except: pass
