import os
import re
import signal
import subprocess
import threading
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import PROJECT_ROOT, RDAGENT_LOGS_DIR
from app.db.database import SessionLocal
from app.db.models import Job

VALID_SCENARIOS = {"fin_factor", "fin_model", "fin_quant", "fin_factor_report"}

SCENARIO_DESCRIPTIONS = {
    "fin_factor": "Iterative Factor Evolution",
    "fin_model": "Iterative Model Evolution",
    "fin_quant": "Joint Factor & Model Evolution",
    "fin_factor_report": "Factor Extraction from Reports",
}

_SAFE_WORKING_DIRS = {
    PROJECT_ROOT.resolve(),
    (PROJECT_ROOT / "backend").resolve(),
}

_configured = os.environ.get("QLIB_STUDIO_SAFE_WORKING_DIR")
if _configured:
    _SAFE_WORKING_DIRS.add(Path(_configured).expanduser().resolve())

_DANGEROUS_ENV_KEYS = {
    "PATH",
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "DYLD_INSERT_LIBRARIES",
    "DYLD_LIBRARY_PATH",
    "PYTHONPATH",
    "PYTHONHOME",
    "SHELL",
    "BASH_ENV",
    "ENV",
    "CDPATH",
    "IFS",
    "PROMPT_COMMAND",
    "HOME",
    "USER",
    "LOGNAME",
    "TMPDIR",
    "TEMP",
    "TMP",
}

_SHELL_META_PATTERN = re.compile(r"[;&|`$(){}!<>\\]")


def _is_process_running(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _resolve_working_dir(working_dir: str) -> Path:
    """Resolve and validate working directory against an allow-list."""
    raw = working_dir.strip() or "."
    if ".." in Path(raw).parts:
        raise ValueError("Working directory path traversal is not allowed")

    if raw == ".":
        resolved = PROJECT_ROOT.resolve()
    else:
        candidate = Path(raw).expanduser()
        if candidate.is_absolute():
            resolved = candidate.resolve()
        else:
            resolved = (PROJECT_ROOT / candidate).resolve()

    if not resolved.is_dir():
        raise ValueError(f"Working directory does not exist: {working_dir}")

    if resolved not in _SAFE_WORKING_DIRS:
        raise ValueError(
            "Working directory must be '.', project root, backend, "
            "or QLIB_STUDIO_SAFE_WORKING_DIR"
        )

    return resolved


def _validate_extra_args(args: list[str]) -> list[str]:
    """Validate extra args — block shell metacharacters and empty strings."""
    validated: list[str] = []
    for arg in args:
        stripped = arg.strip()
        if not stripped:
            continue
        if _SHELL_META_PATTERN.search(stripped):
            raise ValueError(
                f"Argument contains disallowed characters: {stripped!r}. "
                "Shell metacharacters (;&|`$(){} etc.) are not permitted."
            )
        validated.append(stripped)
    return validated


def _validate_env_vars(env_vars: dict[str, str]) -> dict[str, str]:
    """Validate env var keys — block dangerous overrides and key injection."""
    validated: dict[str, str] = {}
    for key, value in env_vars.items():
        clean_key = key.strip()
        if not clean_key:
            continue
        if "=" in clean_key or "\n" in clean_key or "\0" in clean_key:
            raise ValueError(f"Invalid environment variable name: {clean_key!r}")
        if clean_key.upper() in _DANGEROUS_ENV_KEYS:
            raise ValueError(
                f"Environment variable {clean_key!r} is not allowed to be overridden."
            )
        if "\0" in value or "\n" in value:
            raise ValueError(
                f"Environment variable {clean_key!r} value contains disallowed characters."
            )
        validated[clean_key] = value
    return validated


def _build_env(env_vars: dict[str, str]) -> dict[str, str]:
    """Merge user-provided env vars on top of the current process environment.

    Never logs or returns the merged dict — caller must not print it.
    """
    merged = os.environ.copy()
    merged.update(env_vars)
    return merged


def _monitor_job(job_id: int, process: subprocess.Popen, log_file):
    """Background thread: wait for process exit, update DB status."""
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


def start_rdagent_job(
    db: Session,
    scenario: str,
    working_dir: str = ".",
    extra_args: list[str] | None = None,
    env_vars: dict[str, str] | None = None,
) -> Job:
    """Create a job record and launch rdagent in a subprocess.

    Returns the Job immediately (status will be 'running' or 'failed').
    """
    if scenario not in VALID_SCENARIOS:
        raise ValueError(
            f"Invalid scenario: {scenario}. "
            f"Must be one of: {', '.join(sorted(VALID_SCENARIOS))}"
        )

    run_dir = _resolve_working_dir(working_dir)

    safe_args = _validate_extra_args(extra_args or [])
    safe_env = _validate_env_vars(env_vars or {})

    cmd: list[str] = ["rdagent", scenario]
    cmd.extend(safe_args)

    job = Job(
        name=f"rdagent: {scenario}",
        type="rdagent",
        scenario=scenario,
        workflow_path="",
        working_dir=str(run_dir),
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    log_path = RDAGENT_LOGS_DIR / f"{job.id}.log"
    job.log_path = str(log_path)
    db.commit()

    log_file = open(log_path, "w")

    # Log the command (safe — no secrets)
    log_file.write(f"[rdagent] scenario: {scenario}\n")
    log_file.write(f"[rdagent] working_dir: {run_dir}\n")
    log_file.write(f"[rdagent] command: {' '.join(cmd)}\n")
    if safe_env:
        log_file.write(f"[rdagent] extra env vars: {', '.join(sorted(safe_env.keys()))}\n")
    log_file.write("-" * 60 + "\n")
    log_file.flush()

    try:
        process_env = _build_env(safe_env)

        process = subprocess.Popen(
            cmd,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            cwd=str(run_dir),
            env=process_env,
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
        log_file.write(
            "Error: 'rdagent' command not found.\n"
            "Make sure RD-Agent is installed: pip install rdagent\n"
        )
        log_file.close()
        db.commit()
    except Exception as exc:
        job.status = "failed"
        job.finished_at = datetime.now()
        job.exit_code = -1
        log_file.write(f"Error starting process: {exc}\n")
        log_file.close()
        db.commit()

    return job


def list_rdagent_jobs(db: Session) -> list[Job]:
    """List all RD-Agent jobs, newest first."""
    return (
        db.query(Job)
        .filter(Job.type == "rdagent")
        .order_by(Job.created_at.desc())
        .all()
    )


def get_rdagent_job(db: Session, job_id: int) -> Job:
    """Get a single RD-Agent job by ID."""
    job = db.query(Job).filter(Job.id == job_id, Job.type == "rdagent").first()
    if not job:
        raise ValueError(f"RD-Agent job not found: {job_id}")
    return job


def get_rdagent_job_logs(job_id: int) -> str:
    """Read the log file for a job."""
    log_path = RDAGENT_LOGS_DIR / f"{job_id}.log"
    if not log_path.exists():
        return ""
    return log_path.read_text()


def cancel_rdagent_job(db: Session, job_id: int) -> Job:
    """Cancel a running job by sending SIGTERM to its process group."""
    job = db.query(Job).filter(Job.id == job_id, Job.type == "rdagent").first()
    if not job:
        raise ValueError(f"RD-Agent job not found: {job_id}")

    if job.status != "running":
        raise ValueError(f"Job is not running: {job.status}")

    job.status = "cancelled"
    job.finished_at = datetime.now()
    job.exit_code = -signal.SIGTERM
    db.commit()

    if job.pid and _is_process_running(job.pid):
        try:
            os.killpg(os.getpgid(job.pid), signal.SIGTERM)
        except OSError:
            pass

    log_path = RDAGENT_LOGS_DIR / f"{job_id}.log"
    if log_path.exists():
        with open(log_path, "a") as f:
            f.write("\n[Job cancelled by user: process group terminated]\n")

    return job
