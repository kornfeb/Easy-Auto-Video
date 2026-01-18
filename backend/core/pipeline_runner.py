import threading
import time
import json
import os
import traceback
from datetime import datetime
from core.step_registry import STEP_REGISTRY
from core.state import set_done
from core.logger import log_event
from core.errors import PipelineError

class PipelineRunner:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PipelineRunner, cls).__new__(cls)
            cls._instance.jobs = {} # project_id -> job_state
        return cls._instance

    def get_job(self, project_id):
        return self.jobs.get(project_id)

    def cancel_job(self, project_id):
        if project_id in self.jobs:
            self.jobs[project_id]['cancelled'] = True
            return True
        return False

    def start_job(self, project_id, project_path):
        # clean up old completed/failed job if exists
        if project_id in self.jobs:
            status = self.jobs[project_id]['status']
            if status == 'running':
                return False, "Job already running"
            
        self.jobs[project_id] = {
            'status': 'running',
            'current_step': None,
            'current_step_label': None,
            'progress': 0,
            'logs': [], # High level events
            'error': None,
            'start_time': datetime.now().isoformat(),
            'cancelled': False
        }

        thread = threading.Thread(target=self._run_pipeline, args=(project_id, project_path))
        thread.daemon = True
        thread.start()
        return True, "Job started"

    def _run_pipeline(self, project_id, project_path):
        job = self.jobs[project_id]
        
        # Load config for disabled steps
        disabled_steps = []
        config_path = os.path.join(project_path, "input", "config.json")
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    disabled_steps = config.get("disabled_steps", [])
            except:
                pass

        total_steps = len(STEP_REGISTRY)
        
        try:
            log_event(project_path, "pipeline.log", "[RUNNER] Starting async pipeline execution")
            job['logs'].append(f"[{datetime.now().strftime('%H:%M:%S')}] Pipeline started")

            for i, step in enumerate(STEP_REGISTRY):
                if job['cancelled']:
                    job['status'] = 'cancelled'
                    job['logs'].append(f"[{datetime.now().strftime('%H:%M:%S')}] Canceled by user")
                    log_event(project_path, "pipeline.log", "[RUNNER] Execution canceled by user")
                    return

                # Update State
                job['current_step'] = step.step_id
                job['current_step_label'] = step.label
                job['progress'] = int((i / total_steps) * 100)
                
                # Check disabled
                if step.step_id in disabled_steps:
                    job['logs'].append(f"[{datetime.now().strftime('%H:%M:%S')}] Skipped: {step.label} (Disabled)")
                    continue
                
                # Check completed
                # We check if it's already done to support "Resume" behavior
                if step.is_completed(project_path):
                    job['logs'].append(f"[{datetime.now().strftime('%H:%M:%S')}] Skipped: {step.label} (Already Done)")
                    continue

                # Run
                try:
                    job['logs'].append(f"[{datetime.now().strftime('%H:%M:%S')}] Running: {step.label}...")
                    
                    # Update project.json to indicate running (optional but good for persistence)
                    self._update_project_json(project_path, step.step_id, "running")

                    start_ts = time.time()
                    step.run(project_id, project_path)
                    duration = time.time() - start_ts
                    
                    set_done(project_path, f"{step.step_id}.done")
                    
                    self._update_project_json(project_path, step.step_id, "completed")
                    job['logs'].append(f"[{datetime.now().strftime('%H:%M:%S')}] Completed: {step.label} ({duration:.1f}s)")
                    
                except PipelineError as e:
                    job['status'] = 'failed'
                    job['error'] = f"{step.label} Failed: {e.message}"
                    # Add more detail if available
                    if e.detail:
                        job['error'] += f" ({e.detail})"
                        
                    job['logs'].append(f"[{datetime.now().strftime('%H:%M:%S')}] FAILED: {step.label} - {e.message}")
                    
                    self._update_project_json(project_path, step.step_id, "failed", error=e.to_dict())
                    log_event(project_path, "pipeline.log", f"[RUNNER] Step {step.step_id} failed: {e.message}")
                    return

                except Exception as e:
                    job['status'] = 'failed'
                    job['error'] = f"{step.label} Unexpected Error: {str(e)}"
                    job['logs'].append(f"[{datetime.now().strftime('%H:%M:%S')}] ERROR: {step.label} - {str(e)}")
                    
                    self._update_project_json(project_path, step.step_id, "failed", error={"code": "UNKNOWN", "message": str(e)})
                    log_event(project_path, "pipeline.log", f"[RUNNER] Step {step.step_id} exception: {traceback.format_exc()}")
                    return

            if job['status'] != 'failed':
                job['status'] = 'completed'
                job['progress'] = 100
                job['current_step'] = None
                job['logs'].append(f"[{datetime.now().strftime('%H:%M:%S')}] Pipeline Finished Successfully")
                log_event(project_path, "pipeline.log", "[RUNNER] Pipeline finished successfully")

        except Exception as e:
             job['status'] = 'failed'
             job['error'] = f"Runner System Error: {str(e)}"
             log_event(project_path, "pipeline.log", f"[RUNNER] Top level exception: {traceback.format_exc()}")

    def _update_project_json(self, project_path, step_id, status, error=None):
        try:
            json_path = os.path.join(project_path, "project.json")
            if os.path.exists(json_path):
                with open(json_path, 'r') as f:
                    data = json.load(f)
                
                if "pipeline" not in data: data["pipeline"] = {}
                
                now = datetime.now().isoformat()
                data["pipeline"][step_id] = {
                    "status": status,
                    "updated_at": now,
                    "error": error
                }
                data["last_updated"] = now
                
                with open(json_path, 'w') as f:
                    json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Failed to update project.json: {e}")
