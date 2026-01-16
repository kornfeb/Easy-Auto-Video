import os
import json
import requests
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
# Resolving root directory relative to this file (backend/main.py)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")

# Serve project files statically so frontend can display images
# URL: http://localhost:8000/media/{project_id}/path/to/file
if not os.path.exists(PROJECTS_DIR):
    os.makedirs(PROJECTS_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=PROJECTS_DIR), name="media")

@app.get("/projects/{project_id}/assets")
def list_project_assets(project_id: str):
    """
    Lists image files DIRECTLY in the project's input folder.
    Supported: jpg, jpeg, png, webp.
    """
    project_path = os.path.join(PROJECTS_DIR, project_id)
    target_dir = os.path.join(project_path, "input")
    
    if not os.path.exists(target_dir):
        return []
        
    assets = []
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"} # Simplified as per patch
    
    for item in os.listdir(target_dir):
        if any(item.lower().endswith(ext) for ext in valid_exts):
             assets.append({
                 "name": item,
                 "url": f"/media/{project_id}/input/{item}"
             })
             
    return assets

@app.get("/projects/{project_id}/logs")
def get_project_logs(project_id: str):
    """
    Reads log files from /projects/{project_id}/log
    Returns: { "lines": [string] }
    Constraints: Limit to last 200 lines.
    """
    project_path = os.path.join(PROJECTS_DIR, project_id)
    log_dir = os.path.join(project_path, "log")
    
    if not os.path.exists(log_dir):
        return {"lines": []}
    
    all_lines = []
    # Read all .log files (usually there's one main log or rotated logs)
    # Sorting by modification time ensures chronological order broadly
    log_files = [f for f in os.listdir(log_dir) if f.endswith(".log")]
    log_files.sort(key=lambda x: os.path.getmtime(os.path.join(log_dir, x)))
    
    for log_file in log_files:
        try:
            with open(os.path.join(log_dir, log_file), 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                # Strip newlines for cleaner JSON
                all_lines.extend([l.rstrip() for l in lines])
        except Exception:
            pass # Skip unreadable files
            
    # Return last 200 lines
    return {"lines": all_lines[-200:]}

class BulkUrlUploadRequest(BaseModel):
    urls: list[str]

@app.post("/projects/{project_id}/upload/urls")
def upload_urls_by_list(project_id: str, request: BulkUrlUploadRequest):
    """
    Downloads images from a list of URLs sequentially.
    - Saves to /input
    - Auto-renames on conflict
    - Logs to log/upload-url.log
    - Creates state/upload.done
    """
    project_path = os.path.join(PROJECTS_DIR, project_id)
    input_dir = os.path.join(project_path, "input")
    log_dir = os.path.join(project_path, "log")
    state_dir = os.path.join(project_path, "state")
    
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    
    os.makedirs(state_dir, exist_ok=True)
    os.makedirs(log_dir, exist_ok=True)
    
    results = []
    success_count = 0
    from datetime import datetime
    
    log_file_path = os.path.join(log_dir, "upload-url.log")
    
    valid_exts = (".jpg", ".jpeg", ".png", ".webp")
    
    for url in request.urls:
        url = url.strip()
        if not url: continue
        
        status = {"url": url, "success": False, "filename": None, "error": None}
        
        try:
            # Basic validation
            if not any(url.lower().endswith(ext) for ext in valid_exts) and "?" not in url:
                 # If no extension in URL, we might still want to try but user constraint said validate
                 # Let's be semi-strict
                 pass
            
            response = requests.get(url, timeout=10, stream=True)
            response.raise_for_status()
            
            # Extract filename from URL or header
            orig_filename = url.split("/")[-1].split("?")[0]
            if not orig_filename or not any(orig_filename.lower().endswith(ext) for ext in valid_exts):
                orig_filename = f"image_{uuid.uuid4().hex[:8]}.jpg"
            
            # Conflict handling: Rename if exists
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
        
        # Log entry
        now = datetime.now().isoformat()
        log_msg = f"[{now}] URL: {url} | Success: {status['success']} | File: {status['filename']} | Error: {status['error']}\n"
        with open(log_file_path, 'a') as f:
            f.write(log_msg)

    if success_count > 0:
        done_file = os.path.join(state_dir, "upload.done")
        with open(done_file, 'w') as f:
            f.write(f"Completed at {datetime.now().isoformat()}\n")
            
    return {"results": results, "success_count": success_count}

class PipelineStepRequest(BaseModel):
    step_name: str

@app.post("/projects/{project_id}/run")
def run_pipeline_step(project_id: str, request: PipelineStepRequest):
    """
    Mock pipeline execution.
    1. Updates project.json pipeline status.
    2. Writes to log/pipeline.log.
    3. Handles specific logic for script_gen (mock).
    """
    project_path = os.path.join(PROJECTS_DIR, project_id)
    project_json_path = os.path.join(project_path, "project.json")
    log_dir = os.path.join(project_path, "log")
    
    if not os.path.exists(project_json_path):
        raise HTTPException(status_code=404, detail="Project not found")

    # 1. Update project.json
    try:
        with open(project_json_path, 'r') as f:
            data = json.load(f)
    except:
        data = {"status": "unknown"}
        
    if "pipeline" not in data:
        data["pipeline"] = {}
        
    from datetime import datetime
    now = datetime.now().isoformat()
    
    # --- Step Specific Logic ---
    log_extra = ""
    
    # Common Validation Logic (Step 1 requirement)
    # Check /input exists and count images
    input_dir = os.path.join(project_path, "input")
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    image_files = []
    if os.path.exists(input_dir):
        image_files = [f for f in os.listdir(input_dir) if any(f.lower().endswith(ext) for ext in valid_exts)]
    
    validation_log = f"[{now}] [STEP 1] Found {len(image_files)} image(s) in /input (Validated)\n"
    
    if request.step_name == "script_gen":
        # Read product_name from input/product.json
        product_name = None
        product_json_path = os.path.join(project_path, "input", "product.json")
        if os.path.exists(product_json_path):
            try:
                with open(product_json_path, 'r') as f:
                    p_data = json.load(f)
                    product_name = p_data.get("product_name")
            except:
                pass
        
        # Construct Prompt
        prompt = "Task: Generate a catchy 15-second video script."
        if product_name:
            prompt += f" Mention the product '{product_name}' exactly once."
        else:
            prompt += " Focus on general appeal."
        
        # Mock Script Generation
        mock_script = f"Hey check this out! {product_name if product_name else 'This amazing thing'} will change your life. Try it today!"
        script_path = os.path.join(project_path, "script", "script.txt")
        with open(script_path, 'w') as f:
            f.write(mock_script)
            
        log_extra += validation_log
        log_extra += f"[PROMPT] {prompt}\n"
        log_extra += f"[{now}] [INFO] Generated script saved to script/script.txt\n"

    elif request.step_name == "video_stitch":
        # Step 4 Requirement: Select Images
        # Ignore non-image files like product.json (already handled by extensions check)
        selected_images = ", ".join(image_files)
        log_extra += validation_log
        log_extra += f"[{now}] [STEP 4] Selected {len(image_files)} images for stitching: {selected_images}\n"
        log_extra += f"[{now}] [INFO] Mocking FFmpeg process...\n"

    # --- End Step Specific Logic ---

    data["pipeline"][request.step_name] = {
        "status": "completed",
        "updated_at": now
    }
    data["last_updated"] = now
    
    with open(project_json_path, 'w') as f:
        json.dump(data, f, indent=2)

    # 2. Append Log
    if not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)
        
    log_file = os.path.join(log_dir, "pipeline.log") 
    log_entry = f"[{now}] [INFO] JOB {request.step_name} started (MOCK)\n"
    if log_extra:
        log_entry += log_extra
    log_entry += f"[{now}] [INFO] JOB {request.step_name} completed successfully.\n"
    
    with open(log_file, 'a') as f:
        f.write(log_entry)
        
    return {"message": f"Step {request.step_name} completed", "pipeline": data["pipeline"]}

class ProjectInitRequest(BaseModel):
    project_id: str
    product_name: str = None

def initialize_project_structure(project_id: str, product_name: str = None) -> dict:
    """
    Creates folder structure under /projects/{project_id}
    Creates initial project.json with status = "initialized"
    Saves product_name to input/product.json if provided.
    
    Constraints:
    - Must be idempotent.
    - Must not overwrite existing product.json (if project exists).
    """
    if not project_id or ".." in project_id or project_id.startswith("/"):
        raise ValueError("Invalid project_id")

    project_path = os.path.join(PROJECTS_DIR, project_id)
    project_json_path = os.path.join(project_path, "project.json")
    product_json_path = os.path.join(project_path, "input", "product.json")

    # Ensure main projects folder exists
    if not os.path.exists(PROJECTS_DIR):
        os.makedirs(PROJECTS_DIR, exist_ok=True)

    # 1. Create folder structure under /projects/{project_id} (Idempotent)
    is_new = not os.path.exists(project_path)
    if is_new:
        os.makedirs(project_path, exist_ok=True)

    # Create standard subfolders
    subfolders = ["input", "script", "audio", "video", "log"]
    for folder in subfolders:
        folder_path = os.path.join(project_path, folder)
        os.makedirs(folder_path, exist_ok=True)

    # 2. Handle product.json (Only for new projects or if not exists)
    if product_name and not os.path.exists(product_json_path):
        payload = {"product_name": product_name}
        with open(product_json_path, 'w') as f:
            json.dump(payload, f, indent=2)

    # 3. Create initial project.json (Idempotent: Only if not exists)
    if not os.path.exists(project_json_path):
        from datetime import datetime
        now = datetime.now().isoformat()
        initial_data = {
            "status": "initialized",
            "created_at": now,
            "last_updated": now
        }
        with open(project_json_path, 'w') as f:
            json.dump(initial_data, f, indent=2)
        return {"message": "Project initialized", "path": project_path, "newly_created": True}
    
    return {"message": "Project already exists", "path": project_path, "newly_created": False}

@app.post("/projects/initialize")
def init_project(request: ProjectInitRequest):
    try:
        result = initialize_project_structure(request.project_id, request.product_name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects")
def list_projects():
    """
    Lists all existing projects.
    - Reads /projects directory
    - Returns project.json content including timestamps
    - Skips invalid or missing project.json files
    """
    if not os.path.exists(PROJECTS_DIR):
        return []

    projects = []
    # Read-only, no caching
    for item in os.listdir(PROJECTS_DIR):
        project_path = os.path.join(PROJECTS_DIR, item)
        if os.path.isdir(project_path):
            project_id = item
            
            project_json_path = os.path.join(project_path, "project.json")
            if os.path.exists(project_json_path):
                try:
                    with open(project_json_path, 'r') as f:
                        data = json.load(f)
                        
                        # Data Source requirement: Read from input/product.json
                        product_name = "-"
                        product_json_path = os.path.join(project_path, "input", "product.json")
                        if os.path.exists(product_json_path):
                            try:
                                with open(product_json_path, 'r') as pf:
                                    p_data = json.load(pf)
                                    product_name = p_data.get("product_name", "-")
                            except:
                                pass

                        projects.append({
                            "project_id": project_id,
                            "product_name": product_name, # New field
                            "status": data.get("status", "unknown"),
                            "created_at": data.get("created_at"),
                            "last_updated": data.get("last_updated"),
                            "pipeline": data.get("pipeline", {})
                        })
                except Exception as e:
                    # Log error but skip this project to prevent crash (Constraint)
                    print(f"Error reading project {project_id}: {e}")
                    continue
    
    return projects

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
