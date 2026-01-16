import os
import sys
# Ensure core is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.utils.video_renderer import render_video

project_path = "/Users/juang/Documents/Antigravity/Easy Auto Video/projects/Shopee-3"
print(f"Testing render for {project_path}")

try:
    result = render_video(project_path)
    print("Result:", result)
except Exception as e:
    import traceback
    traceback.print_exc()
