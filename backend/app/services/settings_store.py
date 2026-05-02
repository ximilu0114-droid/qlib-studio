from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import DEFAULT_QLIB_DATA_PATH
from app.db.models import Setting

QLIB_DATA_PATH_KEY = "qlib_data_path"
MLFLOW_TRACKING_URI_KEY = "mlflow_tracking_uri"

DEFAULT_MLFLOW_TRACKING_URI = "file:./mlruns"


def _normalize_path(path: str) -> str:
    return str(Path(path).expanduser().resolve())


def _normalize_mlflow_uri(uri: str) -> str:
    """Normalize MLflow tracking URI.

    Handles:
    - file:./mlruns -> file:./mlruns (keep as-is)
    - file:/absolute/path -> file:/absolute/path (keep as-is)
    - ./mlruns -> file:./mlruns (add file: prefix, keep relative)
    - /absolute/path -> file:/absolute/path (add file: prefix)
    - http/https URIs -> unchanged
    """
    uri = uri.strip()

    # Leave remote URIs as-is
    if uri.startswith("http://") or uri.startswith("https://"):
        return uri

    # Handle file: prefix - keep as-is
    if uri.startswith("file:"):
        return uri

    # Plain path - add file: prefix
    # Expand ~ but preserve relative paths like ./mlruns
    expanded = str(Path(uri).expanduser())
    # Restore ./ prefix for relative paths if it was stripped
    if uri.startswith("./") and not expanded.startswith("./"):
        expanded = f"./{expanded}"
    return f"file:{expanded}"


def get_qlib_data_path(db: Session) -> str:
    setting = db.query(Setting).filter(Setting.key == QLIB_DATA_PATH_KEY).first()
    if setting:
        return _normalize_path(setting.value)
    return _normalize_path(DEFAULT_QLIB_DATA_PATH)


def set_qlib_data_path(db: Session, path: str) -> str:
    normalized = _normalize_path(path)
    setting = db.query(Setting).filter(Setting.key == QLIB_DATA_PATH_KEY).first()
    if setting:
        setting.value = normalized
    else:
        setting = Setting(key=QLIB_DATA_PATH_KEY, value=normalized)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting.value


def get_mlflow_tracking_uri(db: Session) -> str:
    """Get saved MLflow tracking URI, or default if not configured."""
    setting = db.query(Setting).filter(Setting.key == MLFLOW_TRACKING_URI_KEY).first()
    if setting:
        return _normalize_mlflow_uri(setting.value)
    return DEFAULT_MLFLOW_TRACKING_URI


def set_mlflow_tracking_uri(db: Session, uri: str) -> str:
    """Save MLflow tracking URI to settings."""
    normalized = _normalize_mlflow_uri(uri)
    setting = db.query(Setting).filter(Setting.key == MLFLOW_TRACKING_URI_KEY).first()
    if setting:
        setting.value = normalized
    else:
        setting = Setting(key=MLFLOW_TRACKING_URI_KEY, value=normalized)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting.value