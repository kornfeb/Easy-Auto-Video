import os
import requests
import uuid
import json
from datetime import datetime
from core.config import PROJECTS_DIR
from core.logger import log_event
from core.state import set_done

# Global status tracker for background tasks
active_tasks = {}

def get_active_tasks():
    return active_tasks

def download_images_from_urls(project_id, urls):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    input_dir = os.path.join(project_path, "input")
    
    task_id = f"dl_{project_id}"
    active_tasks[task_id] = {
        "project_id": project_id,
        "total": len(urls),
        "completed": 0,
        "status": "downloading",
        "started_at": datetime.now().isoformat()
    }
    
    if not os.path.exists(project_path):
        active_tasks[task_id]["status"] = "failed"
        active_tasks[task_id]["error"] = "Project directory not found"
        return None
    
    results = []
    success_count = 0
    valid_exts = (".jpg", ".jpeg", ".png", ".webp")
    
    # Analyze existing files to determine starting index
    existing_files = os.listdir(input_dir)
    max_idx = 0
    for f in existing_files:
        name_part = os.path.splitext(f)[0]
        if name_part.isdigit():
            val = int(name_part)
            if val > max_idx:
                max_idx = val
                
    current_index = max_idx + 1

    for url in urls:
        url = url.strip()
        if not url: continue
        
        status = {"url": url, "success": False, "filename": None, "error": None}
        try:
            response = requests.get(url, timeout=10, stream=True)
            response.raise_for_status()
            
            # Use original extension or default to .jpg
            orig_filename = url.split("/")[-1].split("?")[0]
            _, ext = os.path.splitext(orig_filename)
            if not ext or ext.lower() not in valid_exts:
                ext = ".jpg"
            
            # Sequential Naming (1.jpg, 2.png, etc.)
            final_filename = f"{current_index}{ext}"
            
            # Ensure uniqueness (though unlikely with sequential logic unless race condition)
            while os.path.exists(os.path.join(input_dir, final_filename)):
                current_index += 1
                final_filename = f"{current_index}{ext}"

            target_path = os.path.join(input_dir, final_filename)
            with open(target_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            status["success"] = True
            status["filename"] = final_filename
            success_count += 1
            current_index += 1 # Increment for next file
            
            # Update background task tracker
            active_tasks[task_id]["completed"] = success_count
            
        except Exception as e:
            status["error"] = str(e)
            
        results.append(status)
        log_event(project_path, "upload-url.log", f"URL: {url} | Success: {status['success']} | File: {status['filename']} | Error: {status['error']}")

    active_tasks[task_id]["status"] = "completed"
    active_tasks[task_id]["finished_at"] = datetime.now().isoformat()

    if success_count > 0:
        set_done(project_path, "upload.done")
            
    return {"results": results, "success_count": success_count}

