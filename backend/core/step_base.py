from abc import ABC, abstractmethod
import os

class PipelineStep(ABC):
    def __init__(self, step_id: str, label: str):
        self.step_id = step_id
        self.label = label

    @abstractmethod
    def run(self, project_id: str, project_path: str) -> bool:
        pass

    def is_completed(self, project_path: str) -> bool:
        # Check if step_name.done exists in state/
        done_file = os.path.join(project_path, "state", f"{self.step_id}.done")
        return os.path.exists(done_file)
