import { useEffect, useState, useCallback } from "react";
import type { QlibStatusResponse } from "./types/api";
import {
  fetchHealth,
  fetchQlibStatus,
  fetchSettings,
  saveQlibDataPath,
} from "./api/client";
import Sidebar from "./components/Sidebar";
import ReadinessBanner from "./components/ReadinessBanner";
import StatusCards from "./components/StatusCards";
import DataPathSection from "./components/DataPathSection";
import DataHealth from "./components/DataHealth";
import Warnings from "./components/Warnings";
import WorkflowRunner from "./components/WorkflowRunner";
import ExperimentCenter from "./components/ExperimentCenter";
import BacktestAnalyzer from "./components/BacktestAnalyzer";
import RDAgentRunner from "./components/RDAgentRunner";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [backendOk, setBackendOk] = useState(false);
  const [backendError, setBackendError] = useState(false);
  const [qlibStatus, setQlibStatus] = useState<QlibStatusResponse | null>(null);
  const [dataPath, setDataPath] = useState("");
  const [currentPage, setCurrentPage] = useState("dashboard");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setBackendError(false);
    try {
      const [, status, settings] = await Promise.all([
        fetchHealth().then(() => setBackendOk(true)),
        fetchQlibStatus(),
        fetchSettings(),
      ]);
      setQlibStatus(status);
      setDataPath(settings.qlib_data_path);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
      setBackendError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSave = async (path: string) => {
    const res = await saveQlibDataPath(path);
    setDataPath(res.qlib_data_path);
    const status = await fetchQlibStatus();
    setQlibStatus(status);
  };

  const ready = qlibStatus?.ready ?? false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-body-md text-on-surface-variant">
            Loading Qlib Studio status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      <main className="flex-1 flex flex-col md:ml-64 w-full">
        {/* Mobile Top Bar */}
        <header className="bg-surface-container-lowest text-on-surface font-body-sm border-b border-outline-variant flex justify-between items-center h-12 px-4 w-full z-50 md:hidden">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage("dashboard")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                currentPage === "dashboard"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage("workflows")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                currentPage === "workflows"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              Workflows
            </button>
            <button
              onClick={() => setCurrentPage("experiments")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                currentPage === "experiments"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              Experiments
            </button>
            <button
              onClick={() => setCurrentPage("backtest")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                currentPage === "backtest"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              Backtest
            </button>
            <button
              onClick={() => setCurrentPage("rdagent")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                currentPage === "rdagent"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              RD-Agent
            </button>
          </div>
          <button
            onClick={loadAll}
            className="text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer active:opacity-70 p-1 rounded"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </header>

        {/* Dashboard Content */}
        <div className="p-container-margin md:p-8 space-y-8 flex-1">
          {/* Page Header */}
          <div className="flex justify-between items-end border-b border-outline-variant pb-4">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                {currentPage === "dashboard"
                  ? "Qlib Studio Dashboard"
                  : currentPage === "workflows"
                    ? "Workflow Runner"
                    : currentPage === "experiments"
                      ? "Experiment Center"
                      : currentPage === "backtest"
                        ? "Backtest Analyzer"
                        : "RD-Agent Center"}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                {currentPage === "dashboard"
                  ? "Local Quant Research Workbench"
                  : currentPage === "workflows"
                    ? "Run and manage qrun workflows"
                    : currentPage === "experiments"
                      ? "View MLflow experiment results"
                      : currentPage === "backtest"
                        ? "Analyze backtest performance and risk"
                        : "Run AI-driven factor and model research tasks"}
              </p>
            </div>
            {currentPage === "dashboard" && (
              <button
                onClick={loadAll}
                className="bg-primary text-on-primary border border-primary px-3 py-1.5 rounded font-body-sm text-body-sm hover:opacity-90 transition-opacity flex items-center shadow-sm"
              >
                <span
                  className="material-symbols-outlined text-[16px] mr-1"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  refresh
                </span>
                Refresh Status
              </button>
            )}
          </div>

          {currentPage === "dashboard" ? (
            <>
              {/* Readiness Banner */}
              <ReadinessBanner ready={ready} />

              {/* Status Cards */}
              <StatusCards
                backendOk={backendOk}
                pythonVersion={qlibStatus?.python_version ?? ""}
                qlibInstalled={qlibStatus?.qlib_installed ?? false}
                qlibVersion={qlibStatus?.qlib_version ?? null}
                mlflowInstalled={qlibStatus?.mlflow_installed ?? false}
                mlflowVersion={qlibStatus?.mlflow_version ?? null}
              />

              {/* Data Path + Data Health */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-panel-gap">
                <DataPathSection
                  currentPath={dataPath}
                  pathExists={qlibStatus?.data_path_exists ?? false}
                  onSave={handleSave}
                />
                <DataHealth
                  dataPathExists={qlibStatus?.data_path_exists ?? false}
                  calendarExists={qlibStatus?.calendar_exists ?? false}
                  instrumentsExists={qlibStatus?.instruments_exists ?? false}
                  featuresExists={qlibStatus?.features_exists ?? false}
                />
              </div>

              {/* Warnings */}
              <Warnings
                warnings={qlibStatus?.warnings ?? []}
                backendError={backendError}
              />
            </>
          ) : currentPage === "workflows" ? (
            <WorkflowRunner />
          ) : currentPage === "experiments" ? (
            <ExperimentCenter />
          ) : currentPage === "backtest" ? (
            <BacktestAnalyzer />
          ) : (
            <RDAgentRunner />
          )}
        </div>
      </main>
    </div>
  );
}
