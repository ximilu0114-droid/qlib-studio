from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.settings import (
    MlflowTrackingUriUpdate,
    QlibDataPathUpdate,
    RDagentSettingsUpdate,
    SettingsResponse,
)
from app.services.settings_store import (
    get_mlflow_tracking_uri,
    get_qlib_data_path,
    get_rdagent_env_file,
    get_rdagent_output_dir,
    get_rdagent_working_dir,
    set_mlflow_tracking_uri,
    set_qlib_data_path,
    set_rdagent_env_file,
    set_rdagent_output_dir,
    set_rdagent_working_dir,
)

router = APIRouter(tags=["settings"])


def _build_settings_response(db: Session) -> SettingsResponse:
    return SettingsResponse(
        qlib_data_path=get_qlib_data_path(db),
        mlflow_tracking_uri=get_mlflow_tracking_uri(db),
        rdagent_working_dir=get_rdagent_working_dir(db),
        rdagent_output_dir=get_rdagent_output_dir(db),
        rdagent_env_file=get_rdagent_env_file(db),
    )


@router.get("/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return _build_settings_response(db)


@router.post("/settings/qlib-data-path", response_model=SettingsResponse)
def update_qlib_data_path(body: QlibDataPathUpdate, db: Session = Depends(get_db)):
    set_qlib_data_path(db, body.qlib_data_path)
    return _build_settings_response(db)


@router.post("/settings/mlflow-tracking-uri", response_model=SettingsResponse)
def update_mlflow_tracking_uri(body: MlflowTrackingUriUpdate, db: Session = Depends(get_db)):
    set_mlflow_tracking_uri(db, body.mlflow_tracking_uri)
    return _build_settings_response(db)


@router.post("/settings/rdagent", response_model=SettingsResponse)
def update_rdagent_settings(body: RDagentSettingsUpdate, db: Session = Depends(get_db)):
    if body.rdagent_working_dir is not None:
        set_rdagent_working_dir(db, body.rdagent_working_dir)
    if body.rdagent_output_dir is not None:
        set_rdagent_output_dir(db, body.rdagent_output_dir)
    if body.rdagent_env_file is not None:
        set_rdagent_env_file(db, body.rdagent_env_file)
    return _build_settings_response(db)
