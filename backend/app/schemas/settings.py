from pydantic import BaseModel


class SettingsResponse(BaseModel):
    qlib_data_path: str
    mlflow_tracking_uri: str
    rdagent_working_dir: str
    rdagent_output_dir: str
    rdagent_env_file: str


class QlibDataPathUpdate(BaseModel):
    qlib_data_path: str


class MlflowTrackingUriUpdate(BaseModel):
    mlflow_tracking_uri: str


class RDagentSettingsUpdate(BaseModel):
    rdagent_working_dir: str | None = None
    rdagent_output_dir: str | None = None
    rdagent_env_file: str | None = None
