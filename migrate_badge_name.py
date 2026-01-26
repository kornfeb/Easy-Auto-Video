import os
import json

PROJECTS_DIR = "/Users/juang/Documents/Antigravity/Easy Auto Video/projects"

def migrate():
    if not os.path.exists(PROJECTS_DIR):
        print("Projects directory not found.")
        return

    for item in os.listdir(PROJECTS_DIR):
        project_path = os.path.join(PROJECTS_DIR, item)
        if not os.path.isdir(project_path):
            continue

        # 1. Migrate project.json
        project_json_path = os.path.join(project_path, "project.json")
        if os.path.exists(project_json_path):
            try:
                with open(project_json_path, 'r') as f:
                    data = json.load(f)
                
                if "bash_name" in data:
                    data["badge_name"] = data.pop("bash_name")
                    with open(project_json_path, 'w') as f:
                        json.dump(data, f, indent=2)
                    print(f"Updated project.json for {item}")
            except Exception as e:
                print(f"Error migrating project.json for {item}: {e}")

        # 2. Migrate input/product.json
        product_json_path = os.path.join(project_path, "input", "product.json")
        if os.path.exists(product_json_path):
            try:
                with open(product_json_path, 'r') as f:
                    data = json.load(f)
                
                if "bash_name" in data:
                    data["badge_name"] = data.pop("bash_name")
                    with open(product_json_path, 'w') as f:
                        json.dump(data, f, indent=2)
                    print(f"Updated product.json for {item}")
            except Exception as e:
                print(f"Error migrating product.json for {item}: {e}")

if __name__ == "__main__":
    migrate()
