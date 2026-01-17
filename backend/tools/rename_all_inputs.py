import os
import shutil
import uuid

# Define projects dir path manually to be safe or import if possible. 
# Based on previous file view:
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")

VALID_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

def rename_inputs_sequentially():
    if not os.path.exists(PROJECTS_DIR):
        print(f"Projects directory not found at: {PROJECTS_DIR}")
        return

    projects = [d for d in os.listdir(PROJECTS_DIR) if os.path.isdir(os.path.join(PROJECTS_DIR, d))]
    print(f"Found {len(projects)} projects.")

    for project in projects:
        input_dir = os.path.join(PROJECTS_DIR, project, "input")
        if not os.path.exists(input_dir):
            continue

        print(f"Processing project: {project}")
        
        # 1. Collect all valid images
        images = []
        for f in os.listdir(input_dir):
            ext = os.path.splitext(f)[1].lower()
            if ext in VALID_EXTS:
                images.append(f)
        
        # Sort to maintain some deterministic order (alphabetical)
        images.sort()
        
        if not images:
            print("  No images found.")
            continue

        # 2. Rename to temporary random names to avoid collision
        # (e.g. strict swap 1.jpg -> 2.jpg where 2.jpg exists)
        temp_map = []
        for img in images:
            old_path = os.path.join(input_dir, img)
            ext = os.path.splitext(img)[1].lower()
            temp_name = f"temp_{uuid.uuid4().hex}{ext}"
            temp_path = os.path.join(input_dir, temp_name)
            
            os.rename(old_path, temp_path)
            temp_map.append(temp_path)
            
        # 3. Rename from temp to sequential numbers
        count = 0
        for i, temp_path in enumerate(temp_map):
            ext = os.path.splitext(temp_path)[1].lower()
            new_name = f"{i+1}{ext}"
            new_path = os.path.join(input_dir, new_name)
            
            os.rename(temp_path, new_path)
            count += 1
            
        print(f"  Renamed {count} images sequentially.")

if __name__ == "__main__":
    rename_inputs_sequentially()
