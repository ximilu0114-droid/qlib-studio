"""Backtest Analyzer API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.backtest import (
    BacktestCompareResponse,
    BacktestSummaryResponse,
    CompareRequest,
    CompareRunEntry,
    CurveCoverage,
    CurveDataResponse,
    CurvePoint,
    IndicatorPreviewResponse,
    RiskRow,
    RiskTableResponse,
    SummaryMetrics,
)
from app.services import backtest_analyzer
from app.services.backtest_artifact_loader import run_exists
from app.services.settings_store import get_mlflow_tracking_uri

router = APIRouter(tags=["backtest"])


def _get_tracking_uri(db: Session) -> str | None:
    try:
        return get_mlflow_tracking_uri(db)
    except Exception:
        return None


def _ensure_run_exists(run_id: str, tracking_uri: str | None) -> None:
    """Raise 404 if the run does not exist in MLflow."""
    if not run_exists(run_id, tracking_uri):
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")


# ---------------------------------------------------------------------------
# Single-run endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/backtest/runs/{run_id}/summary",
    response_model=BacktestSummaryResponse,
)
def get_summary(run_id: str, db: Session = Depends(get_db)):
    """Get backtest summary metrics for a run."""
    tracking_uri = _get_tracking_uri(db)
    _ensure_run_exists(run_id, tracking_uri)

    result = backtest_analyzer.get_backtest_summary(run_id, tracking_uri)
    return BacktestSummaryResponse(
        run_id=result["run_id"],
        summary=SummaryMetrics(**result["summary"]),
        sources=result.get("sources", []),
        warnings=result.get("warnings", []),
    )


@router.get(
    "/backtest/runs/{run_id}/curves",
    response_model=CurveDataResponse,
)
def get_curves(run_id: str, db: Session = Depends(get_db)):
    """Get return curves (strategy nav, benchmark nav, drawdown, etc.)."""
    tracking_uri = _get_tracking_uri(db)
    _ensure_run_exists(run_id, tracking_uri)

    result = backtest_analyzer.get_return_curves(run_id, tracking_uri)
    coverage_data = result.get("coverage")
    coverage = CurveCoverage(**coverage_data) if coverage_data else None
    return CurveDataResponse(
        run_id=result["run_id"],
        curves=[CurvePoint(**row) for row in result.get("curves", [])],
        coverage=coverage,
        warnings=result.get("warnings", []),
    )


@router.get(
    "/backtest/runs/{run_id}/risk",
    response_model=RiskTableResponse,
)
def get_risk(run_id: str, db: Session = Depends(get_db)):
    """Get the risk analysis table for a run."""
    tracking_uri = _get_tracking_uri(db)
    _ensure_run_exists(run_id, tracking_uri)

    result = backtest_analyzer.get_risk_table(run_id, tracking_uri)
    return RiskTableResponse(
        run_id=result["run_id"],
        risk_table=[RiskRow(**row) for row in result.get("risk_table", [])],
        warnings=result.get("warnings", []),
    )


@router.get(
    "/backtest/runs/{run_id}/indicators",
    response_model=IndicatorPreviewResponse,
)
def get_indicators(run_id: str, db: Session = Depends(get_db)):
    """Get a preview of indicator analysis data."""
    tracking_uri = _get_tracking_uri(db)
    _ensure_run_exists(run_id, tracking_uri)

    result = backtest_analyzer.get_indicator_preview(run_id, tracking_uri)
    return IndicatorPreviewResponse(
        run_id=result["run_id"],
        columns=result.get("columns", []),
        index_start=result.get("index_start"),
        index_end=result.get("index_end"),
        rows=result.get("rows", []),
        warnings=result.get("warnings", []),
    )


# ---------------------------------------------------------------------------
# Multi-run comparison
# ---------------------------------------------------------------------------


@router.post(
    "/backtest/compare",
    response_model=BacktestCompareResponse,
)
def compare_runs(body: CompareRequest, db: Session = Depends(get_db)):
    """Compare key metrics across multiple runs."""
    tracking_uri = _get_tracking_uri(db)

    if not body.run_ids:
        raise HTTPException(status_code=400, detail="run_ids must not be empty")

    result = backtest_analyzer.compare_runs(body.run_ids, tracking_uri)
    return BacktestCompareResponse(
        runs=[CompareRunEntry(**r) for r in result.get("runs", [])],
        warnings=result.get("warnings", []),
    )
