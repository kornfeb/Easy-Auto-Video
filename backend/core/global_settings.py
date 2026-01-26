import os
import json
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "settings.json")

# --- Schemas ---

class VideoSettings(BaseModel):
    default_duration_sec: float = Field(20.0, description="Default video duration in seconds")
    intro_silence_sec: float = Field(1.5, description="Silence duration before intro speech")
    outro_silence_sec: float = Field(1.5, description="Silence duration after outro speech")

class ScriptSettings(BaseModel):
    prompt_template: str = Field(
        """คุณเป็นนักเขียนบทโฆษณามืออาชีพ งานของคุณคือเขียนบทวิดีโอรีวิวสินค้า สำหรับสินค้าชื่อ: {{product_name}}

ใช้โครงสร้างตาม Template นี้:
HOOK: [ประโยคเปิดตัว]
BENEFIT 1: [จุดเด่นที่ 1]
BENEFIT 2: [จุดเด่นที่ 2]
CTA: [คำเชิญชวน]

เงื่อนไขเคร่งครัด:
- ใช้ภาษาไทยที่เป็นธรรมชาติ สไตล์เป็นกันเอง
- ความยาวรวมทั้งหมดประมาณ {{word_count}} คำ
- ห้ามใส่ Emoji และห้ามใส่หัวข้อ (เช่น HOOK:) ส่งเฉพาะตัวบทพูด
- ใช้ประโยคสั้นๆ กระชับ""", 
        description="Prompt template for script generation"
    )
    target_word_count: int = Field(40, description="Target word count for the script")

class HookSettings(BaseModel):
    title_prompt_template: str = Field("Generate a short catchy product title", description="Prompt for generating title/hook")
    max_words: int = Field(6, description="Maximum words for the hook")
    max_characters: int = Field(30, description="Maximum characters for the hook")

class TextOverlaySettings(BaseModel):
    title_max_characters: int = Field(30, description="Max chars for title overlay")
    subtitle_max_characters: int = Field(60, description="Max chars for subtitle overlay")
    max_lines: int = Field(2, description="Max lines for overlay text")

class MusicSettings(BaseModel):
    default_music_file: str = Field("carefree.mp3", description="Default background music file for new projects")
    default_volume_db: int = Field(-16, description="Default music volume in dB")

class VoiceSettings(BaseModel):
    default_voice_profile: str = Field("random", description="Default voice profile ID for TTS generation (use 'random' for random selection)")

class CoverDefaults(BaseModel):
    default_color: str = Field("#FFFFFF", description="Default text color")
    default_background: str = Field("gradient", description="Default background style (none, box, gradient)")
    default_position: str = Field("center", description="Default position (top, center, bottom)")

class GlobalSettings(BaseModel):
    video: VideoSettings = Field(default_factory=VideoSettings)
    script: ScriptSettings = Field(default_factory=ScriptSettings)
    hook: HookSettings = Field(default_factory=HookSettings)
    text_overlay: TextOverlaySettings = Field(default_factory=TextOverlaySettings)
    music: MusicSettings = Field(default_factory=MusicSettings)
    voice: VoiceSettings = Field(default_factory=VoiceSettings)
    cover: CoverDefaults = Field(default_factory=CoverDefaults)

# --- Manager ---

class SettingsManager:
    def __init__(self, filepath: str = SETTINGS_FILE):
        self.filepath = filepath
        self._settings: GlobalSettings = self._load()

    def _load(self) -> GlobalSettings:
        if not os.path.exists(self.filepath):
            return GlobalSettings()
        
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Pydantic V2 support
            if hasattr(GlobalSettings, 'model_validate'):
                return GlobalSettings.model_validate(data)
            # Pydantic V1 fallback
            return GlobalSettings.parse_obj(data)
        except Exception as e:
            print(f"Error loading settings, using defaults: {e}")
            return GlobalSettings()

    def save(self, new_settings: GlobalSettings):
        # Pydantic V2 support
        if hasattr(new_settings, 'model_dump_json'):
            content = new_settings.model_dump_json(indent=2)
        else:
            # Pydantic V1 fallback
            content = new_settings.json(indent=2)
            
        with open(self.filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        self._settings = new_settings

    def get(self) -> GlobalSettings:
        return self._settings

    def update(self, update_data: Dict[str, Any]) -> GlobalSettings:
        # Pydantic's copy(update=...) is shallow, sticking to dict merge or parse_obj is safer for nested
        current_dict = self._settings.dict()
        
        # Deep merge/update logic (simplified using pydantic parsing)
        # Note: This simple approach assumes update_data matches the structure
        # A proper deep merge might be needed if partial updates are sent for nested fields
        # efficiently. For now, let's assume complete objects or use parse_obj on merged dict.
        
        # Helper for recursive merge could be here, but let's assume Clients send full sections or we patch carefully.
        # Actually, let's just patch the dict and re-validate.
        
        def deep_update(d, u):
            for k, v in u.items():
                if isinstance(v, dict):
                    d[k] = deep_update(d.get(k, {}), v)
                else:
                    d[k] = v
            return d

        updated_dict = deep_update(current_dict, update_data)
        new_settings = GlobalSettings.parse_obj(updated_dict)
        self.save(new_settings)
        return new_settings

# Singleton Instance
settings_manager = SettingsManager()

def get_settings() -> GlobalSettings:
    return settings_manager.get()
