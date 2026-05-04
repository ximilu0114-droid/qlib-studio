from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.rdagent import (
    RDagentHealthCheckResponse,
    RDagentStartRequest,
    RDagentStartResponse,
    RDagentStatusResponse,
)
from app.schemas.workflows import JobLogResponse, JobResponse
from app.services import rdagent_checker, rdagent_runner

router = APIRouter(tags=["rdagent"])


@router.get("/rdagent/status", response_model=RDagentStatusResponse)
def get_rdagent_status():
    """Check RD-Agent installation, Docker, and health."""
    return rdagent_checker.check_rdagent_status()


@router.post("/rdagent/health-check", response_model=RDagentHealthCheckResponse)
def run_rdagent_health_check():
    """Run rdagent health_check --no-check-env and return the output."""
    return rdagent_checker.run_health_check()


@router.post("/rdagent/jobs", response_model=RDagentStartResponse)
def start_rdagent_job(body: RDagentStartRequest, db: Session = Depends(get_db)):
    """Start an RD-Agent job."""
    try:
        job = rdagent_runner.start_rdagent_job(
            db,
            scenario=body.scenario,
            working_dir=body.working_dir,
            extra_args=body.extra_args,
            env_vars=body.env_vars,
        )
        return RDagentStartResponse(job_id=job.id, status=job.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rdagent/jobs", response_model=list[JobResponse])
def list_rdagent_jobs(db: Session = Depends(get_db)):
    """List all RD-Agent jobs."""
    jobs = rdagent_runner.list_rdagent_jobs(db)
    return [JobResponse.model_validate(job) for job in jobs]


@router.get("/rdagent/jobs/{job_id}", response_model=JobResponse)
def get_rdagent_job(job_id: int, db: Session = Depends(get_db)):
    """Get RD-Agent job details."""
    try:
        job = rdagent_runner.get_rdagent_job(db, job_id)
        return JobResponse.model_validate(job)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/rdagent/jobs/{job_id}/logs", response_model=JobLogResponse)
def get_rdagent_job_logs(job_id: int, db: Session = Depends(get_db)):
    """Get RD-Agent job logs."""
    try:
        job = rdagent_runner.get_rdagent_job(db, job_id)
        logs = rdagent_runner.get_rdagent_job_logs(job_id)
        return JobLogResponse(job_id=job.id, logs=logs)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/rdagent/jobs/{job_id}/cancel", response_model=JobResponse)
def cancel_rdagent_job(job_id: int, db: Session = Depends(get_db)):
    """Cancel a running RD-Agent job."""
    try:
        job = rdagent_runner.cancel_rdagent_job(db, job_id)
        return JobResponse.model_validate(job)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
