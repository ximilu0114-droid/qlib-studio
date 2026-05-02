import { useState, useEffect, useCallback } from "react";
import type {
  ExperimentSummary,
  RunSummary,
  RunDetailResponse,
  ArtifactItem,
} from "../types/api";
import {
  fetchSettings,
  fetchExperiments,
  fetchExperimentRuns,
  fetchRunDetail,
  fetchRunArtifacts,
  saveMlflowTrackingUri,
} from "../api/client";

type View = "experiments" | "runs" | "detail";

export default function ExperimentCenter() {
  const [view, setView] = useState<View>("experiments");
  const [mlflowAvailable, setMlflowAvailable] = useState<boolean | null>(null);
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentSummary | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetailResponse | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [artifactPath, setArtifactPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [trackingUriInput, setTrackingUriInput] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error";

  const addError = (msg: string) => {
    setErrors((prev) => (prev.includes(msg) ? prev : [...prev, msg]));
  };

  const clearErrors = () => setErrors([]);

  // Load settings to get tracking URI
  const loadSettings = useCallback(async () => {
    try {
      const settings = await fetchSettings();
      setTrackingUriInput(settings.mlflow_tracking_uri || "file:./mlruns");
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }, []);

  // Load experiments
  const loadExperiments = useCallback(async () => {
    try {
      const data = await fetchExperiments();
      setExperiments(data.experiments);
      setWarnings(data.warnings || []);
      setMlflowAvailable(true);
      clearErrors();
    } catch (error) {
      console.error("Failed to load experiments:", error);
      addError(`Failed to load experiments. ${getErrorMessage(error)}`);
      setMlflowAvailable(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadSettings();
      await loadExperiments();
      setLoading(false);
    };
    init();
  }, [loadSettings, loadExperiments]);

  // Handle tracking URI save
  const handleSaveTrackingUri = async () => {
    if (!trackingUriInput.trim()) return;
    try {
      await saveMlflowTrackingUri(trackingUriInput.trim());
      await loadExperiments();
      clearErrors();
    } catch (error) {
      console.error("Failed to save tracking URI:", error);
      addError(`Failed to save tracking URI. ${getErrorMessage(error)}`);
    }
  };

  // Select experiment and load runs
  const handleSelectExperiment = async (exp: ExperimentSummary) => {
    setSelectedExperiment(exp);
    setSelectedRun(null);
    setArtifacts([]);
    setView("runs");
    try {
      const data = await fetchExperimentRuns(exp.experiment_id);
      setRuns(data.runs);
      clearErrors();
    } catch (error) {
      console.error("Failed to load runs:", error);
      addError(`Failed to load runs. ${getErrorMessage(error)}`);
    }
  };

  // Select run and load details
  const handleSelectRun = async (run: RunSummary) => {
    try {
      const detail = await fetchRunDetail(run.run_id);
      setSelectedRun(detail);
      setArtifactPath("");
      setView("detail");

      // Load root artifacts
      const artData = await fetchRunArtifacts(run.run_id);
      setArtifacts(artData.artifacts);
      clearErrors();
    } catch (error) {
      console.error("Failed to load run details:", error);
      addError(`Failed to load run details. ${getErrorMessage(error)}`);
    }
  };

  // Navigate into artifact subdirectory
  const handleArtifactNavigate = async (path: string) => {
    if (!selectedRun) return;
    try {
      setArtifactPath(path);
      const artData = await fetchRunArtifacts(selectedRun.run_id, path);
      setArtifacts(artData.artifacts);
    } catch (error) {
      console.error("Failed to load artifacts:", error);
      addError(`Failed to load artifacts. ${getErrorMessage(error)}`);
    }
  };

  // Go back
  const handleBack = () => {
    if (view === "detail") {
      setView("runs");
      setSelectedRun(null);
      setArtifacts([]);
    } else if (view === "runs") {
      setView("experiments");
      setSelectedExperiment(null);
      setRuns([]);
    }
  };

  // Format timestamp
  const formatTime = (ts: string | null) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleString();
  };

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "-";
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  // Format metric value
  const formatMetric = (value: number) => {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(6);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {errors.length > 0 && (
        <div className="bg-error-container border border-outline-variant rounded-lg p-4">
          <div className="flex items-start">
            <span className="material-symbols-outlined text-on-error-container mr-3 mt-0.5">
              error
            </span>
            <div className="flex-1 space-y-1">
              {errors.map((msg, i) => (
                <p key={i} className="font-body-sm text-on-error-container">
                  {msg}
                </p>
              ))}
            </div>
            <button
              onClick={clearErrors}
              className="text-on-error-container hover:opacity-70"
              aria-label="Dismiss errors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Warnings Display */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="material-symbols-outlined text-yellow-600 mr-3 mt-0.5">
              warning
            </span>
            <div className="flex-1 space-y-1">
              {warnings.map((msg, i) => (
                <p key={i} className="font-body-sm text-yellow-800">
                  {msg}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MLflow Status & Tracking URI Config */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-body-sm text-on-surface font-semibold">
            MLflow Configuration
          </h3>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              mlflowAvailable
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {mlflowAvailable ? "Connected" : "Not Available"}
          </span>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={trackingUriInput}
            onChange={(e) => setTrackingUriInput(e.target.value)}
            placeholder="file:./mlruns or https://remote-server"
            className="flex-1 px-3 py-2 border border-outline-variant rounded font-body-sm text-on-surface bg-surface-container-low focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSaveTrackingUri}
            className="bg-primary text-on-primary px-4 py-2 rounded font-body-sm hover:opacity-90"
          >
            Save
          </button>
        </div>
        <p className="text-on-surface-variant font-body-sm mt-2">
          Accepts: file:./mlruns, /absolute/path, or https://remote-server
        </p>
      </div>

      {/* Navigation Breadcrumb */}
      {view !== "experiments" && (
        <button
          onClick={handleBack}
          className="flex items-center text-primary hover:underline font-body-sm"
        >
          <span className="material-symbols-outlined text-[16px] mr-1">
            arrow_back
          </span>
          {view === "runs"
            ? "Back to Experiments"
            : "Back to Runs"}
        </button>
      )}

      {/* Experiments List */}
      {view === "experiments" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant">
            <h3 className="font-body-sm text-on-surface font-semibold">
              Experiments ({experiments.length})
            </h3>
          </div>
          {experiments.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block">
                science
              </span>
              <p className="font-body-sm">No experiments found</p>
              <p className="text-xs mt-1">
                Run a Qlib workflow to create experiments
              </p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {experiments.map((exp) => (
                <button
                  key={exp.experiment_id}
                  onClick={() => handleSelectExperiment(exp)}
                  className="w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-body-sm text-on-surface font-medium">
                      {exp.name}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {exp.run_count} run{exp.run_count !== 1 ? "s" : ""} · ID: {exp.experiment_id}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Runs List */}
      {view === "runs" && selectedExperiment && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant">
            <h3 className="font-body-sm text-on-surface font-semibold">
              Runs in &quot;{selectedExperiment.name}&quot; ({runs.length})
            </h3>
          </div>
          {runs.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block">
                hourglass_empty
              </span>
              <p className="font-body-sm">No runs in this experiment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                      Run ID
                    </th>
                    <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                      Duration
                    </th>
                    <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                      Metrics
                    </th>
                    <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                      Params
                    </th>
                    <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                      Started
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {runs.map((run) => (
                    <tr
                      key={run.run_id}
                      onClick={() => handleSelectRun(run)}
                      className="hover:bg-surface-container-low cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2 font-body-sm text-on-surface font-mono text-xs">
                        {run.run_id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            run.status === "FINISHED"
                              ? "bg-green-100 text-green-800"
                              : run.status === "RUNNING"
                                ? "bg-blue-100 text-blue-800"
                                : run.status === "FAILED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-body-sm text-on-surface-variant">
                        {formatDuration(run.duration_seconds)}
                      </td>
                      <td className="px-4 py-2 font-body-sm text-on-surface-variant">
                        {run.metrics_count}
                      </td>
                      <td className="px-4 py-2 font-body-sm text-on-surface-variant">
                        {run.params_count}
                      </td>
                      <td className="px-4 py-2 font-body-sm text-on-surface-variant">
                        {formatTime(run.start_time)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Run Detail */}
      {view === "detail" && selectedRun && (
        <div className="space-y-6">
          {/* Run Info */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
            <h3 className="font-body-sm text-on-surface font-semibold mb-3">
              Run: {selectedRun.run_id.substring(0, 8)}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-on-surface-variant">Status</p>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedRun.status === "FINISHED"
                      ? "bg-green-100 text-green-800"
                      : selectedRun.status === "RUNNING"
                        ? "bg-blue-100 text-blue-800"
                        : selectedRun.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {selectedRun.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Started</p>
                <p className="font-body-sm text-on-surface">
                  {formatTime(selectedRun.start_time)}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Ended</p>
                <p className="font-body-sm text-on-surface">
                  {formatTime(selectedRun.end_time)}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Run ID</p>
                <p className="font-body-sm text-on-surface font-mono text-xs truncate">
                  {selectedRun.run_id}
                </p>
              </div>
            </div>
          </div>

          {/* Params & Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Params */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant">
                <h3 className="font-body-sm text-on-surface font-semibold">
                  Parameters ({Object.keys(selectedRun.params).length})
                </h3>
              </div>
              {Object.keys(selectedRun.params).length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-sm">
                  No parameters
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <tbody className="divide-y divide-outline-variant">
                      {Object.entries(selectedRun.params).map(([key, value]) => (
                        <tr key={key}>
                          <td className="px-4 py-2 font-body-sm text-on-surface-variant font-medium whitespace-nowrap">
                            {key}
                          </td>
                          <td className="px-4 py-2 font-body-sm text-on-surface font-mono text-xs break-all">
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant">
                <h3 className="font-body-sm text-on-surface font-semibold">
                  Metrics ({Object.keys(selectedRun.metrics).length})
                </h3>
              </div>
              {Object.keys(selectedRun.metrics).length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-sm">
                  No metrics
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <tbody className="divide-y divide-outline-variant">
                      {Object.entries(selectedRun.metrics).map(([key, value]) => (
                        <tr key={key}>
                          <td className="px-4 py-2 font-body-sm text-on-surface-variant font-medium whitespace-nowrap">
                            {key}
                          </td>
                          <td className="px-4 py-2 font-body-sm text-on-surface font-mono">
                            {formatMetric(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Artifacts */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant">
              <h3 className="font-body-sm text-on-surface font-semibold">
                Artifacts
                {artifactPath && (
                  <span className="text-on-surface-variant font-normal ml-2">
                    / {artifactPath}
                  </span>
                )}
              </h3>
            </div>
            {artifacts.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 block">
                  folder_open
                </span>
                <p className="font-body-sm">No artifacts</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {/* Navigate up button */}
                {artifactPath && (
                  <button
                    onClick={() => {
                      const parent = artifactPath.split("/").slice(0, -1).join("/");
                      handleArtifactNavigate(parent);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-low transition-colors flex items-center"
                  >
                    <span className="material-symbols-outlined text-[18px] mr-2 text-on-surface-variant">
                      folder
                    </span>
                    <span className="font-body-sm text-on-surface">..</span>
                  </button>
                )}
                {artifacts.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (item.is_dir) {
                        handleArtifactNavigate(item.path);
                      }
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-surface-container-low transition-colors flex items-center ${
                      !item.is_dir ? "cursor-default" : ""
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] mr-2 text-on-surface-variant">
                      {item.is_dir ? "folder" : "description"}
                    </span>
                    <span className="font-body-sm text-on-surface flex-1">
                      {item.path.split("/").pop()}
                    </span>
                    {!item.is_dir && item.file_size !== null && (
                      <span className="text-xs text-on-surface-variant">
                        {(item.file_size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tags (collapsed by default) */}
          {Object.keys(selectedRun.tags).length > 0 && (
            <details className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer hover:bg-surface-container-low">
                <span className="font-body-sm text-on-surface font-semibold">
                  Tags ({Object.keys(selectedRun.tags).length})
                </span>
              </summary>
              <div className="border-t border-outline-variant max-h-48 overflow-y-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-outline-variant">
                    {Object.entries(selectedRun.tags).map(([key, value]) => (
                      <tr key={key}>
                        <td className="px-4 py-2 font-body-sm text-on-surface-variant font-medium whitespace-nowrap">
                          {key}
                        </td>
                        <td className="px-4 py-2 font-body-sm text-on-surface font-mono text-xs break-all">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
