import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")

if not os.path.exists(PROJECTS_DIR):
    os.makedirs(PROJECTS_DIR, exist_ok=True)
