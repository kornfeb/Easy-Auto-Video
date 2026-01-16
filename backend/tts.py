import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_tts_job(script: str) -> bool:
    """
    Processes a TTS job for the given script.
    
    Constraints:
    - If script is empty, skip and log warning (Bug fix).
    """
    if not script or not script.strip():
        logger.warning("TTS job skipped: Script is empty.")
        return False

    # Placeholder for actual TTS logic
    logger.info(f"Processing TTS for script length: {len(script)}")
    return True
