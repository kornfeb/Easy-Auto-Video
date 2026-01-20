import os

PROJECTS_DIR = "/Users/juang/Documents/Antigravity/Easy Auto Video/projects"
project_id = "test_project"
project_path = os.path.join(PROJECTS_DIR, project_id)
input_dir = os.path.join(project_path, "input")

test_cases = [
    "../cover.jpg",
    "image1.jpg",
    "my folder/image 2.png"
]

for raw_img_name in test_cases:
    if raw_img_name.startswith("../"):
        img_name = raw_img_name[3:]
        img_path = os.path.join(project_path, img_name)
        image_url = f"/media/{project_id}/{img_name}"
    else:
        img_name = raw_img_name
        img_path = os.path.join(input_dir, img_name)
        image_url = f"/media/{project_id}/input/{img_name}"
    
    print(f"RAW: {raw_img_name}")
    print(f"  img_name: {img_name}")
    print(f"  img_path: {img_path}")
    print(f"  image_url: {image_url}")
    print("-" * 20)
