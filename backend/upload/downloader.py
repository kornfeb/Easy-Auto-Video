import os
import requests
import uuid
import json
from datetime import datetime
from core.config import PROJECTS_DIR
from core.logger import log_event
from core.state import set_done

def download_images_from_urls(project_id, urls):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    input_dir = os.path.join(project_path, "input")
    
    if not os.path.exists(project_path):
        return None
    
    results = []
    success_count = 0
    valid_exts = (".jpg", ".jpeg", ".png", ".webp")
    
    for url in urls:
        url = url.strip()
        if not url: continue
        
        status = {"url": url, "success": False, "filename": None, "error": None}
        try:
            response = requests.get(url, timeout=10, stream=True)
            response.raise_for_status()
            
            orig_filename = url.split("/")[-1].split("?")[0]
            if not orig_filename or not any(orig_filename.lower().endswith(ext) for ext in valid_exts):
                orig_filename = f"image_{uuid.uuid4().hex[:8]}.jpg"
            
            base, ext = os.path.splitext(orig_filename)
            final_filename = orig_filename
            counter = 1
            while os.path.exists(os.path.join(input_dir, final_filename)):
                final_filename = f"{base}_{counter}{ext}"
                counter += 1
            
            target_path = os.path.join(input_dir, final_filename)
            with open(target_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            status["success"] = True
            status["filename"] = final_filename
            success_count += 1
        except Exception as e:
            status["error"] = str(e)
            
        results.append(status)
        log_event(project_path, "upload-url.log", f"URL: {url} | Success: {status['success']} | File: {status['filename']} | Error: {status['error']}")

    if success_count > 0:
        set_done(project_path, "upload.done")
            
    return {"results": results, "success_count": success_count}
