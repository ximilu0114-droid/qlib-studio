import os
import signal
import subprocess
import threading
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import PROJECT_ROOT, STORAGE_DIR, WORKFLOWS_DIR
from app.db.database import SessionLocal
from app.db.models import Job

LOGS_DIR = STORAGE_DIR / "logs" / "jobs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
BACKEND_DIR = PROJECT_ROOT / "backend"


def is_process_running(pid: int) -> bool:
    """Check if a process is still running."""
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def resolve_saved_workflow(workflow_name: str) -> Path:
    """Resolve a user workflow reference to storage/workflows only."""
    raw_name = workflow_name.strip()
    if not raw_name:
        raise ValueError("Workflow name is required")

    raw_path = Path(raw_name)
    if ".." in raw_path.parts:
        raise ValueError("Workflow path traversal is not allowed")

    if raw_path.is_absolute():
        candidate = raw_path
    elif len(raw_path.parts) == 1:
        candidate = WORKFLOWS_DIR / raw_path
    elif raw_path.parts[:2] == ("storage", "workflows"):
        candidate = PROJECT_ROOT / raw_path
    else:
        raise ValueError("Workflow must be a saved workflow filename from storage/workflows")

    if candidate.suffix not in {".yaml", ".yml"}:
        raise ValueError("Only .yaml and .yml workflow files are allowed")

    workflows_dir = WORKFLOWS_DIR.resolve()
    resolved = candidate.resolve()
    if not _is_relative_to(resolved, workflows_dir):
        raise ValueError("Workflow path must stay inside storage/workflows")

    if not resolved.is_file():
        raise ValueError(f"Saved workflow not found: {raw_path.name}")

    return resolved


def resolve_working_dir(working_dir: str) -> Path:
    """Resolve cwd to a small set of safe local directories."""
    raw_dir = working_dir.strip() if working_dir else "."
    project_root = PROJECT_ROOT.resolve()
    backend_dir = BACKEND_DIR.resolve()
    safe_dirs = {project_root, backend_dir}

    configured = os.environ.get("QLIB_STUDIO_SAFE_WORKING_DIR")
    if configured:
        safe_dirs.add(Path(configured).expanduser().resolve())

    raw_path = Path(raw_dir).expanduser()
    if ".." in raw_path.parts:
        raise ValueError("Working directory path traversal is not allowed")

    if raw_dir == ".":
        resolved = project_root
    elif raw_path.is_absolute():
        resolved = raw_path.resolve()
    else:
        resolved = (project_root / raw_path).resolve()

    if not resolved.is_dir():
        raise ValueError(f"Working directory does not exist: {raw_dir}")

    if resolved not in safe_dirs:
        raise ValueError("Working directory must be '.', project root, backend, or QLIB_STUDIO_SAFE_WORKING_DIR")

    return resolved


def _monitor_job(job_id: int, process: subprocess.Popen, log_file):
    """Background thread to monitor job completion."""
    try:
        process.wait()
    finally:
        log_file.close()

    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        if job.status == "cancelled":
            return

        job.exit_code = process.returncode
        job.finished_at = datetime.now()

        if process.returncode == 0:
            job.status = "success"
        else:
            job.status = "failed"

        db.commit()
    finally:
        db.close()


def start_qrun_job(db: Session, workflow_name: str, working_dir: str = ".") -> Job:
    """Start a qrun job and return immediately."""
    workflow_path = resolve_saved_workflow(workflow_name)
    run_dir = resolve_working_dir(working_dir)

    job = Job(
        name=f"qrun: {Path(workflow_path).stem}",
        type="qrun",
        workflow_path=str(workflow_path),
        working_dir=str(run_dir),
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    log_path = LOGS_DIR / f"{job.id}.log"
    job.log_path = str(log_path)
    db.commit()

    log_file = open(log_path, "w")

    try:
        process = subprocess.Popen(
            ["qrun", str(workflow_path)],
            stdout=log_file,
            stderr=subprocess.STDOUT,
            cwd=run_dir,
            start_new_session=True,
        )

        job.pid = process.pid
        job.status = "running"
        job.started_at = datetime.now()
        db.commit()

        monitor_thread = threading.Thread(
            target=_monitor_job,
            args=(job.id, process, log_file),
            daemon=True,
        )
        monitor_thread.start()

    except FileNotFoundError:
        job.status = "failed"
        job.finished_at = datetime.now()
        job.exit_code = -1
        error_msg = "Error: 'qrun' command not found. Make sure qlib is installed.\n"
        log_file.write(error_msg)
        log_file.close()
        db.commit()
    except Exception:
        job.status = "failed"
        job.finished_at = datetime.now()
        job.exit_code = -1
        log_file.close()
        db.commit()
        raise

    return job


def list_jobs(db: Session) -> list[Job]:
    """List all jobs ordered by newest first."""
    return db.query(Job).order_by(Job.created_at.desc()).all()


def get_job(db: Session, job_id: int) -> Job:
    """Get a job by ID."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError(f"Job not found: {job_id}")
    return job


def get_job_logs(job_id: int) -> str:
    """Get the logs for a job."""
    log_path = LOGS_DIR / f"{job_id}.log"
    if not log_path.exists():
        return ""
    return log_path.read_text()


def cancel_job(db: Session, job_id: int) -> Job:
    """Cancel a running job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError(f"Job not found: {job_id}")

    if job.status != "running":
        raise ValueError(f"Job is not running: {job.status}")

    job.status = "cancelled"
    job.finished_at = datetime.now()
    job.exit_code = -signal.SIGTERM
    db.commit()

    if job.pid and is_process_running(job.pid):
        try:
            os.killpg(os.getpgid(job.pid), signal.SIGTERM)
        except OSError:
            pass

    log_path = LOGS_DIR / f"{job_id}.log"
    if log_path.exists():
        with open(log_path, "a") as f:
            f.write("\n[Job cancelled by user: process group terminated]\n")

    return job
