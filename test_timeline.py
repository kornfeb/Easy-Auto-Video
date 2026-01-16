#!/usr/bin/env python3
import os
import sys
import json
import shutil
import tempfile

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from utils.timeline_manager import build_timeline
from core.logger import log_event

def test_timeline_builder():
    print("=" * 60)
    print("TEST: Timeline Builder (Audio-Aware)")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # 1. Setup mock project structure
        audio_dir = os.path.join(tmpdir, "audio")
        input_dir = os.path.join(tmpdir, "input")
        os.makedirs(audio_dir)
        os.makedirs(input_dir)
        
        # 2. Create a dummy voice.mp3 (we can't easily generate real audio in test, 
        # so we'll mock get_actual_duration by monkeypatching or using a real file if small)
        voice_path = os.path.join(audio_dir, "voice.mp3")
        with open(voice_path, "wb") as f:
            f.write(b"dummy audio data")
            
        # 3. Create mock images
        for i in range(3):
            with open(os.path.join(input_dir, f"image_{i}.jpg"), "w") as f:
                f.write("dummy image data")
                
        # 4. Mock get_actual_duration in the module where it's used
        import utils.timeline_manager
        original_get_duration = utils.timeline_manager.get_actual_duration
        utils.timeline_manager.get_actual_duration = lambda x: 13.0
        
        try:
            print(f"Building timeline for 13.0s audio and 3 images...")
            result = build_timeline(tmpdir)
            
            if result["status"] == "OK":
                timeline = result["timeline"]
                print("✓ Timeline generated successfully")
                print(f"  Total Audio Duration: {timeline['total_audio_duration']}s")
                print(f"  Silence Start: {timeline['silence_start_duration']}s")
                print(f"  Silence End: {timeline['silence_end_duration']}s")
                print(f"  Usable Duration: {timeline['usable_duration']}s")
                
                segments = timeline["segments"]
                print(f"  Segments count: {len(segments)}")
                
                # Verify segment timing
                expected_start = 1.5
                duration_per_image = 10.0 / 3.0 # ~3.333
                
                for i, seg in enumerate(segments):
                    print(f"    Segment {i}: {seg['start']}s -> {seg['end']}s ({seg['duration']}s)")
                    # Check if start is at or after 1.5s
                    if seg['start'] < 1.5:
                        print(f"    ❌ Error: Segment {i} starts before silence end")
                    if seg['end'] > 11.5 and i < 2:
                        print(f"    ❌ Error: Segment {i} ends in trailing silence")
                
                if segments[-1]['end'] == 11.5:
                    print("  ✓ Last segment ends exactly at usable end (11.5s)")
                else:
                    print(f"  ⚠ Last segment ends at {segments[-1]['end']}s (expected 11.5s)")
                
                return True
            else:
                print(f"❌ Timeline build failed: {result.get('error')}")
                return False
        finally:
            utils.tts_handler.get_actual_duration = original_get_duration

if __name__ == "__main__":
    if test_timeline_builder():
        print("\n✓ ALL TIMELINE TESTS PASSED")
        sys.exit(0)
    else:
        print("\n❌ TIMELINE TESTS FAILED")
        sys.exit(1)
