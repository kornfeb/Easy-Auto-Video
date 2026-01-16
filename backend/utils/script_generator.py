import os
import json
import re
from core.logger import log_event

def count_thai_chars(text):
    """
    Count Thai characters (excluding spaces and punctuation).
    """
    clean_text = re.sub(r'[^\u0E00-\u0E7F]', '', text)
    return len(clean_text)

def count_words(text):
    """
    Estimate word count for Thai text.
    Since Thai doesn't use spaces, a common heuristic is 4 characters per word.
    """
    clean_text = text.replace(" ", "").replace("\n", "").strip()
    return len(clean_text) // 4

def call_gemini_api(prompt, product_name):
    """
    Call Gemini API to generate script.
    Returns generated text or None if failed.
    """
    try:
        import google.generativeai as genai
        
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return None
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Format prompt with product name
        formatted_prompt = prompt.replace("{product_name}", product_name)
        
        response = model.generate_content(formatted_prompt)
        
        if response and response.text:
            return response.text.strip()
        return None
        
    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        return None

def generate_script(project_id, project_path):
    """
    Generate a video review script using Gemini AI.
    Includes auto-regeneration if the script doesn't meet constraints.
    
    Target: 30-45 Thai words (~120-180 characters)
    Duration: ~20 seconds of speech
    """
    # 1. Load Prompt Template
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    prompt_path = os.path.join(base_dir, "script", "prompt.txt")
    
    if not os.path.exists(prompt_path):
        log_event(project_path, "pipeline.log", "[ERROR] Script prompt file missing")
        return None, False

    with open(prompt_path, 'r', encoding='utf-8') as f:
        prompt_template = f.read()
        
    # 2. Get Product Information
    product_name = "สินค้ายอดนิยม"
    product_json = os.path.join(project_path, "input", "product.json")
    if os.path.exists(product_json):
        try:
            with open(product_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
                product_name = data.get("product_name", product_name)
        except Exception as e:
            log_event(project_path, "pipeline.log", f"[WARNING] Failed to read product.json: {str(e)}")
            
    # 3. Generation Logic with Auto-Regeneration
    max_attempts = 3
    final_script = ""
    is_ok = False
    
    log_event(project_path, "pipeline.log", f"[SCRIPT_GEN] Starting generation for: {product_name}")
    
    for attempt in range(1, max_attempts + 1):
        # Try Gemini API first
        current_script = call_gemini_api(prompt_template, product_name)
        
        # Fallback to mock if Gemini fails
        if not current_script:
            log_event(project_path, "pipeline.log", f"[SCRIPT_GEN] Attempt {attempt}: Gemini unavailable, using fallback")
            current_script = generate_fallback_script(product_name)
        
        # Validate constraints
        char_count = count_thai_chars(current_script)
        word_count = count_words(current_script)
        
        log_event(project_path, "pipeline.log", 
                 f"[SCRIPT_GEN] Attempt {attempt}: {char_count} chars, {word_count} words")
        
        # Check if within acceptable range (30-45 words)
        if 30 <= word_count <= 45:
            log_event(project_path, "pipeline.log", 
                     f"[SCRIPT_GEN] Attempt {attempt}: ✓ ACCEPTED")
            final_script = current_script
            is_ok = True
            break
        else:
            log_event(project_path, "pipeline.log", 
                     f"[SCRIPT_GEN] Attempt {attempt}: ✗ OUT OF RANGE (target: 30-45 words)")

    if not is_ok:
        log_event(project_path, "pipeline.log", "[SCRIPT_GEN] All attempts failed, using emergency fallback")
        final_script = f"รีวิว {product_name} ของดีบอกต่อ. คุณภาพดี. ราคาคุ้มค่า. สั่งซื้อได้เลยครับ."

    # 4. Save Output
    save_path = os.path.join(project_path, "script", "script.txt")
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, 'w', encoding='utf-8') as f:
        f.write(final_script)
    
    # 5. Log final stats
    final_chars = count_thai_chars(final_script)
    final_words = count_words(final_script)
    log_event(project_path, "pipeline.log", 
             f"[SCRIPT_GEN] FINAL: {final_chars} chars, {final_words} words, ~{final_words * 0.5:.1f}s estimated")
        
    return final_script, is_ok

def generate_fallback_script(product_name):
    """
    Generate a simple fallback script when Gemini is unavailable.
    """
    import random
    
    hooks = [
        f"ว้าว! ดู {product_name} นี่สิครับ.",
        f"ของดีบอกต่อ! {product_name} ครับ.",
        f"ไอเทมใหม่ {product_name} ต้องมีแล้ว."
    ]
    benefits = [
        ["สวยพรีเมียม.", "ใช้งานง่าย.", "คุ้มค่าจริงๆ."],
        ["คุณภาพดี.", "ทนทานใช้คุ้ม.", "ราคาดีมาก."],
        ["ดีไซน์สวย.", "พกพาสะดวก.", "ใช้ได้ทุกวัน."]
    ]
    ctas = [
        "จิ้มลิงก์โปรไฟล์ได้เลยครับ.",
        "สั่งซื้อที่ตะกร้านะครับ.",
        "รีบไปตำกันนะทุกคน."
    ]
    
    h = random.choice(hooks)
    b = random.choice(benefits)
    c = random.choice(ctas)
    
    return f"{h} {b[0]} {b[1]} {b[2]} {c}"
