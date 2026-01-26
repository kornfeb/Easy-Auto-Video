from fastapi import APIRouter, HTTPException, Body
from core.global_settings import settings_manager, GlobalSettings

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=GlobalSettings)
def get_all_settings():
    """Retrieve current global settings."""
    return settings_manager.get()

@router.put("", response_model=GlobalSettings)
def update_global_settings(settings: GlobalSettings):
    """
    Update global settings. 
    Validation is handled by Pydantic. 
    This creates/overwrites the settings.json file.
    """
    try:
        settings_manager.save(settings)
        return settings_manager.get()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")

@router.get("/schema")
def get_settings_schema():
    """Return the JSON schema for settings configuration."""
    return GlobalSettings.schema()
