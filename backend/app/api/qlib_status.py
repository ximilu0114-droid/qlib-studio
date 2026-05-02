from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.qlib import QlibStatusResponse
from app.services.qlib_checker import check_qlib_status
from app.services.settings_store import get_qlib_data_path

router = APIRouter(tags=["qlib"])


@router.get("/qlib/status", response_model=QlibStatusResponse)
def get_qlib_status(db: Session = Depends(get_db)):
    data_path = get_qlib_data_path(db)
    return check_qlib_status(data_path)
