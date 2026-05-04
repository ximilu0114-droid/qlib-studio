from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import DEFAULT_QLIB_DATA_PATH, PROJECT_ROOT
from app.db.models import Setting

QLIB_DATA_PATH_KEY = "qlib_data_path"
MLFLOW_TRACKING_URI_KEY = "mlflow_tracking_uri"
RDAGENT_WORKING_DIR_KEY = "rdagent_working_dir"
RDAGENT_OUTPUT_DIR_KEY = "rdagent_output_dir"
RDAGENT_ENV_FILE_KEY = "rdagent_env_file"

_DEFAULT_MLFLOW_DIR = PROJECT_ROOT / "mlruns"
DEFAULT_MLFLOW_TRACKING_URI = f"file:{_DEFAULT_MLFLOW_DIR}"
DEFAULT_RDAGENT_WORKING_DIR = "."
DEFAULT_RDAGENT_OUTPUT_DIR = "storage/rdagent_outputs"
DEFAULT_RDAGENT_ENV_FILE = ".env"


def _normalize_path(path: str) -> str:
    return str(Path(path).expanduser().resolve())


def _normalize_mlflow_uri(uri: str) -> str:
    """Normalize MLflow tracking URI to an absolute file: URI.

    Handles:
    - file:./mlruns -> file:/absolute/path/to/project/mlruns
    - file:/absolute/path -> file:/absolute/path (keep as-is)
    - ./mlruns -> file:/absolute/path/to/project/mlruns
    - /absolute/path -> file:/absolute/path
    - http/https URIs -> unchanged
    """
    uri = uri.strip()

    # Leave remote URIs as-is
    if uri.startswith("http://") or uri.startswith("https://"):
        return uri

    # Extract the path portion after file: prefix
    if uri.startswith("file:"):
        path_part = uri[5:]
    else:
        path_part = uri

    # Resolve to absolute path relative to PROJECT_ROOT
    p = Path(path_part).expanduser()
    if not p.is_absolute():
        p = (PROJECT_ROOT / p).resolve()
    else:
        p = p.resolve()

    return f"file:{p}"


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


# ---- RD-Agent settings ----


def _normalize_local_path(path: str) -> str:
    """Normalize a local path: strip whitespace, expand ~, resolve."""
    return str(Path(path.strip()).expanduser().resolve())


def get_rdagent_working_dir(db: Session) -> str:
    setting = db.query(Setting).filter(Setting.key == RDAGENT_WORKING_DIR_KEY).first()
    if setting:
        return _normalize_local_path(setting.value)
    return DEFAULT_RDAGENT_WORKING_DIR


def set_rdagent_working_dir(db: Session, path: str) -> str:
    normalized = _normalize_local_path(path)
    setting = db.query(Setting).filter(Setting.key == RDAGENT_WORKING_DIR_KEY).first()
    if setting:
        setting.value = normalized
    else:
        setting = Setting(key=RDAGENT_WORKING_DIR_KEY, value=normalized)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting.value


def get_rdagent_output_dir(db: Session) -> str:
    setting = db.query(Setting).filter(Setting.key == RDAGENT_OUTPUT_DIR_KEY).first()
    if setting:
        return _normalize_local_path(setting.value)
    return DEFAULT_RDAGENT_OUTPUT_DIR


def set_rdagent_output_dir(db: Session, path: str) -> str:
    normalized = _normalize_local_path(path)
    setting = db.query(Setting).filter(Setting.key == RDAGENT_OUTPUT_DIR_KEY).first()
    if setting:
        setting.value = normalized
    else:
        setting = Setting(key=RDAGENT_OUTPUT_DIR_KEY, value=normalized)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting.value


def get_rdagent_env_file(db: Session) -> str:
    setting = db.query(Setting).filter(Setting.key == RDAGENT_ENV_FILE_KEY).first()
    if setting:
        return setting.value.strip()
    return DEFAULT_RDAGENT_ENV_FILE


def set_rdagent_env_file(db: Session, filename: str) -> str:
    cleaned = filename.strip()
    setting = db.query(Setting).filter(Setting.key == RDAGENT_ENV_FILE_KEY).first()
    if setting:
        setting.value = cleaned
    else:
        setting = Setting(key=RDAGENT_ENV_FILE_KEY, value=cleaned)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting.value