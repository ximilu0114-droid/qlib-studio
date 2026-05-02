"""MLflow integration service for Qlib Studio Experiment Center."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from app.core.config import PROJECT_ROOT


def _check_mlflow_available() -> tuple[bool, str | None]:
    """Check if mlflow is installed and importable."""
    try:
        import mlflow  # noqa: F401
        return True, None
    except ImportError:
        return False, "mlflow is not installed. Install with: pip install mlflow"


def get_mlflow_status() -> dict[str, Any]:
    """Return mlflow availability and version info."""
    available, error = _check_mlflow_available()
    if not available:
        return {
            "available": False,
            "version": None,
            "tracking_uri": None,
            "error": error,
        }
    import mlflow
    return {
        "available": True,
        "version": mlflow.__version__,
        "tracking_uri": mlflow.get_tracking_uri(),
        "error": None,
    }


def set_tracking_uri(uri: str) -> dict[str, Any]:
    """Set the MLflow tracking URI.

    Accepts:
    - A local path like './mlruns' or '/abs/path/mlruns'
    - An http(s) tracking server URL
    """
    available, error = _check_mlflow_available()
    if not available:
        return {"ok": False, "error": error}

    import mlflow

    # Expand user home and resolve relative paths against project root
    expanded = Path(uri).expanduser()
    if not expanded.is_absolute():
        expanded = PROJECT_ROOT / expanded

    resolved = str(expanded.resolve())
    mlflow.set_tracking_uri(resolved)
    return {"ok": True, "tracking_uri": mlflow.get_tracking_uri()}


def _get_client():
    """Get an MLflow client, or raise if mlflow is not available."""
    available, error = _check_mlflow_available()
    if not available:
        raise RuntimeError(error)
    import mlflow
    return mlflow.MlflowClient()


def list_experiments() -> list[dict[str, Any]]:
    """List all MLflow experiments."""
    client = _get_client()
    experiments = client.search_experiments()
    results = []
    for exp in experiments:
        results.append({
            "experiment_id": exp.experiment_id,
            "name": exp.name,
            "lifecycle_stage": exp.lifecycle_stage,
            "artifact_location": exp.artifact_location,
        })
    return results


def get_experiment(experiment_id: str) -> dict[str, Any]:
    """Get details of a single experiment."""
    client = _get_client()
    exp = client.get_experiment(experiment_id)
    return {
        "experiment_id": exp.experiment_id,
        "name": exp.name,
        "lifecycle_stage": exp.lifecycle_stage,
        "artifact_location": exp.artifact_location,
    }


def list_runs(experiment_id: str, max_results: int = 100) -> list[dict[str, Any]]:
    """List runs under an experiment, ordered by start time descending."""
    client = _get_client()
    runs = client.search_runs(
        experiment_ids=[experiment_id],
        order_by=["start_time DESC"],
        max_results=max_results,
    )
    results = []
    for run in runs:
        results.append({
            "run_id": run.info.run_id,
            "run_name": run.info.run_name,
            "status": run.info.status,
            "start_time": run.info.start_time,
            "end_time": run.info.end_time,
            "artifact_uri": run.info.artifact_uri,
        })
    return results


def get_run_detail(run_id: str) -> dict[str, Any]:
    """Get full details of a single run: info, params, metrics, tags."""
    client = _get_client()
    run = client.get_run(run_id)

    info = {
        "run_id": run.info.run_id,
        "run_name": run.info.run_name,
        "status": run.info.status,
        "start_time": run.info.start_time,
        "end_time": run.info.end_time,
        "artifact_uri": run.info.artifact_uri,
    }

    params = dict(run.data.params)
    metrics = dict(run.data.metrics)
    tags = dict(run.data.tags)

    return {
        "info": info,
        "params": params,
        "metrics": metrics,
        "tags": tags,
    }


def list_artifacts(run_id: str, path: str = "") -> dict[str, Any]:
    """List artifacts for a run at a given path."""
    client = _get_client()
    artifact_list = client.list_artifacts(run_id, path=path)

    files: list[dict[str, Any]] = []
    dirs: list[dict[str, Any]] = []
    for item in artifact_list:
        entry = {
            "path": item.path,
            "is_dir": item.is_dir,
            "file_size": item.file_size,
        }
        if item.is_dir:
            dirs.append(entry)
        else:
            files.append(entry)

    return {
        "run_id": run_id,
        "path": path,
        "files": files,
        "directories": dirs,
    }
