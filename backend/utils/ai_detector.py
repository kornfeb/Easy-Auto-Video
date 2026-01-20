import os
import base64
import json
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}"

def detect_roi(image_path):
    """
    Uses Gemini Vision to detect the primary subject (product, face, object) in an image.
    Returns: { "roi": { "x": 0, "y": 0, "w": 0, "h": 0 }, "type": "product|face|object|none" }
    Coordinates are normalized (0-1000).
    """
    if not API_KEY:
        print("AI Smart Crop: No GEMINI_API_KEY found. Falling back to center.")
        return None

    try:
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")

        prompt = """
        Analyze this image and identify the most important subject (product, face, or primary object).
        Return purely a JSON object with the bounding box of the subject.
        Use normalized coordinates (0 to 1000).
        Format: { "roi": { "ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000 }, "type": "product|face|object", "confidence": 0.9 }
        If multiple subjects exist, prioritize the one that represents the 'product' or main 'person'.
        If no clear subject, return { "roi": null, "type": "none" }.
        Return ONLY the JSON. No markdown.
        """

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_data
                        }
                    }
                ]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
            }
        }

        response = requests.post(API_URL, json=payload, timeout=15)
        response.raise_for_status()
        
        result = response.json()
        content = result['candidates'][0]['content']['parts'][0]['text']
        data = json.loads(content)
        
        return data
    except Exception as e:
        print(f"AI Detection failed: {e}")
        return None
