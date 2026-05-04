"""Backtest Analyzer for Qlib Studio Phase 4.

Uses backtest_artifact_loader for safe artifact loading.
Provides summary metrics, return curves, risk tables, indicator previews,
and multi-run comparison.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.services.backtest_artifact_loader import (
    find_artifact,
    load_pickle_artifact,
)

# Standard artifact paths for 1day frequency
_REPORT_CANDIDATES = [
    "portfolio_analysis/report_normal_1day.pkl",
    "report_normal_1day.pkl",
]
_REPORT_BASENAME = "report_normal_1day.pkl"

_PORT_ANALYSIS_CANDIDATES = [
    "portfolio_analysis/port_analysis_1day.pkl",
    "port_analysis_1day.pkl",
]
_PORT_ANALYSIS_BASENAME = "port_analysis_1day.pkl"

_INDICATOR_CANDIDATES = [
    "portfolio_analysis/indicator_analysis_1day.pkl",
    "indicator_analysis_1day.pkl",
]
_INDICATOR_BASENAME = "indicator_analysis_1day.pkl"

_PRED_PATH = "pred.pkl"

# Keys we look for in MLflow run metrics as a primary source
_MLFLOW_SUMMARY_KEYS = [
    "annualized_return",
    "information_ratio",
    "max_drawdown",
]

_MLFLOW_EXCESS_WO_KEYS = [
    "excess_return_without_cost_annualized_return",
    "excess_return_without_cost_information_ratio",
    "excess_return_without_cost_max_drawdown",
]

_MLFLOW_EXCESS_WC_KEYS = [
    "excess_return_with_cost_annualized_return",
    "excess_return_with_cost_information_ratio",
    "excess_return_with_cost_max_drawdown",
]

_ALL_SUMMARY_KEYS = (
    _MLFLOW_SUMMARY_KEYS + _MLFLOW_EXCESS_WO_KEYS + _MLFLOW_EXCESS_WC_KEYS
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_float(val: Any) -> float | None:
    """Convert *val* to a plain float, returning None for NaN / bad types."""
    if val is None:
        return None
    try:
        f = float(val)
        if np.isnan(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def _to_python(val: Any) -> Any:
    """Convert numpy / pandas scalars to plain Python types; NaN/NaT/NA -> None.

    Every value returned by this function is JSON-serializable by FastAPI.
    """
    # --- None / NA / NaT ---------------------------------------------------
    if val is None:
        return None
    if val is pd.NA:
        return None

    # --- numpy arrays -> recursive list ------------------------------------
    if isinstance(val, np.ndarray):
        return [_to_python(v) for v in val.tolist()]

    # --- list / tuple -> recursive conversion ------------------------------
    if isinstance(val, (list, tuple)):
        return [_to_python(v) for v in val]

    # --- dict -> recursive conversion --------------------------------------
    if isinstance(val, dict):
        return {str(k): _to_python(v) for k, v in val.items()}

    # --- pandas Timestamp --------------------------------------------------
    if isinstance(val, pd.Timestamp):
        if pd.isna(val):
            return None
        return val.isoformat()

    # --- numpy datetime64 --------------------------------------------------
    if isinstance(val, np.datetime64):
        ts = pd.Timestamp(val)
        if pd.isna(ts):
            return None
        return ts.isoformat()

    # --- pandas Timedelta --------------------------------------------------
    if isinstance(val, pd.Timedelta):
        if pd.isna(val):
            return None
        return val.total_seconds()

    # --- numpy integer -----------------------------------------------------
    if isinstance(val, (np.integer,)):
        return int(val)

    # --- numpy floating -> float, NaN -> None ------------------------------
    if isinstance(val, (np.floating,)):
        f = float(val)
        return None if np.isnan(f) else f

    # --- numpy bool --------------------------------------------------------
    if isinstance(val, np.bool_):
        return bool(val)

    # --- plain float, NaN -> None ------------------------------------------
    if isinstance(val, float):
        return None if np.isnan(val) else val

    # --- pandas NA-like (isna catches NaT for generic objects) -------------
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass

    return val


def _try_mlflow_metrics(run_id: str, tracking_uri: str | None = None) -> dict[str, float | None]:
    """Attempt to read summary metrics directly from MLflow run metadata."""
    result: dict[str, float | None] = {}
    try:
        import mlflow

        if tracking_uri:
            mlflow.set_tracking_uri(tracking_uri)
        client = mlflow.MlflowClient()
        run = client.get_run(run_id)
        metrics = run.data.metrics or {}
        for key in _ALL_SUMMARY_KEYS:
            result[key] = _safe_float(metrics.get(key))
    except Exception:
        pass
    return result


def _extract_from_port_analysis(port_analysis: Any) -> dict[str, float | None]:
    """Extract the 9 summary fields from a port_analysis artifact.

    Handles both:
    - pandas DataFrame with MultiIndex (standard Qlib output)
    - plain dict fallback
    """
    fields = {
        "annualized_return": None,
        "information_ratio": None,
        "max_drawdown": None,
        "excess_return_without_cost_annualized_return": None,
        "excess_return_without_cost_information_ratio": None,
        "excess_return_without_cost_max_drawdown": None,
        "excess_return_with_cost_annualized_return": None,
        "excess_return_with_cost_information_ratio": None,
        "excess_return_with_cost_max_drawdown": None,
    }

    # --- DataFrame path ---------------------------------------------------
    if isinstance(port_analysis, pd.DataFrame):
        try:
            # Qlib's typical structure:
            #   Index level 0: "excess_return_without_cost", "excess_return_with_cost"
            #   Index level 1: metric names (annualized_return, information_ratio, max_drawdown, ...)
            #   Column: "risk"
            levels = port_analysis.index.get_level_values(0).unique()

            if "excess_return_without_cost" in levels:
                sub = port_analysis.loc["excess_return_without_cost"]
                for metric in ("annualized_return", "information_ratio", "max_drawdown"):
                    if metric in sub.index:
                        val = sub.loc[metric]
                        # Handle both Series (multi-col) and scalar
                        v = val["risk"] if "risk" in val.index else val.iloc[0] if hasattr(val, "iloc") else val
                        fields[f"excess_return_without_cost_{metric}"] = _safe_float(v)

            if "excess_return_with_cost" in levels:
                sub = port_analysis.loc["excess_return_with_cost"]
                for metric in ("annualized_return", "information_ratio", "max_drawdown"):
                    if metric in sub.index:
                        val = sub.loc[metric]
                        v = val["risk"] if "risk" in val.index else val.iloc[0] if hasattr(val, "iloc") else val
                        fields[f"excess_return_with_cost_{metric}"] = _safe_float(v)

            # Also try flat index (some Qlib versions store without group prefix)
            for metric in ("annualized_return", "information_ratio", "max_drawdown"):
                if metric in port_analysis.index:
                    val = port_analysis.loc[metric]
                    v = val["risk"] if "risk" in val.index else val.iloc[0] if hasattr(val, "iloc") else val
                    fields[metric] = _safe_float(v)

            # Derive base fields from excess_return_without_cost as fallback
            for metric in ("annualized_return", "information_ratio", "max_drawdown"):
                if fields[metric] is None:
                    fields[metric] = (
                        fields.get(f"excess_return_without_cost_{metric}")
                        or fields.get(f"excess_return_with_cost_{metric}")
                    )

        except Exception:
            pass
        return fields

    # --- Dict fallback -----------------------------------------------------
    if isinstance(port_analysis, dict):
        # Nested keys like {"excess_return_without_cost": {"annualized_return": ...}}
        for group, prefix in [
            ("excess_return_without_cost", "excess_return_without_cost_"),
            ("excess_return_with_cost", "excess_return_with_cost_"),
        ]:
            sub = port_analysis.get(group)
            if isinstance(sub, dict):
                for metric in ("annualized_return", "information_ratio", "max_drawdown"):
                    fields[f"{prefix}{metric}"] = _safe_float(sub.get(metric))

        # Flat keys like {"annualized_return": 0.15, ...}
        for metric in ("annualized_return", "information_ratio", "max_drawdown"):
            fields[metric] = _safe_float(port_analysis.get(metric))

        # Derive base fields from excess_return_without_cost as fallback
        for metric in ("annualized_return", "information_ratio", "max_drawdown"):
            if fields[metric] is None:
                fields[metric] = (
                    fields.get(f"excess_return_without_cost_{metric}")
                    or fields.get(f"excess_return_with_cost_{metric}")
                )

        return fields

    return fields


def _build_nav_curves(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Build the curve list from a report_normal DataFrame.

    Expected columns (at minimum): return, bench (optional), cost (optional).
    """
    rows: list[dict[str, Any]] = []

    has_return = "return" in df.columns
    has_bench = "bench" in df.columns
    has_cost = "cost" in df.columns

    if not has_return:
        return rows

    ret = df["return"].fillna(0.0)
    bench = df["bench"].fillna(0.0) if has_bench else pd.Series(0.0, index=df.index)
    cost = df["cost"].fillna(0.0) if has_cost else pd.Series(0.0, index=df.index)

    strategy_nav = (1.0 + ret).cumprod()
    benchmark_nav = (1.0 + bench).cumprod()
    excess_nav = (1.0 + ret - bench).cumprod()

    # Drawdown from strategy nav
    running_max = strategy_nav.cummax()
    drawdown = (strategy_nav - running_max) / running_max

    for i in range(len(df)):
        idx = df.index[i]
        date_str = str(idx) if not hasattr(idx, "strftime") else idx.strftime("%Y-%m-%d")

        row: dict[str, Any] = {
            "date": date_str,
            "strategy_nav": _to_python(strategy_nav.iloc[i]),
            "benchmark_nav": _to_python(benchmark_nav.iloc[i]),
            "excess_nav": _to_python(excess_nav.iloc[i]),
            "drawdown": _to_python(drawdown.iloc[i]),
            "daily_return": _to_python(ret.iloc[i]),
            "benchmark_return": _to_python(bench.iloc[i]),
            "cost": _to_python(cost.iloc[i]) if has_cost else None,
        }
        rows.append(row)

    return rows


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_backtest_summary(
    run_id: str, tracking_uri: str | None = None
) -> dict[str, Any]:
    """Return summary metrics for a single run.

    Source priority: MLflow run metrics -> port_analysis artifact.
    """
    warnings: list[str] = []
    sources: list[str] = []

    summary: dict[str, float | None] = {k: None for k in _ALL_SUMMARY_KEYS}

    # 1. Try MLflow run metrics first
    mlflow_vals = _try_mlflow_metrics(run_id, tracking_uri)
    mlfilled = sum(1 for v in mlflow_vals.values() if v is not None)
    if mlfilled > 0:
        sources.append("mlflow_metrics")
        summary.update(mlflow_vals)

    # 2. Try port_analysis artifact for anything still missing
    missing = [k for k, v in summary.items() if v is None]
    if missing:
        art = find_artifact(run_id, _PORT_ANALYSIS_CANDIDATES, _PORT_ANALYSIS_BASENAME, tracking_uri)
        warnings.extend(art["warnings"])
        if art["path"] is not None:
            result = load_pickle_artifact(run_id, art["resolved_as"] or _PORT_ANALYSIS_CANDIDATES[0], tracking_uri)
            if result["data"] is not None:
                sources.append(art["resolved_as"] or _PORT_ANALYSIS_CANDIDATES[0])
                extracted = _extract_from_port_analysis(result["data"])
                for key in missing:
                    if extracted.get(key) is not None:
                        summary[key] = extracted[key]
            else:
                warnings.extend(result["warnings"])

    # Final warn if everything is still null
    if all(v is None for v in summary.values()):
        warnings.append("No summary metrics found from MLflow or artifacts")

    return {
        "run_id": run_id,
        "summary": summary,
        "sources": sources,
        "warnings": warnings,
    }


def get_return_curves(
    run_id: str, tracking_uri: str | None = None
) -> dict[str, Any]:
    """Load report_normal and compute nav / drawdown curves."""
    warnings: list[str] = []

    art = find_artifact(run_id, _REPORT_CANDIDATES, _REPORT_BASENAME, tracking_uri)
    warnings.extend(art["warnings"])

    if art["path"] is None:
        return {"run_id": run_id, "curves": [], "coverage": None, "warnings": warnings}

    result = load_pickle_artifact(run_id, art["resolved_as"] or _REPORT_CANDIDATES[0], tracking_uri)
    if result["data"] is None:
        warnings.extend(result["warnings"])
        return {"run_id": run_id, "curves": [], "coverage": None, "warnings": warnings}

    report = result["data"]

    if not isinstance(report, pd.DataFrame):
        warnings.append(f"report_normal is {type(report).__name__}, expected DataFrame")
        return {"run_id": run_id, "curves": [], "coverage": None, "warnings": warnings}

    try:
        curves = _build_nav_curves(report)
    except Exception as e:
        warnings.append(f"Failed to build curves: {e}")
        curves = []

    # Build coverage info
    coverage: dict[str, Any] = {
        "start_date": None,
        "end_date": None,
        "trading_days": len(curves),
        "curve_points": len(curves),
        "artifact_source_report": art["resolved_as"] or _REPORT_CANDIDATES[0],
        "artifact_source_risk": None,
    }
    if curves:
        coverage["start_date"] = curves[0].get("date")
        coverage["end_date"] = curves[-1].get("date")

    if len(curves) < 60:
        warnings.append(
            f"Return curve has only {len(curves)} trading days. "
            "Consider a longer test period for more reliable backtest results."
        )

    return {"run_id": run_id, "curves": curves, "coverage": coverage, "warnings": warnings}


def get_risk_table(
    run_id: str, tracking_uri: str | None = None
) -> dict[str, Any]:
    """Load port_analysis and return a flat list of group/metric/value rows."""
    warnings: list[str] = []

    art = find_artifact(run_id, _PORT_ANALYSIS_CANDIDATES, _PORT_ANALYSIS_BASENAME, tracking_uri)
    warnings.extend(art["warnings"])

    if art["path"] is None:
        return {"run_id": run_id, "risk_table": [], "warnings": warnings}

    result = load_pickle_artifact(run_id, art["resolved_as"] or _PORT_ANALYSIS_CANDIDATES[0], tracking_uri)
    if result["data"] is None:
        warnings.extend(result["warnings"])
        return {"run_id": run_id, "risk_table": [], "warnings": warnings}

    port_analysis = result["data"]
    risk_table: list[dict[str, Any]] = []

    if isinstance(port_analysis, pd.DataFrame):
        try:
            levels = port_analysis.index.get_level_values(0).unique()
            for group in levels:
                sub = port_analysis.loc[group]
                for metric_name in sub.index:
                    val = sub.loc[metric_name]
                    v = val["risk"] if isinstance(val, pd.Series) and "risk" in val.index else val
                    risk_table.append({
                        "group": str(group),
                        "metric": str(metric_name),
                        "value": _safe_float(v),
                    })
        except Exception as e:
            warnings.append(f"Failed to parse port_analysis DataFrame: {e}")

    elif isinstance(port_analysis, dict):
        try:
            for key, val in port_analysis.items():
                if isinstance(val, dict):
                    for metric_name, metric_val in val.items():
                        risk_table.append({
                            "group": str(key),
                            "metric": str(metric_name),
                            "value": _safe_float(metric_val),
                        })
                else:
                    risk_table.append({
                        "group": "default",
                        "metric": str(key),
                        "value": _safe_float(val),
                    })
        except Exception as e:
            warnings.append(f"Failed to parse port_analysis dict: {e}")
    else:
        warnings.append(
            f"port_analysis is {type(port_analysis).__name__}, "
            "expected DataFrame or dict"
        )

    return {"run_id": run_id, "risk_table": risk_table, "warnings": warnings}


def get_indicator_preview(
    run_id: str, tracking_uri: str | None = None
) -> dict[str, Any]:
    """Load indicator_analysis and return a simple preview table."""
    warnings: list[str] = []

    art = find_artifact(run_id, _INDICATOR_CANDIDATES, _INDICATOR_BASENAME, tracking_uri)
    warnings.extend(art["warnings"])

    if art["path"] is None:
        return {
            "run_id": run_id,
            "columns": [],
            "index_start": None,
            "index_end": None,
            "rows": [],
            "warnings": warnings,
        }

    result = load_pickle_artifact(run_id, art["resolved_as"] or _INDICATOR_CANDIDATES[0], tracking_uri)
    if result["data"] is None:
        warnings.extend(result["warnings"])
        return {
            "run_id": run_id,
            "columns": [],
            "index_start": None,
            "index_end": None,
            "rows": [],
            "warnings": warnings,
        }

    indicator = result["data"]

    if isinstance(indicator, pd.DataFrame):
        try:
            columns = [str(c) for c in indicator.columns]
            index_start = str(indicator.index[0]) if len(indicator) > 0 else None
            index_end = str(indicator.index[-1]) if len(indicator) > 0 else None

            preview = indicator.head(50)
            rows: list[dict[str, Any]] = []
            for idx, row in preview.iterrows():
                entry: dict[str, Any] = {"_index": str(idx)}
                for col in indicator.columns:
                    entry[str(col)] = _to_python(row[col])
                rows.append(entry)

            return {
                "run_id": run_id,
                "columns": columns,
                "index_start": index_start,
                "index_end": index_end,
                "rows": rows,
                "warnings": warnings,
            }
        except Exception as e:
            warnings.append(f"Failed to read indicator DataFrame: {e}")
            return {
                "run_id": run_id,
                "columns": [],
                "index_start": None,
                "index_end": None,
                "rows": [],
                "warnings": warnings,
            }

    elif isinstance(indicator, dict):
        try:
            columns = list(indicator.keys())
            rows = []
            # Show first entry as preview
            first_val = next(iter(indicator.values()), None)
            if isinstance(first_val, (list, pd.Series)):
                for i, v in enumerate(list(first_val)[:50]):
                    rows.append({"_index": i, **{str(k): _to_python(indicator[k][i]) for k in columns if i < len(indicator[k])}})
            return {
                "run_id": run_id,
                "columns": [str(c) for c in columns],
                "index_start": "0" if rows else None,
                "index_end": str(len(rows) - 1) if rows else None,
                "rows": rows,
                "warnings": warnings,
            }
        except Exception as e:
            warnings.append(f"Failed to read indicator dict: {e}")
            return {
                "run_id": run_id,
                "columns": [],
                "index_start": None,
                "index_end": None,
                "rows": [],
                "warnings": warnings,
            }

    else:
        warnings.append(
            f"indicator is {type(indicator).__name__}, "
            "expected DataFrame or dict"
        )
        return {
            "run_id": run_id,
            "columns": [],
            "index_start": None,
            "index_end": None,
            "rows": [],
            "warnings": warnings,
        }


def compare_runs(
    run_ids: list[str], tracking_uri: str | None = None
) -> dict[str, Any]:
    """Compare key metrics across multiple runs."""
    warnings: list[str] = []
    runs: list[dict[str, Any]] = []

    for rid in run_ids:
        summary_result = get_backtest_summary(rid, tracking_uri)
        warnings.extend(summary_result["warnings"])
        s = summary_result["summary"]

        runs.append({
            "run_id": rid,
            "annualized_return": s.get("annualized_return"),
            "information_ratio": s.get("information_ratio"),
            "max_drawdown": s.get("max_drawdown"),
        })

    return {"runs": runs, "warnings": warnings}
