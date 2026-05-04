import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Job,
  RDagentHealthCheckResponse,
  RDagentStatusResponse,
  SettingsResponse,
} from "../types/api";
import {
  fetchRDagentStatus,
  startRDagentJob,
  fetchRDagentJobs,
  fetchRDagentJobLogs,
  cancelRDagentJob,
  runRDagentHealthCheck,
  fetchSettings,
  saveRDagentSettings,
} from "../api/client";

const SCENARIOS = [
  {
    value: "fin_factor",
    label: "AI Factor Research",
    description: "Automated generation and evaluation of alpha factors.",
    icon: "show_chart",
    accent: "bg-primary-fixed-dim",
  },
  {
    value: "fin_model",
    label: "AI Model Research",
    description: "Train and evaluate predictive models autonomously.",
    icon: "model_training",
    accent: "bg-secondary-fixed-dim",
  },
  {
    value: "fin_quant",
    label: "Factor + Model Research",
    description: "End-to-end quantitative pipeline optimization.",
    icon: "merge_type",
    accent: "bg-primary",
  },
  {
    value: "fin_factor_report",
    label: "Report to Factor",
    description: "Extract alpha factors from text-based reports.",
    icon: "summarize",
    accent: "bg-tertiary-fixed-dim",
  },
];

export default function RDAgentCenter() {
  const [status, setStatus] = useState<RDagentStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [healthCheckRunning, setHealthCheckRunning] = useState(false);
  const [healthCheckResult, setHealthCheckResult] =
    useState<RDagentHealthCheckResponse | null>(null);

  const [, setSettings] = useState<SettingsResponse | null>(null);
  const [settingsDraft, setSettingsDraft] = useState({
    rdagent_working_dir: ".",
    rdagent_output_dir: "storage/rdagent_outputs",
    rdagent_env_file: ".env",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedScenario, setSelectedScenario] = useState("fin_quant");
  const [extraArgs, setExtraArgs] = useState("");
  const [starting, setStarting] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [logContent, setLogContent] = useState("");

  const [errors, setErrors] = useState<string[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error";

  const addError = (msg: string) => {
    setErrors((prev) => (prev.includes(msg) ? prev : [...prev, msg]));
  };

  const clearErrors = () => setErrors([]);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const data = await fetchRDagentStatus();
      setStatus(data);
    } catch (error) {
      addError(`Failed to check RD-Agent status. ${getErrorMessage(error)}`);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
      setSettingsDraft({
        rdagent_working_dir: data.rdagent_working_dir,
        rdagent_output_dir: data.rdagent_output_dir,
        rdagent_env_file: data.rdagent_env_file,
      });
      setSettingsDirty(false);
    } catch (error) {
      addError(`Failed to load settings. ${getErrorMessage(error)}`);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const data = await fetchRDagentJobs();
      setJobs(data);
    } catch (error) {
      console.error("Failed to load RD-Agent jobs:", error);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadSettings();
    loadJobs();
  }, [loadStatus, loadSettings, loadJobs]);

  useEffect(() => {
    const hasRunningJobs = jobs.some((j) => j.status === "running");
    if (!hasRunningJobs) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchRDagentJobs();
        setJobs(data);
      } catch (error) {
        console.error("Failed to refresh jobs:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobs]);

  useEffect(() => {
    if (selectedJobId === null) return;

    const job = jobs.find((j) => j.id === selectedJobId);
    if (
      !job ||
      job.status === "success" ||
      job.status === "failed" ||
      job.status === "cancelled"
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const logData = await fetchRDagentJobLogs(selectedJobId);
        setLogContent(logData.logs);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedJobId, jobs]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logContent]);

  const handleHealthCheck = async () => {
    setHealthCheckRunning(true);
    setHealthCheckResult(null);
    try {
      const result = await runRDagentHealthCheck();
      setHealthCheckResult(result);
    } catch (error) {
      addError(`Health check request failed. ${getErrorMessage(error)}`);
    } finally {
      setHealthCheckRunning(false);
    }
  };

  const handleSettingsChange = (field: string, value: string) => {
    setSettingsDraft((prev) => ({ ...prev, [field]: value }));
    setSettingsDirty(true);
  };

  const handleSettingsSave = async () => {
    setSettingsSaving(true);
    try {
      const data = await saveRDagentSettings(settingsDraft);
      setSettings(data);
      setSettingsDraft({
        rdagent_working_dir: data.rdagent_working_dir,
        rdagent_output_dir: data.rdagent_output_dir,
        rdagent_env_file: data.rdagent_env_file,
      });
      setSettingsDirty(false);
    } catch (error) {
      addError(`Failed to save settings. ${getErrorMessage(error)}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    clearErrors();
    try {
      const args = extraArgs.trim() ? extraArgs.trim().split(/\s+/) : [];
      await startRDagentJob({
        scenario: selectedScenario,
        working_dir: settingsDraft.rdagent_working_dir || ".",
        extra_args: args,
      });
      setExtraArgs("");
      await loadJobs();
    } catch (error) {
      addError(`Failed to start RD-Agent job. ${getErrorMessage(error)}`);
    } finally {
      setStarting(false);
    }
  };

  const handleSelectJob = async (jobId: number) => {
    setSelectedJobId(jobId);
    setLogContent("");
    try {
      const logData = await fetchRDagentJobLogs(jobId);
      setLogContent(logData.logs);
    } catch (error) {
      addError(`Failed to fetch job logs. ${getErrorMessage(error)}`);
    }
  };

  const handleCancel = async (jobId: number) => {
    try {
      await cancelRDagentJob(jobId);
      await loadJobs();
    } catch (error) {
      addError(`Failed to cancel job. ${getErrorMessage(error)}`);
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;
  const envReady = status?.ready ?? false;

  return (
    <div className="flex flex-col gap-panel-gap">
      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-error-container border border-outline-variant rounded p-element-padding">
          <div className="flex items-start">
            <span className="material-symbols-outlined text-on-error-container mr-2 mt-0.5 text-[16px]">
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
              <span className="material-symbols-outlined text-[16px]">
                close
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-panel-gap">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-panel-gap">
          {/* Status Ribbon */}
          <section className="bg-surface-container-lowest border border-outline-variant/50 rounded p-element-padding">
            {statusLoading ? (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            ) : status ? (
              <div className="flex flex-wrap gap-element-padding justify-between items-center">
                <RibbonItem
                  label="RD-Agent"
                  ok={status.rdagent_installed}
                  detail={status.rdagent_version ?? "Not installed"}
                />
                <div className="w-px h-8 bg-outline-variant/30 hidden sm:block" />
                <RibbonItem
                  label="Version"
                  ok={status.rdagent_installed}
                  detail={status.rdagent_version ?? "-"}
                  useInfoIcon
                />
                <div className="w-px h-8 bg-outline-variant/30 hidden sm:block" />
                <RibbonItem
                  label="Docker"
                  ok={status.docker_available}
                  detail={
                    status.docker_available
                      ? "Running"
                      : status.docker_installed
                        ? "Daemon stopped"
                        : "Not found"
                  }
                />
                <div className="w-px h-8 bg-outline-variant/30 hidden sm:block" />
                <RibbonItem
                  label=".env File"
                  ok={status.env_file_exists}
                  detail={status.env_file_exists ? "Found" : "Missing"}
                  useInfoIcon
                />
                <div className="w-px h-8 bg-outline-variant/30 hidden sm:block" />
                <RibbonItem
                  label="LLM Config"
                  ok={status.llm_config_detected}
                  detail={status.llm_config_detected ? "Valid" : "Missing"}
                />
                <div className="w-px h-8 bg-outline-variant/30 hidden md:block" />
                <div
                  className={`flex items-center gap-2 px-2 py-1 rounded ${
                    status.ready
                      ? "bg-surface-container-low"
                      : "bg-error-container/30"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.ready
                        ? "bg-tertiary-fixed-dim animate-pulse"
                        : "bg-error"
                    }`}
                  />
                  <p className="font-label-mono text-label-mono text-on-surface">
                    {status.ready ? "System Ready" : "Not Ready"}
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          {/* Scenario Selector */}
          <section className="flex flex-col gap-element-padding">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-unit">
              <h3 className="font-body-md text-body-md font-semibold text-on-background">
                Scenario Selector
              </h3>
              <span className="font-label-mono text-[10px] uppercase text-on-surface-variant">
                Select Research Type
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-panel-gap">
              {SCENARIOS.map((s) => {
                const isSelected = selectedScenario === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => setSelectedScenario(s.value)}
                    className={`bg-surface-container-lowest border text-left cursor-pointer transition-colors rounded p-gutter flex flex-col gap-element-padding group relative overflow-hidden ${
                      isSelected
                        ? "border-primary ring-1 ring-primary"
                        : "border-outline-variant/50 hover:border-primary"
                    }`}
                  >
                    <div
                      className={`absolute top-0 left-0 w-1 h-full transition-opacity ${
                        isSelected ? s.accent : `${s.accent} opacity-0 group-hover:opacity-100`
                      }`}
                    />
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <h4 className="font-body-md text-body-md font-semibold text-on-surface">
                          {s.label}
                        </h4>
                        {isSelected && (
                          <span className="font-label-mono text-[9px] bg-primary text-on-primary px-1 rounded uppercase">
                            Selected
                          </span>
                        )}
                      </div>
                      <span
                        className={`material-symbols-outlined text-[20px] transition-colors ${
                          isSelected
                            ? "text-primary"
                            : "text-on-surface-variant group-hover:text-primary"
                        }`}
                      >
                        {s.icon}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {s.description}
                    </p>
                    <div className="mt-auto pt-element-padding border-t border-outline-variant/20">
                      <p className="font-code-snippet text-[11px] text-on-surface bg-surface-container-low px-2 py-1 rounded inline-block">
                        rdagent {s.value}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Run Configuration */}
          <section className="bg-surface-container-lowest border border-outline-variant/50 rounded p-gutter flex flex-col gap-element-padding">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-unit">
              <h3 className="font-body-md text-body-md font-semibold text-on-background">
                Run Configuration
              </h3>
              <span className="font-label-mono text-[10px] uppercase text-on-surface-variant">
                Execution Setup
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-mono text-label-mono text-on-surface-variant">
                Extra Arguments
              </label>
              <input
                type="text"
                value={extraArgs}
                onChange={(e) => setExtraArgs(e.target.value)}
                placeholder="--epochs 10 --dataset qlib_alpha360"
                className="w-full bg-background border border-outline-variant rounded font-code-snippet text-code-snippet px-3 py-2 text-on-surface focus:border-primary focus:ring-0 placeholder:text-on-surface-variant/50"
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleStart}
                disabled={starting || !envReady}
                className="bg-primary text-on-primary font-body-sm text-body-sm font-semibold px-4 py-2 rounded flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">
                  play_arrow
                </span>
                {starting ? "Starting..." : "Start RD-Agent Job"}
              </button>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 flex flex-col gap-panel-gap">
          {/* Agent Settings */}
          <section className="bg-surface-container-lowest border border-outline-variant/50 rounded p-gutter flex flex-col gap-element-padding">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-unit">
              <h3 className="font-body-md text-body-md font-semibold text-on-background">
                Agent Settings
              </h3>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                settings
              </span>
            </div>
            <div className="flex flex-col gap-unit">
              <label className="font-label-mono text-[10px] uppercase text-on-surface-variant">
                Working Directory
              </label>
              <input
                type="text"
                value={settingsDraft.rdagent_working_dir}
                onChange={(e) =>
                  handleSettingsChange("rdagent_working_dir", e.target.value)
                }
                className="w-full bg-background border border-outline-variant rounded font-code-snippet text-[11px] px-2 py-1.5 text-on-surface focus:border-primary focus:ring-0"
              />
            </div>
            <div className="flex flex-col gap-unit">
              <label className="font-label-mono text-[10px] uppercase text-on-surface-variant">
                Output Directory
              </label>
              <input
                type="text"
                value={settingsDraft.rdagent_output_dir}
                onChange={(e) =>
                  handleSettingsChange("rdagent_output_dir", e.target.value)
                }
                className="w-full bg-background border border-outline-variant rounded font-code-snippet text-[11px] px-2 py-1.5 text-on-surface focus:border-primary focus:ring-0"
              />
            </div>
            <div className="flex flex-col gap-unit">
              <label className="font-label-mono text-[10px] uppercase text-on-surface-variant">
                Env File Path
              </label>
              <input
                type="text"
                value={settingsDraft.rdagent_env_file}
                onChange={(e) =>
                  handleSettingsChange("rdagent_env_file", e.target.value)
                }
                className="w-full bg-background border border-outline-variant rounded font-code-snippet text-[11px] px-2 py-1.5 text-on-surface focus:border-primary focus:ring-0"
              />
            </div>
            <button
              onClick={handleSettingsSave}
              disabled={settingsSaving || !settingsDirty}
              className="w-full mt-2 border border-outline-variant text-on-surface font-body-sm text-[12px] font-medium px-3 py-1.5 rounded hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {settingsSaving ? "Saving..." : "Save Settings"}
            </button>
          </section>

          {/* Health Check */}
          <section className="bg-surface-container-lowest border border-outline-variant/50 rounded p-gutter flex flex-col gap-element-padding flex-1">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-unit">
              <h3 className="font-body-md text-body-md font-semibold text-on-background">
                Health Check
              </h3>
              <button
                onClick={handleHealthCheck}
                disabled={healthCheckRunning || !status?.rdagent_installed}
                className="flex items-center gap-1 font-body-sm text-[11px] text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[14px]">
                  health_and_safety
                </span>
                {healthCheckRunning ? "Running..." : "Run Check"}
              </button>
            </div>
            <div className="bg-[#1e1e1e] rounded p-3 flex-1 min-h-[150px] font-code-snippet text-[11px] text-[#d4d4d4] overflow-x-auto shadow-inner flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#ff5f56]" />
                <div className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
                <div className="w-2 h-2 rounded-full bg-[#27c93f]" />
                <span className="text-[#858585] ml-2 font-label-mono text-[9px] uppercase">
                  Terminal
                </span>
              </div>
              {healthCheckResult ? (
                <>
                  <p>
                    <span className="text-[#569cd6]">$</span> rdagent
                    health_check --no-check-env
                  </p>
                  {healthCheckResult.stdout && (
                    <p className="text-[#ce9178] whitespace-pre-wrap">
                      {healthCheckResult.stdout}
                    </p>
                  )}
                  {healthCheckResult.stderr && (
                    <p className="text-[#f48771] whitespace-pre-wrap">
                      {healthCheckResult.stderr}
                    </p>
                  )}
                  {healthCheckResult.warnings.map((w, i) => (
                    <p key={i} className="text-[#f48771]">
                      ! {w}
                    </p>
                  ))}
                  <p
                    className={`mt-2 font-bold ${
                      healthCheckResult.success
                        ? "text-[#27c93f]"
                        : "text-[#f48771]"
                    }`}
                  >
                    {healthCheckResult.success
                      ? "STATUS: System Healthy."
                      : `STATUS: Check Failed (exit ${healthCheckResult.return_code})`}
                  </p>
                </>
              ) : healthCheckRunning ? (
                <>
                  <p>
                    <span className="text-[#569cd6]">$</span> rdagent
                    health_check --no-check-env
                  </p>
                  <p className="text-[#ce9178] animate-pulse">
                    Running health check...
                  </p>
                </>
              ) : (
                <p className="text-[#858585]">
                  Click "Run Check" to verify your RD-Agent environment.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-panel-gap">
        {/* Recent Jobs Table */}
        <section className="bg-surface-container-lowest border border-outline-variant/50 rounded flex flex-col">
          <div className="p-element-padding border-b border-outline-variant/30 flex justify-between items-center">
            <h3 className="font-body-md text-body-md font-semibold text-on-background px-2">
              Recent RD-Agent Jobs
            </h3>
            <button
              onClick={loadJobs}
              className="text-on-surface-variant hover:text-on-surface p-1"
            >
              <span className="material-symbols-outlined text-[18px]">
                refresh
              </span>
            </button>
          </div>
          {jobs.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">
                work
              </span>
              <p className="font-body-sm text-on-surface-variant">
                No RD-Agent jobs yet
              </p>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Start a scenario above to see jobs here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-[12px]">
                <thead className="bg-surface-container-low/50 border-b border-outline-variant/30 font-label-mono text-[10px] uppercase text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-2 font-medium">Job ID</th>
                    <th className="px-4 py-2 font-medium">Scenario</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Started</th>
                    <th className="px-4 py-2 font-medium">Working Dir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => handleSelectJob(job.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedJobId === job.id
                          ? "bg-primary-container/20"
                          : "hover:bg-surface-container-low"
                      }`}
                    >
                      <td className="px-4 py-2 font-code-snippet text-on-surface">
                        #{job.id}
                      </td>
                      <td className="px-4 py-2 text-on-surface">
                        {job.scenario || job.type}
                      </td>
                      <td className="px-4 py-2">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-2 text-on-surface-variant">
                        {formatTimeAgo(job.started_at)}
                      </td>
                      <td className="px-4 py-2 font-code-snippet text-[10px] text-on-surface-variant truncate max-w-[120px]">
                        {job.working_dir}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Log Viewer */}
        <section className="bg-surface-container-lowest border border-outline-variant/50 rounded flex flex-col h-[340px]">
          <div className="p-element-padding border-b border-outline-variant/30 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="font-body-md text-body-md font-semibold text-on-background px-2">
                Process Logs
              </h3>
              {selectedJob && selectedJob.status === "running" && (
                <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim animate-pulse" />
              )}
              {selectedJob && (
                <span className="font-label-mono text-[10px] text-on-surface-variant">
                  #{selectedJob.id}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {selectedJob && selectedJob.status === "running" && (
                <button
                  onClick={() => handleCancel(selectedJob.id)}
                  className="flex items-center justify-center p-1 border border-error-container bg-error-container/20 text-error rounded hover:bg-error-container/50"
                  title="Cancel Job"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    stop_circle
                  </span>
                </button>
              )}
              {selectedJob && (
                <button
                  onClick={() => {
                    setSelectedJobId(null);
                    setLogContent("");
                  }}
                  className="flex items-center justify-center p-1 border border-outline-variant rounded text-on-surface-variant hover:bg-surface-container-low"
                  title="Close Logs"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 bg-[#0d1117] p-3 overflow-y-auto font-code-snippet text-[10px] text-[#c9d1d9] leading-relaxed shadow-inner rounded-b">
            {selectedJob ? (
              <>
                <div className="opacity-50 mb-2">
                  Logs for job #{selectedJob.id} ({selectedJob.status})...
                </div>
                <pre className="whitespace-pre-wrap">
                  {logContent || "Waiting for output..."}
                </pre>
                <div ref={logsEndRef} />
              </>
            ) : (
              <div className="opacity-50">
                Select a job from the table to view its logs.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function RibbonItem({
  label,
  ok,
  detail,
  useInfoIcon = false,
}: {
  label: string;
  ok: boolean;
  detail: string;
  useInfoIcon?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {useInfoIcon ? (
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
          info
        </span>
      ) : (
        <span
          className={`w-2 h-2 rounded-full ${
            ok ? "bg-secondary-fixed-dim" : "bg-error"
          }`}
        />
      )}
      <div>
        <p className="font-label-mono text-[10px] uppercase text-on-surface-variant">
          {label}
        </p>
        <p className="font-code-snippet text-code-snippet font-semibold text-on-surface">
          {detail}
        </p>
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "bg-surface-container-highest text-on-surface px-1.5 py-0.5 rounded text-[10px] font-label-mono",
    running:
      "bg-secondary-fixed-dim/30 text-on-surface-variant px-1.5 py-0.5 rounded text-[10px] font-label-mono border border-secondary-fixed-dim/50",
    success:
      "bg-surface-container-highest text-on-surface px-1.5 py-0.5 rounded text-[10px] font-label-mono",
    failed:
      "bg-error-container text-error px-1.5 py-0.5 rounded text-[10px] font-label-mono",
    cancelled:
      "bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 rounded text-[10px] font-label-mono",
  };

  return (
    <span className={styles[status] || styles.pending}>{status}</span>
  );
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}
