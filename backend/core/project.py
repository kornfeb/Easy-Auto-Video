import os
import json
from datetime import datetime
from core.config import PROJECTS_DIR
from core.logger import log_event

def initialize_project_structure(project_id: str, product_name: str = None) -> dict:
    if not project_id or ".." in project_id or project_id.startswith("/"):
        raise ValueError("Invalid project_id")

    project_path = os.path.join(PROJECTS_DIR, project_id)
    project_json_path = os.path.join(project_path, "project.json")
    product_json_path = os.path.join(project_path, "input", "product.json")

    is_new = not os.path.exists(project_path)
    if is_new:
        os.makedirs(project_path, exist_ok=True)

    subfolders = ["input", "script", "audio", "video", "log"]
    for folder in subfolders:
        folder_path = os.path.join(project_path, folder)
        os.makedirs(folder_path, exist_ok=True)

    if product_name and not os.path.exists(product_json_path):
        payload = {"product_name": product_name}
        with open(product_json_path, 'w') as f:
            json.dump(payload, f, indent=2)

    if not os.path.exists(project_json_path):
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

def list_projects_metadata():
    if not os.path.exists(PROJECTS_DIR):
        return []

    projects = []
    for item in os.listdir(PROJECTS_DIR):
        project_path = os.path.join(PROJECTS_DIR, item)
        if os.path.isdir(project_path):
            project_json_path = os.path.join(project_path, "project.json")
            if os.path.exists(project_json_path):
                try:
                    with open(project_json_path, 'r') as f:
                        data = json.load(f)
                        
                        product_name = "-"
                        product_json_path = os.path.join(project_path, "input", "product.json")
                        if os.path.exists(product_json_path):
                            try:
                                with open(product_json_path, 'r') as pf:
                                    p_data = json.load(pf)
                                    product_name = p_data.get("product_name", "-")
                            except:
                                pass

                        config = {}
                        config_json_path = os.path.join(project_path, "input", "config.json")
                        if os.path.exists(config_json_path):
                            try:
                                with open(config_json_path, 'r') as cf:
                                    config = json.load(cf)
                            except:
                                pass

                        projects.append({
                            "project_id": item,
                            "product_name": product_name,
                            "status": data.get("status", "unknown"),
                            "created_at": data.get("created_at"),
                            "last_updated": data.get("last_updated"),
                            "pipeline": data.get("pipeline", {}),
                            "config": config
                        })
                except Exception as e:
                    print(f"Error reading project {item}: {e}")
                    continue
    return projects

def update_product_name(project_id, new_name):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    product_json_path = os.path.join(project_path, "input", "product.json")
    
    if not os.path.exists(project_path):
        return None
        
    os.makedirs(os.path.dirname(product_json_path), exist_ok=True)
    
    if os.path.exists(product_json_path):
        with open(product_json_path, 'r') as f:
            data = json.load(f)
    else:
        data = {}
        
    old_name = data.get("product_name", "N/A")
    data["product_name"] = new_name
    
    with open(product_json_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    log_event(project_path, "product-edit.log", f"Changed product_name from '{old_name}' to '{new_name}'")
    
    # Update last_updated in project.json
    project_json_path = os.path.join(project_path, "project.json")
    if os.path.exists(project_json_path):
        with open(project_json_path, 'r') as f:
            p_data = json.load(f)
        p_data["last_updated"] = datetime.now().isoformat()
        with open(project_json_path, 'w') as f:
            json.dump(p_data, f, indent=2)

    return new_name

def list_assets(project_id):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    target_dir = os.path.join(project_path, "input")
    if not os.path.exists(target_dir):
        return []
    assets = []
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    for item in os.listdir(target_dir):
        if any(item.lower().endswith(ext) for ext in valid_exts):
             assets.append({
                 "name": item,
                 "url": f"/media/{project_id}/input/{item}"
             })
    return assets

def get_project_logs(project_id):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    log_dir = os.path.join(project_path, "log")
    
    if not os.path.exists(log_dir):
        return {"lines": []}
    
    all_lines = []
    log_files = [f for f in os.listdir(log_dir) if f.endswith(".log")]
    log_files.sort(key=lambda x: os.path.getmtime(os.path.join(log_dir, x)))
    
    for log_file in log_files:
        try:
            with open(os.path.join(log_dir, log_file), 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                all_lines.extend([l.rstrip() for l in lines])
        except Exception:
            pass
            
    return {"lines": all_lines[-200:]}
