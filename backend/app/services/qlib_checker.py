import sys
from pathlib import Path

from app.services.path_checker import check_path_exists, expand_user_path


def check_qlib_status(data_dir: str) -> dict:
    warnings: list[str] = []

    python_version = (
        f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    )

    qlib_installed = False
    qlib_version = None
    try:
        import qlib

        qlib_installed = True
        qlib_version = getattr(qlib, "__version__", None)
    except ImportError:
        warnings.append("qlib is not installed. Install with: pip install pyqlib")

    mlflow_installed = False
    mlflow_version = None
    try:
        import mlflow

        mlflow_installed = True
        mlflow_version = getattr(mlflow, "__version__", None)
    except ImportError:
        warnings.append(
            "mlflow is not installed. Install with: pip install mlflow"
        )

    data_path = expand_user_path(data_dir)
    data_path_exists = check_path_exists(data_dir)

    if not data_path_exists:
        warnings.append(f"Data path does not exist: {data_path}")

    subfolders = ["calendars", "instruments", "features"]
    subfolder_exists: dict[str, bool] = {}

    for name in subfolders:
        if data_path_exists:
            exists = (Path(data_path) / name).exists()
        else:
            exists = False
        subfolder_exists[name] = exists
        if not exists:
            warnings.append(f"Missing subfolder: {name}")

    calendar_exists = subfolder_exists["calendars"]
    instruments_exists = subfolder_exists["instruments"]
    features_exists = subfolder_exists["features"]

    ready = qlib_installed and calendar_exists and instruments_exists and features_exists

    return {
        "python_version": python_version,
        "qlib_installed": qlib_installed,
        "qlib_version": qlib_version,
        "mlflow_installed": mlflow_installed,
        "mlflow_version": mlflow_version,
        "data_path": data_path,
        "data_path_exists": data_path_exists,
        "calendar_exists": calendar_exists,
        "instruments_exists": instruments_exists,
        "features_exists": features_exists,
        "ready": ready,
        "warnings": warnings,
    }
