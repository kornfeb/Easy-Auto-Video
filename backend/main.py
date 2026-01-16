import os
import json
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
    Lists image files in the project's input folder.
    Note: The input folder is assumed to be 'input' directly, or 'input/images' based on user prompt.
    User prompt said: /projects/{project_id}/input/images
    But initial script created: /projects/{project_id}/input
    I will look in both/recursively or just 'input' and filter images.
    """
    project_path = os.path.join(PROJECTS_DIR, project_id)
    # Check standard input path first
    # User requested /input/images specifically. 
    # But my init script only made /input. 
    # I will check /input/images first, if fail, try /input.
    
    target_dir = os.path.join(project_path, "input")
    # If user manually made an 'images' subfolder:
    if os.path.exists(os.path.join(target_dir, "images")):
         target_dir = os.path.join(target_dir, "images")
    
    if not os.path.exists(target_dir):
        return []
        
    assets = []
    valid_exts = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    
    for item in os.listdir(target_dir):
        if any(item.lower().endswith(ext) for ext in valid_exts):
             # Return relative path for StaticFiles usage
             # If target_dir was input/images, relative path is input/images/item
             rel_path = os.path.relpath(os.path.join(target_dir, item), project_path)
             assets.append({
                 "name": item,
                 "url": f"/media/{project_id}/{rel_path}"
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

class PipelineStepRequest(BaseModel):
    step_name: str

@app.post("/projects/{project_id}/run")
def run_pipeline_step(project_id: str, request: PipelineStepRequest):
    """
    Mock pipeline execution.
    1. Updates project.json pipeline status.
    2. Writes to log/pipeline.log.
    3. Returns updated status.
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
        
    # Mock Logic: Toggle status or Set to Completed
    # user said "Updates step status (mock only)"
    # I'll simply mark it as "completed" with a timestamp
    from datetime import datetime
    now = datetime.now().isoformat()
    
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
        
    log_file = os.path.join(log_dir, "pipeline.logs") # Using .logs to distinguish
    log_entry = f"[{now}] [INFO] JOB {request.step_name} started (MOCK)\n"
    log_entry += f"[{now}] [INFO] JOB {request.step_name} completed successfully.\n"
    
    with open(log_file, 'a') as f:
        f.write(log_entry)
        
    return {"message": f"Step {request.step_name} completed", "pipeline": data["pipeline"]}

class ProjectInitRequest(BaseModel):
    project_id: str

def initialize_project_structure(project_id: str) -> dict:
    """
    Creates folder structure under /projects/{project_id}
    Creates initial project.json with status = "initialized"
    
    Constraints:
    - Must be idempotent.
    - Must not overwrite existing data.
    """
    if not project_id or ".." in project_id or project_id.startswith("/"):
        raise ValueError("Invalid project_id")

    project_path = os.path.join(PROJECTS_DIR, project_id)
    project_json_path = os.path.join(project_path, "project.json")

    # Ensure main projects folder exists
    if not os.path.exists(PROJECTS_DIR):
        os.makedirs(PROJECTS_DIR, exist_ok=True)

    # 1. Create folder structure under /projects/{project_id} (Idempotent)
    if not os.path.exists(project_path):
        os.makedirs(project_path, exist_ok=True)

    # Create standard subfolders
    subfolders = ["input", "script", "audio", "video", "log"]
    for folder in subfolders:
        folder_path = os.path.join(project_path, folder)
        os.makedirs(folder_path, exist_ok=True)

    # 2. Create initial project.json (Idempotent: Only if not exists)
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
        result = initialize_project_structure(request.project_id)
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
                        # Validate minimum required fields or just pass through
                        projects.append({
                            "project_id": project_id,
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
