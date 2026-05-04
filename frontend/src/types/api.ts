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
  rdagent_working_dir: string;
  rdagent_output_dir: string;
  rdagent_env_file: string;
}

export interface RDagentSettingsUpdate {
  rdagent_working_dir?: string;
  rdagent_output_dir?: string;
  rdagent_env_file?: string;
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
  scenario: string | null;
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

export interface MlflowStatusResponse {
  mlflow_tracking_uri: string;
  resolved_mlruns_path: string;
  path_exists: boolean;
  experiment_count: number;
  run_count: number;
  warnings: string[];
}

// Phase 4: Backtest Analyzer types

export interface SummaryMetrics {
  annualized_return: number | null;
  information_ratio: number | null;
  max_drawdown: number | null;
  excess_return_without_cost_annualized_return: number | null;
  excess_return_without_cost_information_ratio: number | null;
  excess_return_without_cost_max_drawdown: number | null;
  excess_return_with_cost_annualized_return: number | null;
  excess_return_with_cost_information_ratio: number | null;
  excess_return_with_cost_max_drawdown: number | null;
}

export interface BacktestSummaryResponse {
  run_id: string;
  summary: SummaryMetrics;
  sources: string[];
  warnings: string[];
}

export interface CurvePoint {
  date: string;
  strategy_nav: number | null;
  benchmark_nav: number | null;
  excess_nav: number | null;
  drawdown: number | null;
  daily_return: number | null;
  benchmark_return: number | null;
  cost: number | null;
}

export interface CurveCoverage {
  start_date: string | null;
  end_date: string | null;
  trading_days: number;
  curve_points: number;
  artifact_source_report: string | null;
  artifact_source_risk: string | null;
}

export interface CurveDataResponse {
  run_id: string;
  curves: CurvePoint[];
  coverage: CurveCoverage | null;
  warnings: string[];
}

export interface RiskRow {
  group: string;
  metric: string;
  value: number | null;
}

export interface RiskTableResponse {
  run_id: string;
  risk_table: RiskRow[];
  warnings: string[];
}

export interface IndicatorPreviewResponse {
  run_id: string;
  columns: string[];
  index_start: string | null;
  index_end: string | null;
  rows: Record<string, unknown>[];
  warnings: string[];
}

export interface CompareRunEntry {
  run_id: string;
  annualized_return: number | null;
  information_ratio: number | null;
  max_drawdown: number | null;
}

export interface BacktestCompareResponse {
  runs: CompareRunEntry[];
  warnings: string[];
}

// Phase 5: RD-Agent types

export interface RDagentStatusResponse {
  python_version: string;
  rdagent_installed: boolean;
  rdagent_version: string | null;
  docker_installed: boolean;
  docker_version: string | null;
  docker_available: boolean;
  env_file_exists: boolean;
  llm_config_detected: boolean;
  working_dir: string;
  output_dir: string;
  output_dir_exists: boolean;
  ready: boolean;
  warnings: string[];
}

export interface RDagentStartRequest {
  scenario: string;
  working_dir?: string;
  extra_args?: string[];
  env_vars?: Record<string, string>;
}

export interface RDagentStartResponse {
  job_id: number;
  status: string;
}

export interface RDagentHealthCheckResponse {
  success: boolean;
  return_code: number;
  stdout: string;
  stderr: string;
  warnings: string[];
}
