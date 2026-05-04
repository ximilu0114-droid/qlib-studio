"""Experiment Center API endpoints."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.experiments import (
    ArtifactListResponse,
    ExperimentDetailResponse,
    ExperimentListResponse,
    MlflowStatusResponse,
    RunDetailResponse,
    RunListResponse,
    RunMetricsResponse,
    RunParamsResponse,
)
from app.services import experiment_service
from app.services.settings_store import get_mlflow_tracking_uri

router = APIRouter(tags=["experiments"])


def _get_tracking_uri(db: Session) -> str | None:
    """Get the configured MLflow tracking URI from settings."""
    try:
        return get_mlflow_tracking_uri(db)
    except Exception:
        return None


@router.get("/experiments", response_model=ExperimentListResponse)
def list_experiments(db: Session = Depends(get_db)):
    """List all MLflow experiments with run counts."""
    tracking_uri = _get_tracking_uri(db)
    result = experiment_service.list_experiments(tracking_uri)
    return ExperimentListResponse(**result)


@router.get("/experiments/{experiment_id}", response_model=ExperimentDetailResponse)
def get_experiment(experiment_id: str, db: Session = Depends(get_db)):
    """Get details of a single experiment."""
    tracking_uri = _get_tracking_uri(db)
    try:
        result = experiment_service.get_experiment(experiment_id, tracking_uri)
        return ExperimentDetailResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get experiment: {e}")


@router.get("/experiments/{experiment_id}/runs", response_model=RunListResponse)
def list_runs(experiment_id: str, max_results: int = 100, db: Session = Depends(get_db)):
    """List runs under an experiment, ordered by start time descending."""
    tracking_uri = _get_tracking_uri(db)
    try:
        result = experiment_service.list_runs(experiment_id, tracking_uri, max_results)
        return RunListResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list runs: {e}")


@router.get("/runs/{run_id}", response_model=RunDetailResponse)
def get_run_detail(run_id: str, db: Session = Depends(get_db)):
    """Get full details of a run: info, params, metrics, tags."""
    tracking_uri = _get_tracking_uri(db)
    try:
        result = experiment_service.get_run_detail(run_id, tracking_uri)
        return RunDetailResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get run: {e}")


@router.get("/runs/{run_id}/params", response_model=RunParamsResponse)
def get_run_params(run_id: str, db: Session = Depends(get_db)):
    """Get params for a run."""
    tracking_uri = _get_tracking_uri(db)
    try:
        result = experiment_service.get_run_params(run_id, tracking_uri)
        return RunParamsResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get run params: {e}")


@router.get("/runs/{run_id}/metrics", response_model=RunMetricsResponse)
def get_run_metrics(run_id: str, db: Session = Depends(get_db)):
    """Get metrics for a run."""
    tracking_uri = _get_tracking_uri(db)
    try:
        result = experiment_service.get_run_metrics(run_id, tracking_uri)
        return RunMetricsResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get run metrics: {e}")


@router.get("/runs/{run_id}/artifacts", response_model=ArtifactListResponse)
def list_artifacts(run_id: str, path: str = "", db: Session = Depends(get_db)):
    """List artifact files for a run.

    Use ?path=subdir to browse a subdirectory.
    """
    tracking_uri = _get_tracking_uri(db)
    try:
        result = experiment_service.list_artifacts(run_id, path=path, tracking_uri=tracking_uri)
        return ArtifactListResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list artifacts: {e}")


@router.get("/mlflow/status", response_model=MlflowStatusResponse)
def mlflow_status(db: Session = Depends(get_db)):
    """Diagnostic endpoint: show resolved MLflow tracking URI and status."""
    tracking_uri = _get_tracking_uri(db)
    warnings: list[str] = []

    resolved_path = ""
    if tracking_uri and tracking_uri.startswith("file:"):
        resolved_path = tracking_uri[5:]
    elif tracking_uri:
        resolved_path = tracking_uri

    path_exists = Path(resolved_path).is_dir() if resolved_path else False
    if not path_exists and resolved_path:
        warnings.append(f"MLflow tracking path does not exist: {resolved_path}")

    experiment_count = 0
    run_count = 0

    if tracking_uri:
        try:
            data = experiment_service.list_experiments(tracking_uri)
            experiments = data.get("experiments", [])
            experiment_count = len(experiments)
            run_count = sum(exp.get("run_count", 0) for exp in experiments)
            warnings.extend(data.get("warnings", []))
        except Exception as e:
            warnings.append(f"Failed to query MLflow: {e}")

    if experiment_count > 0 and run_count == 0:
        warnings.append(
            f"{experiment_count} experiment(s) found with 0 runs. "
            "Make sure Workflow Runner and Experiment Center use the same MLflow tracking URI."
        )

    return MlflowStatusResponse(
        mlflow_tracking_uri=tracking_uri or "",
        resolved_mlruns_path=resolved_path,
        path_exists=path_exists,
        experiment_count=experiment_count,
        run_count=run_count,
        warnings=warnings,
    )
