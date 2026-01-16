from .plugin_loader import load_plugins

# Dynamically load all steps from the steps/ directory
STEP_REGISTRY = load_plugins()

def get_step(step_id: str):
    for step in STEP_REGISTRY:
        if step.step_id == step_id:
            return step
    return None
