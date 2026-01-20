import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

def check_tts_header():
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"), http_options={'api_version': 'v1alpha'})
    model_id = 'gemini-2.5-flash-preview-tts'
    
    response = client.models.generate_content(
        model=model_id,
        contents='Test',
        config=types.GenerateContentConfig(
            response_modalities=['AUDIO'],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name='Puck'
                    )
                )
            )
        )
    )
    
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            data = part.inline_data.data
            header = data[:4]
            print(f"First 4 bytes: {header}")
            print(f"Mime type according to response: {part.inline_data.mime_type}")
            return

if __name__ == "__main__":
    check_tts_header()
