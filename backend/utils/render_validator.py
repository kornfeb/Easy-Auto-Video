import os
import json
import math
from core.logger import log_event

def validate_render(project_path, fps=30):
    """
    Performs a dry run validation of the project assets and timeline.
    Returns a report dictionary.
    """
    report = {
        "status": "PASS", # PASS, WARNING, FAIL
        "errors": [],
        "warnings": [],
        "details": {}
    }

    log_event(project_path, "dry_run.log", "[DRY_RUN] Starting validation...")

    # 1. Asset Validation
    # Check Voice
    voice_path = os.path.join(project_path, "audio", "voice.mp3")
    if not os.path.exists(voice_path):
        report["status"] = "FAIL"
        report["errors"].append("Missing audio file: voice.mp3")
    else:
        report["details"]["audio_exists"] = True

    # Check Timeline JSON
    timeline_path = os.path.join(project_path, "timeline.json")
    if not os.path.exists(timeline_path):
        report["status"] = "FAIL"
        report["errors"].append("Missing timeline data: timeline.json")
        log_event(project_path, "dry_run.log", "[DRY_RUN] FAIL: Missing timeline.json")
        return report # Critical fail, cannot proceed

    try:
        with open(timeline_path, 'r', encoding='utf-8') as f:
            timeline = json.load(f)
    except Exception as e:
        report["status"] = "FAIL"
        report["errors"].append(f"Invalid timeline JSON: {str(e)}")
        return report

    # 2. Timeline Integrity Check
    total_duration = timeline.get("total_audio_duration") or timeline.get("total_duration", 0)
    silence_start = timeline.get("silence_start_duration", 0)
    silence_end = timeline.get("silence_end_duration", 0)
    segments = timeline.get("segments", [])

    if total_duration <= 0:
        report["status"] = "FAIL"
        report["errors"].append("Invalid total duration in timeline")

    # Check gap/overlap in usable region
    if not segments:
        report["warnings"].append("No segments in timeline")
        return report

    # 1. Start Check
    # Segments might start at 0.0 (Intro) or SILENCE_START (Legacy/No Intro)
    first_start = segments[0]["start"]
    if abs(first_start - 0.0) > 0.05 and abs(first_start - silence_start) > 0.05:
        report["warnings"].append(f"Timeline starts at {first_start}s, expected 0.0s or {silence_start}s")
    
    expected_cursor = first_start
    
    # 3. Image Existence Check
    input_dir = os.path.join(project_path, "input")
    missing_images = []

    for i, seg in enumerate(segments):
        # Time continuity check
        start_diff = abs(seg["start"] - expected_cursor)
        if start_diff > 0.05: # Allow small float drift
            report["warnings"].append(f"Gap/Overlap detected at segment {i}: Expected {expected_cursor:.3f}s, Got {seg['start']:.3f}s")
        
        expected_cursor = seg["end"]

        # Image check
        img_name = seg["image"]
        # Handle relative paths (e.g., ../cover.jpg)
        if img_name.startswith("../"):
            # Resolve relative to input dir -> project root
            img_path = os.path.normpath(os.path.join(input_dir, img_name))
        else:
            img_path = os.path.join(input_dir, img_name)
            
        if not os.path.exists(img_path):
            missing_images.append(img_name)
            report["status"] = "FAIL"
    
    if missing_images:
        report["errors"].append(f"Missing image files: {', '.join(missing_images)}")

    # Check trailing silence coverage
    # Updated logic: Segments should now cover the entire duration (including silence_end)
    end_diff = abs(total_duration - expected_cursor)
    if end_diff > 0.1:
        # If mismatch, check if it matches "Duration - Silence" (Old behavior)
        if abs((total_duration - silence_end) - expected_cursor) < 0.1:
             # This is actually OK for legacy timelines, but new ones fill it.
             pass
        else:
             report["warnings"].append(f"Timeline end mismatch: Segments end at {expected_cursor:.3f}s, expected {total_duration:.3f}s")

    # 4. Frame Simulation (FPS check)
    total_frames = int(total_duration * fps)
    report["details"]["estimated_frames"] = total_frames
    report["details"]["fps"] = fps
    report["details"]["total_duration"] = total_duration

    # Save report
    report_path = os.path.join(project_path, "dry_run_report.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    log_event(project_path, "dry_run.log", f"[DRY_RUN] Validation failed with status: {report['status']}")
    
    return report
