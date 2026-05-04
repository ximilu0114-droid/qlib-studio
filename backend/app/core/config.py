from pathlib import Path

from pydantic_settings import BaseSettings

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
STORAGE_DIR = PROJECT_ROOT / "storage"
STORAGE_DIR.mkdir(exist_ok=True)

CONFIGS_DIR = PROJECT_ROOT / "configs" / "qlib_templates"
CONFIGS_DIR.mkdir(parents=True, exist_ok=True)

WORKFLOWS_DIR = STORAGE_DIR / "workflows"
WORKFLOWS_DIR.mkdir(exist_ok=True)

RDAGENT_LOGS_DIR = STORAGE_DIR / "logs" / "rdagent"
RDAGENT_LOGS_DIR.mkdir(parents=True, exist_ok=True)

RDAGENT_WORKING_DIR = PROJECT_ROOT
RDAGENT_OUTPUT_DIR = PROJECT_ROOT / "log"

DEFAULT_QLIB_DATA_PATH = str(Path.home() / ".qlib" / "qlib_data" / "cn_data")


class Settings(BaseSettings):
    app_name: str = "Qlib Studio"
    app_version: str = "0.1.0"
    debug: bool = False

    database_url: str = f"sqlite:///{STORAGE_DIR / 'qlib_studio.db'}"

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
    ]

    model_config = {"env_prefix": "QLIB_STUDIO_"}


settings = Settings()
