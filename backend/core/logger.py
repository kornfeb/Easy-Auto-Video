import os
from datetime import datetime

def log_event(project_path, filename, message):
    log_dir = os.path.join(project_path, "log")
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, filename)
    now = datetime.now().isoformat()
    with open(log_file, 'a') as f:
        f.write(f"[{now}] {message}\n")
