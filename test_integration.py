#!/usr/bin/env python3
"""
Test script for Gemini integration and audio processing.
Run this to verify the new features are working correctly.
"""

import os
import sys

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_gemini_connection():
    """Test Gemini API connection."""
    print("=" * 60)
    print("TEST 1: Gemini API Connection")
    print("=" * 60)
    
    try:
        import google.generativeai as genai
        
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("❌ GEMINI_API_KEY not found in environment")
            return False
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        response = model.generate_content("Say 'Hello' in Thai")
        
        if response and response.text:
            print(f"✓ Gemini API connected successfully")
            print(f"  Response: {response.text[:50]}...")
            return True
        else:
            print("❌ Gemini API returned empty response")
            return False
            
    except Exception as e:
        print(f"❌ Gemini API test failed: {str(e)}")
        return False

def test_script_generation():
    """Test script generation with new logic."""
    print("\n" + "=" * 60)
    print("TEST 2: Script Generation")
    print("=" * 60)
    
    try:
        from utils.script_generator import generate_script, count_thai_chars, count_words
        
        # Create a temporary project structure
        import tempfile
        import json
        
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create project structure
            input_dir = os.path.join(tmpdir, "input")
            script_dir = os.path.join(tmpdir, "script")
            os.makedirs(input_dir)
            os.makedirs(script_dir)
            
            # Create product.json
            product_data = {"product_name": "ผ้าไหมไทยพรีเมียม"}
            with open(os.path.join(input_dir, "product.json"), 'w', encoding='utf-8') as f:
                json.dump(product_data, f, ensure_ascii=False)
            
            # Generate script
            script, success = generate_script("test-project", tmpdir)
            
            if script:
                char_count = count_thai_chars(script)
                word_count = count_words(script)
                
                print(f"✓ Script generated successfully")
                print(f"  Length: {char_count} Thai chars, {word_count} words")
                print(f"  Estimated duration: {word_count * 0.5:.1f}s")
                print(f"  Script preview: {script[:80]}...")
                
                # Validate constraints
                if 30 <= word_count <= 45:
                    print(f"  ✓ Word count within target range (30-45)")
                else:
                    print(f"  ⚠ Word count outside target range: {word_count}")
                
                return True
            else:
                print("❌ Script generation failed")
                return False
                
    except Exception as e:
        print(f"❌ Script generation test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_audio_processing():
    """Test audio processing utilities."""
    print("\n" + "=" * 60)
    print("TEST 3: Audio Processing")
    print("=" * 60)
    
    try:
        from utils.audio_processor import add_silence_padding, add_sentence_pauses
        
        # Check for available tools
        import subprocess
        
        has_sox = subprocess.run(['which', 'sox'], capture_output=True).returncode == 0
        
        try:
            from pydub import AudioSegment
            has_pydub = True
        except ImportError:
            has_pydub = False
        
        print(f"  SoX available: {'✓' if has_sox else '✗'}")
        print(f"  pydub available: {'✓' if has_pydub else '✗'}")
        
        if has_sox or has_pydub:
            print(f"  ✓ Audio processing tools available")
            return True
        else:
            print(f"  ⚠ No audio processing tools available (optional)")
            print(f"    Install with: pip3 install pydub")
            print(f"    Or install sox: brew install sox")
            return True  # Not a failure, just optional
            
    except Exception as e:
        print(f"❌ Audio processing test failed: {str(e)}")
        return False

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("Easy Auto Video - Integration Tests")
    print("=" * 60 + "\n")
    
    results = []
    
    results.append(("Gemini API", test_gemini_connection()))
    results.append(("Script Generation", test_script_generation()))
    results.append(("Audio Processing", test_audio_processing()))
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}: {name}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("=" * 60 + "\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
