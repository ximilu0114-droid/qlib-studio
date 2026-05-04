"""Pydantic schemas for Experiment Center API."""

from __future__ import annotations

from pydantic import BaseModel


class ExperimentSummary(BaseModel):
    experiment_id: str
    name: str
    artifact_location: str
    lifecycle_stage: str
    run_count: int


class ExperimentListResponse(BaseModel):
    experiments: list[ExperimentSummary]
    warnings: list[str]


class ExperimentDetailResponse(BaseModel):
    experiment_id: str
    name: str
    artifact_location: str
    lifecycle_stage: str
    run_count: int


class RunSummary(BaseModel):
    run_id: str
    status: str
    start_time: str | None = None
    end_time: str | None = None
    duration_seconds: float | None = None
    artifact_uri: str | None = None
    metrics_count: int = 0
    params_count: int = 0


class RunListResponse(BaseModel):
    experiment_id: str
    runs: list[RunSummary]


class RunDetailResponse(BaseModel):
    run_id: str
    experiment_id: str
    status: str
    start_time: str | None = None
    end_time: str | None = None
    artifact_uri: str | None = None
    params: dict[str, str]
    metrics: dict[str, float]
    tags: dict[str, str]


class RunParamsResponse(BaseModel):
    run_id: str
    params: dict[str, str]


class RunMetricsResponse(BaseModel):
    run_id: str
    metrics: dict[str, float]


class ArtifactItem(BaseModel):
    path: str
    is_dir: bool
    file_size: int | None = None


class ArtifactListResponse(BaseModel):
    run_id: str
    path: str
    artifacts: list[ArtifactItem]


class MlflowStatusResponse(BaseModel):
    mlflow_tracking_uri: str
    resolved_mlruns_path: str
    path_exists: bool
    experiment_count: int
    run_count: int
    warnings: list[str]
