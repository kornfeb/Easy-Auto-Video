import os
from datetime import datetime

def set_done(project_path, filename):
    state_dir = os.path.join(project_path, "state")
    os.makedirs(state_dir, exist_ok=True)
    done_file = os.path.join(state_dir, filename)
    with open(done_file, 'w') as f:
        f.write(f"Completed at {datetime.now().isoformat()}\n")
