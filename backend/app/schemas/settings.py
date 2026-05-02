from pydantic import BaseModel


class SettingsResponse(BaseModel):
    qlib_data_path: str
    mlflow_tracking_uri: str


class QlibDataPathUpdate(BaseModel):
    qlib_data_path: str


class MlflowTrackingUriUpdate(BaseModel):
    mlflow_tracking_uri: str