from pydantic import BaseModel


class QlibStatusResponse(BaseModel):
    python_version: str
    qlib_installed: bool
    qlib_version: str | None = None
    mlflow_installed: bool
    mlflow_version: str | None = None
    data_path: str
    data_path_exists: bool
    calendar_exists: bool
    instruments_exists: bool
    features_exists: bool
    ready: bool
    warnings: list[str]
