"""Experiment Center service - reads MLflow experiments and runs."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _check_mlflow() -> tuple[bool, str | None]:
    """Check if mlflow is installed."""
    try:
        import mlflow  # noqa: F401
        return True, None
    except ImportError:
        return False, "mlflow is not installed. Install with: pip install mlflow"


def _get_client(tracking_uri: str | None = None):
    """Get an MLflow client with the given tracking URI.

    Args:
        tracking_uri: MLflow tracking URI (e.g. "file:./mlruns").
                      If None, uses the default from mlflow.

    Returns:
        Tuple of (client, warnings) where warnings is a list of human-readable messages.
    """
    available, error = _check_mlflow()
    if not available:
        raise RuntimeError(error)

    import mlflow

    if tracking_uri:
        mlflow.set_tracking_uri(tracking_uri)

    client = mlflow.MlflowClient()
    return client


def _ms_to_iso(ms: int | None) -> str | None:
    """Convert milliseconds timestamp to ISO format string."""
    if ms is None:
        return None
    try:
        dt = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
        return dt.isoformat()
    except (ValueError, OSError):
        return None


def _calc_duration(start_ms: int | None, end_ms: int | None) -> float | None:
    """Calculate duration in seconds from millisecond timestamps."""
    if start_ms is None or end_ms is None:
        return None
    return round((end_ms - start_ms) / 1000, 2)


def list_experiments(tracking_uri: str | None = None) -> dict[str, Any]:
    """List all MLflow experiments with run counts.

    Returns:
        Dict with "experiments" list and "warnings" list.
    """
    warnings: list[str] = []

    available, error = _check_mlflow()
    if not available:
        return {"experiments": [], "warnings": [error]}

    try:
        client = _get_client(tracking_uri)
    except Exception as e:
        return {"experiments": [], "warnings": [f"Failed to connect to MLflow: {e}"]}

    try:
        experiments = client.search_experiments()
    except Exception as e:
        msg = str(e)
        if "does not exist" in msg.lower() or "no such file" in msg.lower():
            return {"experiments": [], "warnings": [f"MLflow tracking path does not exist: {msg}"]}
        return {"experiments": [], "warnings": [f"Failed to list experiments: {msg}"]}

    results = []
    for exp in experiments:
        try:
            runs = client.search_runs(
                experiment_ids=[exp.experiment_id],
                max_results=1,
                output_format="list",
            )
            # Get full run count by searching with a large limit
            all_runs = client.search_runs(
                experiment_ids=[exp.experiment_id],
                max_results=10000,
                output_format="list",
            )
            run_count = len(all_runs)
        except Exception:
            run_count = 0

        results.append({
            "experiment_id": exp.experiment_id,
            "name": exp.name,
            "artifact_location": exp.artifact_location or "",
            "lifecycle_stage": exp.lifecycle_stage or "active",
            "run_count": run_count,
        })

    return {"experiments": results, "warnings": warnings}


def get_experiment(experiment_id: str, tracking_uri: str | None = None) -> dict[str, Any]:
    """Get details of a single experiment."""
    available, error = _check_mlflow()
    if not available:
        raise RuntimeError(error)

    client = _get_client(tracking_uri)
    exp = client.get_experiment(experiment_id)

    # Get run count
    try:
        all_runs = client.search_runs(
            experiment_ids=[experiment_id],
            max_results=10000,
            output_format="list",
        )
        run_count = len(all_runs)
    except Exception:
        run_count = 0

    return {
        "experiment_id": exp.experiment_id,
        "name": exp.name,
        "artifact_location": exp.artifact_location or "",
        "lifecycle_stage": exp.lifecycle_stage or "active",
        "run_count": run_count,
    }


def list_runs(experiment_id: str, tracking_uri: str | None = None, max_results: int = 100) -> dict[str, Any]:
    """List runs under an experiment, ordered by start time descending.

    Returns:
        Dict with "experiment_id" and "runs" list.
    """
    available, error = _check_mlflow()
    if not available:
        raise RuntimeError(error)

    client = _get_client(tracking_uri)
    runs = client.search_runs(
        experiment_ids=[experiment_id],
        order_by=["start_time DESC"],
        max_results=max_results,
    )

    results = []
    for run in runs:
        start_ms = run.info.start_time
        end_ms = run.info.end_time

        # Count metrics and params
        metrics_count = len(run.data.metrics) if run.data.metrics else 0
        params_count = len(run.data.params) if run.data.params else 0

        results.append({
            "run_id": run.info.run_id,
            "status": run.info.status or "UNKNOWN",
            "start_time": _ms_to_iso(start_ms),
            "end_time": _ms_to_iso(end_ms),
            "duration_seconds": _calc_duration(start_ms, end_ms),
            "artifact_uri": run.info.artifact_uri,
            "metrics_count": metrics_count,
            "params_count": params_count,
        })

    return {"experiment_id": experiment_id, "runs": results}


def get_run_detail(run_id: str, tracking_uri: str | None = None) -> dict[str, Any]:
    """Get full details of a single run: info, params, metrics, tags."""
    available, error = _check_mlflow()
    if not available:
        raise RuntimeError(error)

    client = _get_client(tracking_uri)
    run = client.get_run(run_id)

    start_ms = run.info.start_time
    end_ms = run.info.end_time

    return {
        "run_id": run.info.run_id,
        "experiment_id": run.info.experiment_id,
        "status": run.info.status or "UNKNOWN",
        "start_time": _ms_to_iso(start_ms),
        "end_time": _ms_to_iso(end_ms),
        "artifact_uri": run.info.artifact_uri,
        "params": dict(run.data.params) if run.data.params else {},
        "metrics": dict(run.data.metrics) if run.data.metrics else {},
        "tags": dict(run.data.tags) if run.data.tags else {},
    }


def get_run_params(run_id: str, tracking_uri: str | None = None) -> dict[str, Any]:
    """Get params for a run."""
    available, error = _check_mlflow()
    if not available:
        raise RuntimeError(error)

    client = _get_client(tracking_uri)
    run = client.get_run(run_id)

    return {
        "run_id": run.info.run_id,
        "params": dict(run.data.params) if run.data.params else {},
    }


def get_run_metrics(run_id: str, tracking_uri: str | None = None) -> dict[str, Any]:
    """Get metrics for a run."""
    available, error = _check_mlflow()
    if not available:
        raise RuntimeError(error)

    client = _get_client(tracking_uri)
    run = client.get_run(run_id)

    return {
        "run_id": run.info.run_id,
        "metrics": dict(run.data.metrics) if run.data.metrics else {},
    }


def list_artifacts(run_id: str, path: str = "", tracking_uri: str | None = None) -> dict[str, Any]:
    """List artifact files for a run, optionally under a subdirectory.

    Args:
        run_id: MLflow run ID.
        path: Subdirectory path to browse (e.g. "portfolio_analysis").
              Empty string lists top-level artifacts.
        tracking_uri: MLflow tracking URI from settings.

    Returns:
        Dict with "run_id", "path", and "artifacts" list.
    """
    available, error = _check_mlflow()
    if not available:
        raise RuntimeError(error)

    # Prevent path traversal
    normalized = path.strip().replace("\\", "/")
    if normalized.startswith("/"):
        normalized = normalized.lstrip("/")
    if ".." in normalized.split("/"):
        raise ValueError("Path traversal is not allowed")

    client = _get_client(tracking_uri)
    artifact_list = client.list_artifacts(run_id, path=normalized if normalized else None)

    results = []
    for item in artifact_list:
        results.append({
            "path": item.path,
            "is_dir": item.is_dir,
            "file_size": item.file_size if not item.is_dir else None,
        })

    return {"run_id": run_id, "path": normalized, "artifacts": results}
