from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.settings import MlflowTrackingUriUpdate, QlibDataPathUpdate, SettingsResponse
from app.services.settings_store import (
    get_mlflow_tracking_uri,
    get_qlib_data_path,
    set_mlflow_tracking_uri,
    set_qlib_data_path,
)

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return SettingsResponse(
        qlib_data_path=get_qlib_data_path(db),
        mlflow_tracking_uri=get_mlflow_tracking_uri(db),
    )


@router.post("/settings/qlib-data-path", response_model=SettingsResponse)
def update_qlib_data_path(body: QlibDataPathUpdate, db: Session = Depends(get_db)):
    set_qlib_data_path(db, body.qlib_data_path)
    return SettingsResponse(
        qlib_data_path=get_qlib_data_path(db),
        mlflow_tracking_uri=get_mlflow_tracking_uri(db),
    )


@router.post("/settings/mlflow-tracking-uri", response_model=SettingsResponse)
def update_mlflow_tracking_uri(body: MlflowTrackingUriUpdate, db: Session = Depends(get_db)):
    set_mlflow_tracking_uri(db, body.mlflow_tracking_uri)
    return SettingsResponse(
        qlib_data_path=get_qlib_data_path(db),
        mlflow_tracking_uri=get_mlflow_tracking_uri(db),
    )