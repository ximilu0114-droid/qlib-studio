from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.workflows import (
    JobLogResponse,
    JobResponse,
    QrunRequest,
    QrunResponse,
)
from app.services import job_runner

router = APIRouter(tags=["jobs"])


@router.post("/jobs/qrun", response_model=QrunResponse)
def start_qrun_job(body: QrunRequest, db: Session = Depends(get_db)):
    """Start a qrun job."""
    workflow_name = body.workflow_name or body.workflow_path
    if not workflow_name:
        raise HTTPException(status_code=400, detail="workflow_name is required")

    try:
        job = job_runner.start_qrun_job(
            db,
            workflow_name=workflow_name,
            working_dir=body.working_dir,
        )
        return QrunResponse(job_id=job.id, status=job.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs", response_model=list[JobResponse])
def list_jobs(db: Session = Depends(get_db)):
    """List all jobs ordered by newest first."""
    jobs = job_runner.list_jobs(db)
    return [JobResponse.model_validate(job) for job in jobs]


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """Get job details."""
    try:
        job = job_runner.get_job(db, job_id)
        return JobResponse.model_validate(job)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/jobs/{job_id}/logs", response_model=JobLogResponse)
def get_job_logs(job_id: int, db: Session = Depends(get_db)):
    """Get job logs."""
    try:
        job = job_runner.get_job(db, job_id)
        logs = job_runner.get_job_logs(job_id)
        return JobLogResponse(job_id=job.id, logs=logs)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/jobs/{job_id}/cancel", response_model=JobResponse)
def cancel_job(job_id: int, db: Session = Depends(get_db)):
    """Cancel a running job."""
    try:
        job = job_runner.cancel_job(db, job_id)
        return JobResponse.model_validate(job)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
