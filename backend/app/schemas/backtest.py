"""Pydantic schemas for Backtest Analyzer API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class CompareRequest(BaseModel):
    run_ids: list[str]


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------

class SummaryMetrics(BaseModel):
    annualized_return: float | None = None
    information_ratio: float | None = None
    max_drawdown: float | None = None
    excess_return_without_cost_annualized_return: float | None = None
    excess_return_without_cost_information_ratio: float | None = None
    excess_return_without_cost_max_drawdown: float | None = None
    excess_return_with_cost_annualized_return: float | None = None
    excess_return_with_cost_information_ratio: float | None = None
    excess_return_with_cost_max_drawdown: float | None = None


# ---------------------------------------------------------------------------
# /backtest/runs/{run_id}/summary
# ---------------------------------------------------------------------------

class BacktestSummaryResponse(BaseModel):
    run_id: str
    summary: SummaryMetrics = SummaryMetrics()
    sources: list[str] = []
    warnings: list[str] = []


# ---------------------------------------------------------------------------
# /backtest/runs/{run_id}/curves
# ---------------------------------------------------------------------------

class CurvePoint(BaseModel):
    date: str
    strategy_nav: float | None = None
    benchmark_nav: float | None = None
    excess_nav: float | None = None
    drawdown: float | None = None
    daily_return: float | None = None
    benchmark_return: float | None = None
    cost: float | None = None


class CurveCoverage(BaseModel):
    start_date: str | None = None
    end_date: str | None = None
    trading_days: int = 0
    curve_points: int = 0
    artifact_source_report: str | None = None
    artifact_source_risk: str | None = None


class CurveDataResponse(BaseModel):
    run_id: str
    curves: list[CurvePoint] = []
    coverage: CurveCoverage | None = None
    warnings: list[str] = []


# ---------------------------------------------------------------------------
# /backtest/runs/{run_id}/risk
# ---------------------------------------------------------------------------

class RiskRow(BaseModel):
    group: str
    metric: str
    value: float | None = None


class RiskTableResponse(BaseModel):
    run_id: str
    risk_table: list[RiskRow] = []
    warnings: list[str] = []


# ---------------------------------------------------------------------------
# /backtest/runs/{run_id}/indicators
# ---------------------------------------------------------------------------

class IndicatorPreviewResponse(BaseModel):
    run_id: str
    columns: list[str] = []
    index_start: str | None = None
    index_end: str | None = None
    rows: list[dict[str, Any]] = []
    warnings: list[str] = []


# ---------------------------------------------------------------------------
# /backtest/compare
# ---------------------------------------------------------------------------

class CompareRunEntry(BaseModel):
    run_id: str
    annualized_return: float | None = None
    information_ratio: float | None = None
    max_drawdown: float | None = None


class BacktestCompareResponse(BaseModel):
    runs: list[CompareRunEntry] = []
    warnings: list[str] = []
