
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import time
import requests
from core.config import PROJECTS_DIR
from core.logger import log_event
import google.generativeai as genai
from PIL import Image

# Helper for OpenAI Image Gen (DALL-E)
def generate_dalle_image(prompt, size="1024x1024"):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None, "OpenAI API Key missing"
        
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size=size,
            quality="standard",
            n=1,
        )
        return response.data[0].url, None
    except Exception as e:
        return None, str(e)

# --- Models ---
class CoverTextGenRequest(BaseModel):
    product_name: str
    tone: str = "engaging"
    language: str = "th"

class CoverImageGenRequest(BaseModel):
    prompt: str
    style: str = "photorealistic" # photorealistic, minimal, 3d-render

class CoverPromptGenRequest(BaseModel):
    product_name: str
    image_filename: str = None # Optional, if none, uses text only

# --- Router Logic (to be merged into main.py or separate router) ---
# For now, implemented as functions to be called by main.py endpoints

def generate_cover_text_ai(project_path, product_name, tone="engaging"):
    """
    Generates 3 options for Short Title (Hook) and Tagline using Gemini.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"error": "Gemini API Key missing"}
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-exp') # Use faster model
        
        from core.global_settings import get_settings
        settings = get_settings()
        
        max_words = settings.hook.max_words
        max_chars = settings.hook.max_characters
        base_template = settings.hook.title_prompt_template
        
        log_event(project_path, "pipeline.log", f"[HOOK_GEN] Loaded settings: MaxWords={max_words}, MaxChars={max_chars}")

        
        prompt = f"""
        Action: {base_template}
        Product: "{product_name}"
        Tone: {tone}
        Language: Thai
        
        Requirements:
        1. Generate 3 pairs of "Title" (Hook) and "Subtitle" (Tagline).
        2. Title Constraints: Maximum {max_words} words, Maximum {max_chars} characters.
        3. Subtitle Constraints: Short, benefit-driven.
        
        Output JSON format:
        [
            {{"title": "...", "subtitle": "..."}},
            {{"title": "...", "subtitle": "..."}},
            {{"title": "...", "subtitle": "..."}}
        ]
        """
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean markdown
        if text.startswith("```json"):
            text = text[7:-3]
            
        import json
        options = json.loads(text)
        return {"options": options}
        
    except Exception as e:
        return {"error": str(e)}

def generate_cover_prompt_ai(project_path, product_name, image_filename=None):
    """
    Generates a DALL-E 3 prompt using Gemini, processing an optional image + text.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"error": "Gemini API Key missing"}
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-exp') # supports vision features
        
        inputs = []
        
        # 1. Text Prompt
        text_prompt = f"""
        Act as a professional creative director.
        Based on the product "{product_name}" and the attached image (if any), write a high-definition image generation prompt for DALL-E 3.
        
        Goal: Create a clean, aesthetic, and eye-catching video cover background (9:16 vertical ratio).
        Style: Commercial photography, high quality, soft lighting, minimalist but premium.
        
        Important:
        - The image should have some negative space (empty space) at the top or bottom for text overlay.
        - Describe lighting, textures, and composition.
        - Do NOT include text in the image itself.
        
        Return ONLY the prompt string in English. No other text.
        """
        inputs.append(text_prompt)
        
        # 2. Add Image if provided
        if image_filename:
            img_path = os.path.join(project_path, "input", image_filename)
            if os.path.exists(img_path):
                img = Image.open(img_path)
                inputs.append(img)
        
        # 3. Generate
        response = model.generate_content(inputs)
        generated_prompt = response.text.strip()
        
        return {"prompt": generated_prompt}
        
    except Exception as e:
        return {"error": str(e)}

def generate_cover_image_ai(project_path, prompt):
    """
    Generates a cover image using DALL-E 3.
    """
    # 1. Generate
    url, error = generate_dalle_image(prompt)
    if error:
        return {"error": error}
        
    # 2. Download to project
    try:
        resp = requests.get(url)
        if resp.status_code == 200:
            filename = f"ai_cover_{int(time.time())}.png"
            filepath = os.path.join(project_path, "input", filename)
            
            with open(filepath, 'wb') as f:
                f.write(resp.content)
                
            return {
                "success": True, 
                "filename": filename, 
                "url": f"/projects/{os.path.basename(project_path)}/input/{filename}" # Adjusted for API response
            }
    except Exception as e:
        return {"error": f"Failed to download generated image: {str(e)}"}
