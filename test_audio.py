import os
import sys
from pydub import AudioSegment

try:
    print("Testing AudioSegment with mp3...")
    # Try creating a silent segment and exporting as mp3 (requires ffmpeg)
    seg = AudioSegment.silent(duration=1000)
    
    music_path = "backend/assets/music/carefree.mp3"
    if os.path.exists(music_path):
        print(f"Loading {music_path}...")
        song = AudioSegment.from_file(music_path, format="mp3")
        print(f"Loaded successfully. Duration: {len(song)/1000}s")
    else:
        print("Music file not found, skipping load test.")
        
    print("Exporting test.mp3...")
    seg.export("test.mp3", format="mp3")
    print("SUCCESS: pydub and ffmpeg seem to be working.")
    os.remove("test.mp3")
    
except Exception as e:
    print(f"FAIL: {e}")
    print("\nIf you see 'FileNotFound', it likely means FFMPEG is missing.")
    print("On Mac, please run: brew install ffmpeg")
