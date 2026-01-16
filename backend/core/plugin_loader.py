import os
import importlib
import inspect
from .step_base import PipelineStep

def load_plugins():
    steps_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "steps")
    logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir, exist_ok=True)
    
    log_file = os.path.join(logs_dir, "plugin-load.log")
    
    discovered_steps = []
    seen_ids = set()

    # Iterate through files in steps directory
    for filename in os.listdir(steps_dir):
        if filename.endswith(".py") and not filename.startswith("__"):
            module_name = f"steps.{filename[:-3]}"
            try:
                module = importlib.import_module(module_name)
                # Find all classes that inherit from PipelineStep and are not PipelineStep itself
                for name, obj in inspect.getmembers(module, inspect.isclass):
                    if issubclass(obj, PipelineStep) and obj is not PipelineStep:
                        # Ensure the class is defined in THIS module, not imported
                        if obj.__module__ != module_name:
                            continue
                            
                        try:
                            instance = obj()
                            if instance.step_id in seen_ids:
                                with open(log_file, "a") as f:
                                    f.write(f"Duplicate step_id detected: {instance.step_id} in {module_name}\n")
                                continue
                            
                            discovered_steps.append(instance)
                            seen_ids.add(instance.step_id)
                        except Exception as e:
                            with open(log_file, "a") as f:
                                f.write(f"Error instantiating step from {module_name}: {str(e)}\n")
            except Exception as e:
                with open(log_file, "a") as f:
                    f.write(f"Error loading module {module_name}: {str(e)}\n")

    # Sort steps by step_id (or you might prefer a numeric prefix if we had one, 
    # but the task says sort by step_id)
    discovered_steps.sort(key=lambda x: x.step_id)
    return discovered_steps
