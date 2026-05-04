"""Safe local artifact loader for Qlib Studio backtest analysis.

Provides helpers to locate and load local MLflow artifacts for a given run_id.
Only local ``file:`` tracking URIs are supported. All artifact paths must be
relative and are validated against path-traversal attacks.
"""

from __future__ import annotations

import pickle
import re
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _check_mlflow() -> tuple[bool, str | None]:
    try:
        import mlflow  # noqa: F401
        return True, None
    except ImportError:
        return False, "mlflow is not installed. Install with: pip install mlflow"


def _get_client(tracking_uri: str | None = None):
    available, error = _check_mlflow()
    if not available:
        raise RuntimeError(error)

    import mlflow

    if tracking_uri:
        mlflow.set_tracking_uri(tracking_uri)

    return mlflow.MlflowClient()


def _validate_artifact_path(artifact_path: str) -> tuple[str | None, str | None]:
    """Validate that *artifact_path* is a safe, relative path.

    Returns ``(cleaned_path, error_message)``.  ``error_message`` is ``None``
    on success, otherwise contains a human-readable reason for rejection.
    """
    if not artifact_path or not artifact_path.strip():
        return None, "artifact_path must not be empty"

    cleaned = artifact_path.strip().replace("\\", "/")

    # Must be relative — reject absolute paths
    if cleaned.startswith("/"):
        return None, "Absolute artifact paths are not allowed"

    # Block traversal components
    parts = cleaned.split("/")
    if ".." in parts:
        return None, "Path traversal ('..') is not allowed"

    # Block empty components (e.g. "foo//bar")
    if any(p == "" for p in parts):
        return None, "Artifact path contains empty components"

    return cleaned, None


def run_exists(run_id: str, tracking_uri: str | None = None) -> bool:
    """Check whether a run exists in MLflow.

    Returns True if MLflow can resolve the run, False otherwise.
    """
    try:
        client = _get_client(tracking_uri)
        client.get_run(run_id)
        return True
    except Exception:
        return False


def _resolve_local_artifact_dir(
    run_id: str, tracking_uri: str | None = None
) -> tuple[Path | None, str | None]:
    """Resolve the local filesystem directory for a run's artifacts.

    Returns ``(artifact_dir, error_or_warning)``.
    """
    available, error = _check_mlflow()
    if not available:
        return None, error

    try:
        client = _get_client(tracking_uri)
        run = client.get_run(run_id)
    except Exception as e:
        return None, f"Failed to get run '{run_id}': {e}"

    artifact_uri = run.info.artifact_uri
    if not artifact_uri:
        return None, f"No artifact_uri found for run '{run_id}'"

    # Only support local file: URIs; reject all other schemes.
    path_str = artifact_uri
    if path_str.startswith("file://"):
        path_str = path_str[len("file://"):]
    elif path_str.startswith("file:"):
        path_str = path_str[len("file:"):]
    elif "://" in path_str or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:/", path_str):
        # Covers s3://, gs://, mlflow-artifacts://, dbfs:/, wasbs://, etc.
        return None, "Only local file artifacts are supported in Phase 4."
    else:
        # Plain local path with no URI scheme — accept it.
        pass

    artifact_dir = Path(path_str).resolve()
    if not artifact_dir.exists():
        return None, f"Artifact directory does not exist: {artifact_dir}"

    return artifact_dir, None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_local_artifact_path(
    run_id: str,
    artifact_path: str,
    tracking_uri: str | None = None,
) -> dict[str, Any]:
    """Return the resolved local filesystem path for *artifact_path*.

    Returns::

        {"path": "/abs/path/to/file.pkl", "warnings": []}
        # or
        {"path": None, "warnings": ["reason for failure"]}
    """
    warnings: list[str] = []

    # Validate the requested artifact path
    cleaned, err = _validate_artifact_path(artifact_path)
    if err:
        return {"path": None, "warnings": [err]}

    artifact_dir, err = _resolve_local_artifact_dir(run_id, tracking_uri)
    if err:
        return {"path": None, "warnings": [err]}

    full_path = (artifact_dir / cleaned).resolve()

    # Final safety: the resolved path must stay inside the artifact directory.
    # Use pathlib ancestry check, not string prefix, to block symlink escapes.
    try:
        full_path.relative_to(artifact_dir)
    except ValueError:
        return {
            "path": None,
            "warnings": ["Artifact path escapes the run artifact directory."],
        }

    if not full_path.exists():
        warnings.append(f"Artifact file does not exist: {cleaned}")
        return {"path": None, "warnings": warnings}

    return {"path": str(full_path), "warnings": warnings}


def artifact_exists(
    run_id: str,
    artifact_path: str,
    tracking_uri: str | None = None,
) -> dict[str, Any]:
    """Check whether *artifact_path* exists for the given run.

    Returns::

        {"exists": True, "warnings": []}
        # or
        {"exists": False, "warnings": ["reason"]}
    """
    result = get_local_artifact_path(run_id, artifact_path, tracking_uri)
    return {
        "exists": result["path"] is not None,
        "warnings": result["warnings"],
    }


def load_pickle_artifact(
    run_id: str,
    artifact_path: str,
    tracking_uri: str | None = None,
) -> dict[str, Any]:
    """Load and unpickle a local artifact file.

    Returns::

        {"data": <object>, "warnings": []}
        # or
        {"data": None, "warnings": ["reason for failure"]}
    """
    path_result = get_local_artifact_path(run_id, artifact_path, tracking_uri)
    if path_result["path"] is None:
        return {"data": None, "warnings": path_result["warnings"]}

    resolved = path_result["path"]
    warnings: list[str] = []

    try:
        with open(resolved, "rb") as f:
            data = pickle.load(f)
    except pickle.UnpicklingError as e:
        return {"data": None, "warnings": [f"Failed to unpickle '{artifact_path}': {e}"]}
    except Exception as e:
        return {"data": None, "warnings": [f"Failed to read '{artifact_path}': {e}"]}

    return {"data": data, "warnings": warnings}


# ---------------------------------------------------------------------------
# Artifact discovery helpers
# ---------------------------------------------------------------------------


def list_all_artifacts(
    run_id: str,
    tracking_uri: str | None = None,
) -> list[str]:
    """Recursively list all artifact paths for a run via the MLflow client.

    Returns a flat list of relative artifact paths (files only, not directories).
    """
    available, error = _check_mlflow()
    if not available:
        return []

    try:
        client = _get_client(tracking_uri)

        def _walk(prefix: str = "") -> list[str]:
            items = client.list_artifacts(run_id, path=prefix if prefix else None)
            paths: list[str] = []
            for item in items:
                if item.is_dir:
                    paths.extend(_walk(item.path))
                else:
                    paths.append(item.path)
            return paths

        return _walk()
    except Exception:
        return []


def find_artifact_by_candidates(
    run_id: str,
    candidate_paths: list[str],
    tracking_uri: str | None = None,
) -> dict[str, Any]:
    """Try exact candidate paths in order; return the first that exists.

    Returns::

        {"path": "/abs/path/to/file.pkl", "warnings": []}
        # or
        {"path": None, "warnings": ["reason"]}
    """
    all_warnings: list[str] = []
    for candidate in candidate_paths:
        result = get_local_artifact_path(run_id, candidate, tracking_uri)
        if result["path"] is not None:
            return {"path": result["path"], "warnings": []}
        all_warnings.extend(result["warnings"])

    return {"path": None, "warnings": all_warnings}


def find_artifact_by_basename(
    run_id: str,
    basename: str,
    tracking_uri: str | None = None,
) -> dict[str, Any]:
    """Search all artifacts recursively for one matching *basename*.

    Example: ``find_artifact_by_basename(run_id, "report_normal_1day.pkl")``
    will match ``portfolio_analysis/report_normal_1day.pkl``.

    Returns::

        {"path": "/abs/path/to/file.pkl", "found_at": "portfolio_analysis/report_normal_1day.pkl", "warnings": []}
        # or
        {"path": None, "found_at": None, "warnings": ["not found"]}
    """
    artifact_dir, err = _resolve_local_artifact_dir(run_id, tracking_uri)
    if err:
        return {"path": None, "found_at": None, "warnings": [err]}

    all_paths = list_all_artifacts(run_id, tracking_uri)
    for art_path in all_paths:
        if Path(art_path).name == basename:
            full_path = (artifact_dir / art_path).resolve()
            if full_path.exists():
                return {"path": str(full_path), "found_at": art_path, "warnings": []}

    return {
        "path": None,
        "found_at": None,
        "warnings": [f"No artifact with basename '{basename}' found"],
    }


def find_artifact(
    run_id: str,
    candidate_paths: list[str],
    basename: str,
    tracking_uri: str | None = None,
) -> dict[str, Any]:
    """Combined search: try exact candidates first, then fall back to basename search.

    Returns::

        {"path": "/abs/path", "resolved_as": "portfolio_analysis/report_normal_1day.pkl", "all_artifacts": [...], "warnings": []}
    """
    # 1. Try exact candidate paths
    result = find_artifact_by_candidates(run_id, candidate_paths, tracking_uri)
    if result["path"] is not None:
        return {
            "path": result["path"],
            "resolved_as": None,  # exact match
            "all_artifacts": [],
            "warnings": [],
        }

    # 2. Fall back to basename search
    base_result = find_artifact_by_basename(run_id, basename, tracking_uri)
    if base_result["path"] is not None:
        return {
            "path": base_result["path"],
            "resolved_as": base_result.get("found_at"),
            "all_artifacts": [],
            "warnings": [],
        }

    # 3. Neither found — collect all available artifacts for diagnostics
    all_artifacts = list_all_artifacts(run_id, tracking_uri)
    warnings = [f"Could not find {basename}. Available artifacts for this run:"]
    if all_artifacts:
        for p in all_artifacts:
            warnings.append(f"  - {p}")
    else:
        warnings.append("  (none)")
        warnings.append(
            "This run has no artifacts. Please check whether qrun completed with recorder output."
        )

    return {
        "path": None,
        "resolved_as": None,
        "all_artifacts": all_artifacts,
        "warnings": warnings,
    }
