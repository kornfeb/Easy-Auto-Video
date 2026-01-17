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
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Format prompt with product name (simple replacement, but template handles more)
        # Note: 'prompt' here is already the fully resolved prompt from generate_script
        
        response = model.generate_content(prompt)
        
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
    Reads settings from project.json for template and word count target.
    """
    
    # Defaults
    target_word_count = 40
    prompt_template = ""
    
    # 1. Load Settings
    project_json_path = os.path.join(project_path, "project.json")
    if os.path.exists(project_json_path):
        try:
            with open(project_json_path, 'r') as f:
                pdata = json.load(f)
                script_settings = pdata.get("settings", {}).get("script", {})
                target_word_count = script_settings.get("word_count", 40)
                prompt_template = script_settings.get("template", "")
        except:
            pass

    # Fallback to file prompt if template is empty
    if not prompt_template:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        prompt_path = os.path.join(base_dir, "script", "prompt.txt")
        if os.path.exists(prompt_path):
            with open(prompt_path, 'r', encoding='utf-8') as f:
                prompt_template = f.read()
        else:
            prompt_template = "เขียนบทโฆษณาสำหรับ {{product_name}} ความยาว {{word_count}} คำ เน้นความน่าสนใจ"

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
             
    # 3. Resolve Prompt Variables
    # Supported: {{product_name}}, {{word_count}}, {{tone}}, {{cta}} (generic)
    # For now simply replace mostly product_name and word_count
    final_prompt = prompt_template.replace("{{product_name}}", product_name)
    final_prompt = final_prompt.replace("{{word_count}}", str(target_word_count))
    final_prompt = final_prompt.replace("{{tone}}", "ตื่นเต้น น่าเชื่อถือ") 
    final_prompt = final_prompt.replace("{{product_benefits}}", "คุณภาพดี ราคาคุ้มค่า")
    final_prompt = final_prompt.replace("{{cta}}", "กดสั่งซื้อได้เลยที่ตะกร้า") 
    
    # 3. Generation Logic with Auto-Regeneration
    max_attempts = 3
    final_script = ""
    is_ok = False
    
    # Acceptable range: +/- 20%
    min_words = int(target_word_count * 0.8)
    max_words = int(target_word_count * 1.2)
    
    log_event(project_path, "pipeline.log", f"[SCRIPT_GEN] Starting generation for: {product_name} (Target: {target_word_count} words)")
    
    for attempt in range(1, max_attempts + 1):
        # Try Gemini API first
        current_script = call_gemini_api(final_prompt, product_name)
        
        # Fallback to mock if Gemini fails
        if not current_script:
            log_event(project_path, "pipeline.log", f"[SCRIPT_GEN] Attempt {attempt}: Gemini unavailable, using fallback")
            current_script = generate_fallback_script(product_name)
        
        # Validate constraints
        char_count = count_thai_chars(current_script)
        word_count = count_words(current_script)
        
        log_event(project_path, "pipeline.log", 
                 f"[SCRIPT_GEN] Attempt {attempt}: {char_count} chars, {word_count} words")
        
        # Check if within acceptable range
        if min_words <= word_count <= max_words:
            log_event(project_path, "pipeline.log", 
                     f"[SCRIPT_GEN] Attempt {attempt}: ✓ ACCEPTED")
            final_script = current_script
            is_ok = True
            break
        else:
            log_event(project_path, "pipeline.log", 
                     f"[SCRIPT_GEN] Attempt {attempt}: ✗ OUT OF RANGE (target: {min_words}-{max_words} words)")
            # Retry logic could modify prompt to be shorter/longer but for now just retry
            if attempt == max_attempts:
                 final_script = current_script # Accept best effort

    if not final_script:
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
