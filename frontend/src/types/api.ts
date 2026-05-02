export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

export interface QlibStatusResponse {
  python_version: string;
  qlib_installed: boolean;
  qlib_version: string | null;
  mlflow_installed: boolean;
  mlflow_version: string | null;
  data_path: string;
  data_path_exists: boolean;
  calendar_exists: boolean;
  instruments_exists: boolean;
  features_exists: boolean;
  ready: boolean;
  warnings: string[];
}

export interface SettingsResponse {
  qlib_data_path: string;
  mlflow_tracking_uri: string;
}

export interface TemplateItem {
  name: string;
  path: string;
}

export interface TemplateListResponse {
  templates: TemplateItem[];
}

export interface TemplateContentResponse {
  name: string;
  content: string;
}

export interface WorkflowSaveRequest {
  name: string;
  content: string;
}

export interface WorkflowSaveResponse {
  name: string;
  path: string;
  message: string;
}

export interface SavedWorkflow {
  filename: string;
  name: string;
  description: string;
}

export interface QrunRequest {
  workflow_name: string;
  working_dir: string;
}

export interface QrunResponse {
  job_id: number;
  status: string;
}

export interface Job {
  id: number;
  type: string;
  status: string;
  workflow_path: string;
  working_dir: string;
  pid: number | null;
  started_at: string | null;
  finished_at: string | null;
  exit_code: number | null;
  log_path: string | null;
}

export interface JobLogResponse {
  job_id: number;
  logs: string;
}

// Phase 3: Experiment Center types

export interface ExperimentSummary {
  experiment_id: string;
  name: string;
  artifact_location: string;
  lifecycle_stage: string;
  run_count: number;
}

export interface ExperimentListResponse {
  experiments: ExperimentSummary[];
  warnings: string[];
}

export interface ExperimentDetailResponse {
  experiment_id: string;
  name: string;
  artifact_location: string;
  lifecycle_stage: string;
  run_count: number;
}

export interface RunSummary {
  run_id: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
  artifact_uri: string | null;
  metrics_count: number;
  params_count: number;
}

export interface RunListResponse {
  experiment_id: string;
  runs: RunSummary[];
}

export interface RunDetailResponse {
  run_id: string;
  experiment_id: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  artifact_uri: string | null;
  params: Record<string, string>;
  metrics: Record<string, number>;
  tags: Record<string, string>;
}

export interface RunParamsResponse {
  run_id: string;
  params: Record<string, string>;
}

export interface RunMetricsResponse {
  run_id: string;
  metrics: Record<string, number>;
}

export interface ArtifactItem {
  path: string;
  is_dir: boolean;
  file_size: number | null;
}

export interface ArtifactListResponse {
  run_id: string;
  path: string;
  artifacts: ArtifactItem[];
}
