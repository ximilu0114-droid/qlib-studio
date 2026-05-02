import type {
  HealthResponse,
  Job,
  JobLogResponse,
  QrunRequest,
  QrunResponse,
  QlibStatusResponse,
  SavedWorkflow,
  SettingsResponse,
  TemplateContentResponse,
  TemplateListResponse,
  WorkflowSaveRequest,
  WorkflowSaveResponse,
  ExperimentListResponse,
  ExperimentDetailResponse,
  RunListResponse,
  RunDetailResponse,
  RunParamsResponse,
  RunMetricsResponse,
  ArtifactListResponse,
} from "../types/api";

const BASE = "/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Keep the HTTP status when the response is not JSON.
    }
    throw new Error(`API error: ${message}`);
  }
  return res.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>(`${BASE}/health`);
}

export async function fetchQlibStatus(): Promise<QlibStatusResponse> {
  return request<QlibStatusResponse>(`${BASE}/qlib/status`);
}

export async function fetchSettings(): Promise<SettingsResponse> {
  return request<SettingsResponse>(`${BASE}/settings`);
}

export async function saveQlibDataPath(
  path: string,
): Promise<SettingsResponse> {
  return request<SettingsResponse>(`${BASE}/settings/qlib-data-path`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qlib_data_path: path }),
  });
}

export async function fetchWorkflowTemplates(): Promise<TemplateListResponse> {
  return request<TemplateListResponse>(`${BASE}/workflows/templates`);
}

export async function fetchTemplateContent(
  templateName: string,
): Promise<TemplateContentResponse> {
  return request<TemplateContentResponse>(
    `${BASE}/workflows/templates/${encodeURIComponent(templateName)}`,
  );
}

export async function saveWorkflow(
  data: WorkflowSaveRequest,
): Promise<WorkflowSaveResponse> {
  return request<WorkflowSaveResponse>(`${BASE}/workflows/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function fetchSavedWorkflows(): Promise<SavedWorkflow[]> {
  return request<SavedWorkflow[]>(`${BASE}/workflows/list`);
}

export async function startQrunJob(data: QrunRequest): Promise<QrunResponse> {
  return request<QrunResponse>(`${BASE}/jobs/qrun`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function fetchJobs(): Promise<Job[]> {
  return request<Job[]>(`${BASE}/jobs`);
}

export async function fetchJob(jobId: number): Promise<Job> {
  return request<Job>(`${BASE}/jobs/${jobId}`);
}

export async function fetchJobLogs(jobId: number): Promise<JobLogResponse> {
  return request<JobLogResponse>(`${BASE}/jobs/${jobId}/logs`);
}

export async function cancelJob(jobId: number): Promise<Job> {
  return request<Job>(`${BASE}/jobs/${jobId}/cancel`, {
    method: "POST",
  });
}

// Phase 3: Settings - MLflow tracking URI

export async function saveMlflowTrackingUri(
  uri: string,
): Promise<SettingsResponse> {
  return request<SettingsResponse>(`${BASE}/settings/mlflow-tracking-uri`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mlflow_tracking_uri: uri }),
  });
}

// Phase 3: Experiment Center API

export async function fetchExperiments(): Promise<ExperimentListResponse> {
  return request<ExperimentListResponse>(`${BASE}/experiments`);
}

export async function fetchExperiment(
  experimentId: string,
): Promise<ExperimentDetailResponse> {
  return request<ExperimentDetailResponse>(
    `${BASE}/experiments/${encodeURIComponent(experimentId)}`,
  );
}

export async function fetchExperimentRuns(
  experimentId: string,
): Promise<RunListResponse> {
  return request<RunListResponse>(
    `${BASE}/experiments/${encodeURIComponent(experimentId)}/runs`,
  );
}

export async function fetchRunDetail(
  runId: string,
): Promise<RunDetailResponse> {
  return request<RunDetailResponse>(
    `${BASE}/runs/${encodeURIComponent(runId)}`,
  );
}

export async function fetchRunParams(
  runId: string,
): Promise<RunParamsResponse> {
  return request<RunParamsResponse>(
    `${BASE}/runs/${encodeURIComponent(runId)}/params`,
  );
}

export async function fetchRunMetrics(
  runId: string,
): Promise<RunMetricsResponse> {
  return request<RunMetricsResponse>(
    `${BASE}/runs/${encodeURIComponent(runId)}/metrics`,
  );
}

export async function fetchRunArtifacts(
  runId: string,
  path: string = "",
): Promise<ArtifactListResponse> {
  const params = path ? `?path=${encodeURIComponent(path)}` : "";
  return request<ArtifactListResponse>(
    `${BASE}/runs/${encodeURIComponent(runId)}/artifacts${params}`,
  );
}
