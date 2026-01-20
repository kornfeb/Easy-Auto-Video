import os
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Available Gemini TTS Voices (Prebuilt)
# These were fetched from the latest documentation/discovery
GEMINI_VOICES = [
    {"id": "Puck", "name": "Puck (Energetic)", "gender": "male"},
    {"id": "Charon", "name": "Charon (Deep)", "gender": "male"},
    {"id": "Zephyr", "name": "Zephyr (Natural)", "gender": "female"},
    {"id": "Aoede", "name": "Aoede (Clear)", "gender": "female"},
    {"id": "Achernar", "name": "Achernar", "gender": "neutral"},
    {"id": "Achird", "name": "Achird", "gender": "neutral"},
    {"id": "Algenib", "name": "Algenib", "gender": "neutral"},
    {"id": "Algieba", "name": "Algieba", "gender": "neutral"},
    {"id": "Alnilam", "name": "Alnilam", "gender": "neutral"},
    {"id": "Autonoe", "name": "Autonoe", "gender": "neutral"},
    {"id": "Callirrhoe", "name": "Callirrhoe", "gender": "neutral"},
    {"id": "Despina", "name": "Despina", "gender": "neutral"},
    {"id": "Enceladus", "name": "Enceladus", "gender": "neutral"},
    {"id": "Erinome", "name": "Erinome", "gender": "neutral"},
    {"id": "Fenrir", "name": "Fenrir", "gender": "neutral"},
    {"id": "Gacrux", "name": "Gacrux", "gender": "neutral"},
    {"id": "Iapetus", "name": "Iapetus", "gender": "neutral"},
    {"id": "Kore", "name": "Kore", "gender": "neutral"},
    {"id": "Laomedeia", "name": "Laomedeia", "gender": "neutral"},
    {"id": "Leda", "name": "Leda", "gender": "neutral"},
    {"id": "Orus", "name": "Orus", "gender": "neutral"},
    {"id": "Pulcherrima", "name": "Pulcherrima", "gender": "neutral"},
    {"id": "Rasalgethi", "name": "Rasalgethi", "gender": "neutral"},
    {"id": "Sadachbia", "name": "Sadachbia", "gender": "neutral"},
    {"id": "Sadaltager", "name": "Sadaltager", "gender": "neutral"},
    {"id": "Schedar", "name": "Schedar", "gender": "neutral"},
    {"id": "Sulafat", "name": "Sulafat", "gender": "neutral"},
    {"id": "Umbriel", "name": "Umbriel", "gender": "neutral"},
    {"id": "Vindemiatrix", "name": "Vindemiatrix", "gender": "neutral"},
    {"id": "Zubenelgenubi", "name": "Zubenelgenubi", "gender": "neutral"}
]

def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return None
    # Using v1alpha for latest TTS features compatibility
    return genai.Client(api_key=api_key, http_options={'api_version': 'v1alpha'})

def generate_gemini_tts(text: str, voice_name: str = "Puck", style_instructions: str = ""):
    """
    Generates audio using Gemini Text-to-Speech.
    
    Args:
        text: The text to convert to speech.
        voice_name: The name of the prebuilt voice to use.
        style_instructions: Natural language instructions for style, tone, etc.
    
    Returns:
        bytes: The generated audio data (WAV format).
    """
    client = get_gemini_client()
    if not client:
        raise ValueError("Google API Key missing or client initialization failed")

    # Combine text with style instructions if provided
    # Gemini TTS can interpret instructions directly in the prompt or via model system instructions
    # For simplicity and effectiveness, we can prepend the style to the text or rely on speech_config
    
    # In some versions, style is passed via the prompt itself or a specific system instruction.
    # We will use the 'contents' as a prompt that describes exactly what to say AND how.
    
    prompt = f"Speak the following text. Style: {style_instructions}\n\nText: {text}" if style_instructions else text

    response = client.models.generate_content(
        model='gemini-2.5-flash-preview-tts',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=['AUDIO'],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice_name
                    )
                )
            )
        )
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data:
            pcm_data = part.inline_data.data
            
            # Gemini returns raw L16 PCM (24kHz). Browsers need a WAV header.
            import io
            import wave
            with io.BytesIO() as wav_io:
                with wave.open(wav_io, 'wb') as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2) # 16-bit
                    wav_file.setframerate(24000)
                    wav_file.writeframes(pcm_data)
                return wav_io.getvalue()
            
    raise Exception("No audio data returned from Gemini API")
