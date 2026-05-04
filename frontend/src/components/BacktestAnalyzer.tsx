import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type {
  ExperimentSummary,
  RunSummary,
  BacktestSummaryResponse,
  CurveDataResponse,
  CurvePoint,
  CurveCoverage,
  RiskTableResponse,
  IndicatorPreviewResponse,
  BacktestCompareResponse,
  SummaryMetrics,
} from "../types/api";
import {
  fetchExperiments,
  fetchExperimentRuns,
  fetchBacktestSummary,
  fetchBacktestCurves,
  fetchBacktestRisk,
  fetchBacktestIndicators,
  compareBacktestRuns,
} from "../api/client";
import { useTranslation } from "../i18n";

type View = "select" | "analyze" | "compare";

export default function BacktestAnalyzer() {
  const [view, setView] = useState<View>("select");
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedExp, setSelectedExp] = useState<ExperimentSummary | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [analyzingRunId, setAnalyzingRunId] = useState<string | null>(null);
  const [summary, setSummary] = useState<BacktestSummaryResponse | null>(null);
  const [curves, setCurves] = useState<CurveDataResponse | null>(null);
  const [riskTable, setRiskTable] = useState<RiskTableResponse | null>(null);
  const [indicators, setIndicators] = useState<IndicatorPreviewResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<BacktestCompareResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const { t } = useTranslation();

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error";

  const addError = (msg: string) => {
    setErrors((prev) => (prev.includes(msg) ? prev : [...prev, msg]));
  };

  const addWarnings = (msgs: string[]) => {
    setWarnings((prev) => {
      const next = [...prev];
      for (const m of msgs) {
        if (!next.includes(m)) next.push(m);
      }
      return next;
    });
  };

  const clearErrors = () => setErrors([]);
  const clearWarnings = () => setWarnings([]);

  const loadExperiments = useCallback(async () => {
    try {
      const data = await fetchExperiments();
      setExperiments(data.experiments);
      clearErrors();
    } catch (error) {
      addError(`${t('error.failedToLoadExperiments')} ${getErrorMessage(error)}`);
    }
  }, [t]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadExperiments();
      setLoading(false);
    };
    init();
  }, [loadExperiments]);

  const handleSelectExperiment = async (exp: ExperimentSummary) => {
    setSelectedExp(exp);
    try {
      const data = await fetchExperimentRuns(exp.experiment_id);
      setRuns(data.runs);
      clearErrors();
    } catch (error) {
      addError(`${t('error.failedToLoadRuns')} ${getErrorMessage(error)}`);
    }
  };

  const toggleRunSelection = (runId: string) => {
    setSelectedRunIds((prev) =>
      prev.includes(runId) ? prev.filter((id) => id !== runId) : [...prev, runId]
    );
  };

  const handleAnalyze = async (runId: string) => {
    setAnalyzingRunId(runId);
    setAnalysisLoading(true);
    setView("analyze");
    clearErrors();
    clearWarnings();

    try {
      const [summaryRes, curvesRes, riskRes, indicatorsRes] = await Promise.allSettled([
        fetchBacktestSummary(runId),
        fetchBacktestCurves(runId),
        fetchBacktestRisk(runId),
        fetchBacktestIndicators(runId),
      ]);

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value);
        addWarnings(summaryRes.value.warnings);
      } else {
        setSummary(null);
        addError(`Failed to load summary: ${getErrorMessage(summaryRes.reason)}`);
      }

      if (curvesRes.status === "fulfilled") {
        setCurves(curvesRes.value);
        addWarnings(curvesRes.value.warnings);
      } else {
        setCurves(null);
        addError(`Failed to load curves: ${getErrorMessage(curvesRes.reason)}`);
      }

      if (riskRes.status === "fulfilled") {
        setRiskTable(riskRes.value);
        addWarnings(riskRes.value.warnings);
      } else {
        setRiskTable(null);
      }

      if (indicatorsRes.status === "fulfilled") {
        setIndicators(indicatorsRes.value);
        addWarnings(indicatorsRes.value.warnings);
      } else {
        setIndicators(null);
      }
    } catch (error) {
      addError(`Failed to analyze run. ${getErrorMessage(error)}`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCompare = async () => {
    if (selectedRunIds.length < 2) return;
    setCompareLoading(true);
    setView("compare");
    clearErrors();
    clearWarnings();

    try {
      const result = await compareBacktestRuns(selectedRunIds);
      setCompareResult(result);
      addWarnings(result.warnings);
    } catch (error) {
      addError(`Failed to compare runs. ${getErrorMessage(error)}`);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleBack = () => {
    if (view === "analyze") {
      setView("select");
      setAnalyzingRunId(null);
      setSummary(null);
      setCurves(null);
      setRiskTable(null);
      setIndicators(null);
      clearWarnings();
    } else if (view === "compare") {
      setView("select");
      setCompareResult(null);
      clearWarnings();
    }
  };

  const formatMetric = (value: number | null | undefined, digits = 4) => {
    if (value === null || value === undefined) return "-";
    return value.toFixed(digits);
  };

  const formatPct = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return (value * 100).toFixed(2) + "%";
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
      {/* Errors */}
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

      {/* Warnings */}
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
            <button
              onClick={clearWarnings}
              className="text-yellow-600 hover:opacity-70"
              aria-label="Dismiss warnings"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Back button */}
      {view !== "select" && (
        <button
          onClick={handleBack}
          className="flex items-center text-primary hover:underline font-body-sm"
        >
          <span className="material-symbols-outlined text-[16px] mr-1">
            arrow_back
          </span>
          {t('backtest.backToRunSelection')}
        </button>
      )}

      {/* SELECT VIEW */}
      {view === "select" && (
        <SelectView
          experiments={experiments}
          selectedExp={selectedExp}
          runs={runs}
          selectedRunIds={selectedRunIds}
          onSelectExperiment={handleSelectExperiment}
          onAnalyze={handleAnalyze}
          onToggleSelection={toggleRunSelection}
          onCompare={handleCompare}
          onBackToExperiments={() => {
            setSelectedExp(null);
            setRuns([]);
          }}
        />
      )}

      {/* ANALYZE VIEW */}
      {view === "analyze" && analyzingRunId && (
        <AnalyzeView
          runId={analyzingRunId}
          loading={analysisLoading}
          summary={summary}
          curves={curves}
          riskTable={riskTable}
          indicators={indicators}
          formatMetric={formatMetric}
          formatPct={formatPct}
        />
      )}

      {/* COMPARE VIEW */}
      {view === "compare" && (
        <CompareView
          loading={compareLoading}
          result={compareResult}
          formatMetric={formatMetric}
          formatPct={formatPct}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select View
// ---------------------------------------------------------------------------

interface SelectViewProps {
  experiments: ExperimentSummary[];
  selectedExp: ExperimentSummary | null;
  runs: RunSummary[];
  selectedRunIds: string[];
  onSelectExperiment: (exp: ExperimentSummary) => void;
  onAnalyze: (runId: string) => void;
  onToggleSelection: (runId: string) => void;
  onCompare: () => void;
  onBackToExperiments: () => void;
}

function SelectView({
  experiments,
  selectedExp,
  runs,
  selectedRunIds,
  onSelectExperiment,
  onAnalyze,
  onToggleSelection,
  onCompare,
  onBackToExperiments,
}: SelectViewProps) {
  const { t } = useTranslation();

  if (!selectedExp) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant">
          <h3 className="font-body-sm text-on-surface font-semibold">
            {t('backtest.selectExperiment')} ({experiments.length})
          </h3>
        </div>
        {experiments.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 block">
              science
            </span>
            <p className="font-body-sm">{t('experiment.noExperiments')}</p>
            <p className="text-xs mt-1">{t('experiment.runQlibWorkflow')}</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {experiments.map((exp) => (
              <button
                key={exp.experiment_id}
                onClick={() => onSelectExperiment(exp)}
                className="w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-body-sm text-on-surface font-medium">{exp.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {exp.run_count} run{exp.run_count !== 1 ? "s" : ""} &middot; ID:{" "}
                    {exp.experiment_id}
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
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBackToExperiments}
        className="flex items-center text-primary hover:underline font-body-sm"
      >
        <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span>
        {t('backtest.backToExperiments')}
      </button>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-body-sm text-on-surface font-semibold">
            {t('experiment.runsIn').replace('{name}', selectedExp.name)} ({runs.length})
          </h3>
          {selectedRunIds.length >= 2 && (
            <button
              onClick={onCompare}
              className="bg-primary text-on-primary px-3 py-1.5 rounded font-body-sm hover:opacity-90"
            >
              {t('backtest.compareSelected').replace('{count}', String(selectedRunIds.length))}
            </button>
          )}
        </div>
        {runs.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 block">
              hourglass_empty
            </span>
            <p className="font-body-sm">{t('experiment.noRuns')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium w-10">
                    <span className="material-symbols-outlined text-[16px]">checklist</span>
                  </th>
                  <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                    {t('experiment.runId')}
                  </th>
                  <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                    {t('common.status')}
                  </th>
                  <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                    {t('common.metrics')}
                  </th>
                  <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                    {t('common.started')}
                  </th>
                  <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {runs.map((run) => (
                  <tr key={run.run_id} className="hover:bg-surface-container-low">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRunIds.includes(run.run_id)}
                        onChange={() => onToggleSelection(run.run_id)}
                        className="cursor-pointer"
                      />
                    </td>
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
                      {run.metrics_count}
                    </td>
                    <td className="px-4 py-2 font-body-sm text-on-surface-variant">
                      {run.start_time ? new Date(run.start_time).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => onAnalyze(run.run_id)}
                        className="text-primary hover:underline font-body-sm font-medium"
                      >
                        {t('backtest.analyze')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analyze View
// ---------------------------------------------------------------------------

interface AnalyzeViewProps {
  runId: string;
  loading: boolean;
  summary: BacktestSummaryResponse | null;
  curves: CurveDataResponse | null;
  riskTable: RiskTableResponse | null;
  indicators: IndicatorPreviewResponse | null;
  formatMetric: (v: number | null | undefined, d?: number) => string;
  formatPct: (v: number | null | undefined) => string;
}

function AnalyzeView({
  runId,
  loading,
  summary,
  curves,
  riskTable,
  indicators,
  formatMetric,
  formatPct,
}: AnalyzeViewProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 font-body-sm text-on-surface-variant">
          {t('backtest.loadingArtifacts')}
        </p>
      </div>
    );
  }

  const hasSummary = summary && Object.values(summary.summary).some((v) => v !== null);
  const hasCurves = curves && curves.curves.length > 0;
  const hasRisk = riskTable && riskTable.risk_table.length > 0;
  const hasIndicators = indicators && indicators.rows.length > 0;

  if (!hasSummary && !hasCurves && !hasRisk && !hasIndicators) {
    const allWarnings = [
      ...(summary?.warnings || []),
      ...(curves?.warnings || []),
      ...(riskTable?.warnings || []),
      ...(indicators?.warnings || []),
    ];
    const hasNoArtifacts = allWarnings.some((w) =>
      w.includes("no artifacts") || w.includes("This run has no artifacts")
    );
    const availableArtifacts = allWarnings
      .filter((w) => w.startsWith("  - "))
      .map((w) => w.replace("  - ", ""));
    const onlyPred = availableArtifacts.length === 1 && availableArtifacts[0] === "pred.pkl";

    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-8">
        <div className="text-center mb-4">
          <span className="material-symbols-outlined text-4xl mb-2 block text-on-surface-variant">
            warning
          </span>
          <p className="font-body-sm text-on-surface">
            {t('backtest.noBacktestArtifacts')}
          </p>
        </div>

        {onlyPred && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-xs text-yellow-800">
              {t('backtest.predictionOnly')}
            </p>
          </div>
        )}

        {hasNoArtifacts && !onlyPred && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-xs text-yellow-800">
              {t('backtest.noArtifactsRun')}
            </p>
          </div>
        )}

        {availableArtifacts.length > 0 && !onlyPred && (
          <details className="mt-4">
            <summary className="font-body-sm text-on-surface-variant cursor-pointer hover:text-on-surface">
              {t('backtest.availableArtifacts')} ({availableArtifacts.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {availableArtifacts.map((path) => (
                <li key={path} className="text-xs font-mono text-on-surface-variant pl-4">
                  {path}
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="text-xs text-on-surface-variant mt-4 text-center">
          {t('backtest.runFullWorkflow')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Run header */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-body-sm text-on-surface font-semibold">
            {t('backtest.backtestAnalysis')}
          </h3>
          <span className="font-body-sm text-on-surface-variant font-mono text-xs">
            {runId}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      {hasSummary && (
        <SummaryCards summary={summary.summary} formatPct={formatPct} formatMetric={formatMetric} />
      )}

      {/* Charts */}
      {curves && curves.curves.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-panel-gap">
          <CumulativeReturnChart curves={curves.curves} />
          <DrawdownChart curves={curves.curves} />
        </div>
      ) : curves && curves.curves.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 text-center">
          <span className="material-symbols-outlined text-4xl mb-2 block text-on-surface-variant">
            show_chart
          </span>
          <p className="font-body-sm text-on-surface">
            {t('backtest.noReturnCurve')}
          </p>
        </div>
      ) : null}

      {/* Risk Analysis Table */}
      {hasRisk && <RiskTable riskTable={riskTable!.risk_table} formatPct={formatPct} formatMetric={formatMetric} />}

      {/* Data Coverage */}
      {curves && curves.coverage && (
        <DataCoverage coverage={curves.coverage} summarySources={summary?.sources} />
      )}

      {/* Indicator Preview */}
      {hasIndicators && (
        <IndicatorPreviewTable indicators={indicators!} formatMetric={formatMetric} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function SummaryCards({
  summary,
  formatPct,
  formatMetric,
}: {
  summary: SummaryMetrics;
  formatPct: (v: number | null | undefined) => string;
  formatMetric: (v: number | null | undefined, d?: number) => string;
}) {
  const { t } = useTranslation();
  const cards: { label: string; value: string; icon: string }[] = [];

  cards.push({
    label: t('backtest.annReturn'),
    value: formatPct(summary.annualized_return),
    icon: "trending_up",
  });
  cards.push({
    label: t('backtest.infoRatio'),
    value: formatMetric(summary.information_ratio, 3),
    icon: "speed",
  });
  cards.push({
    label: t('backtest.maxDrawdown'),
    value: formatPct(summary.max_drawdown),
    icon: "trending_down",
  });
  cards.push({
    label: t('backtest.excessAnnReturnNoCost'),
    value: formatPct(summary.excess_return_without_cost_annualized_return),
    icon: "show_chart",
  });
  cards.push({
    label: t('backtest.excessAnnReturnWithCost'),
    value: formatPct(summary.excess_return_with_cost_annualized_return),
    icon: "show_chart",
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-panel-gap">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4"
        >
          <div className="flex items-center mb-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant mr-2">
              {card.icon}
            </span>
            <span className="text-xs text-on-surface-variant">{card.label}</span>
          </div>
          <p className="font-headline-sm text-on-surface">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data Coverage
// ---------------------------------------------------------------------------

function DataCoverage({
  coverage,
  summarySources,
}: {
  coverage: CurveCoverage;
  summarySources?: string[];
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
      <h4 className="font-body-sm text-on-surface font-semibold mb-3">
        {t('backtest.dataCoverage')}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <p className="text-xs text-on-surface-variant">{t('backtest.startDate')}</p>
          <p className="font-body-sm text-on-surface font-mono text-xs">
            {coverage.start_date || "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">{t('backtest.endDate')}</p>
          <p className="font-body-sm text-on-surface font-mono text-xs">
            {coverage.end_date || "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">{t('backtest.tradingDays')}</p>
          <p className="font-body-sm text-on-surface">{coverage.trading_days}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">{t('backtest.curvePoints')}</p>
          <p className="font-body-sm text-on-surface">{coverage.curve_points}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">{t('backtest.reportSource')}</p>
          <p className="font-body-sm text-on-surface font-mono text-xs truncate" title={coverage.artifact_source_report || ""}>
            {coverage.artifact_source_report ? coverage.artifact_source_report.split("/").pop() : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">{t('backtest.riskSource')}</p>
          <p className="font-body-sm text-on-surface font-mono text-xs truncate" title={coverage.artifact_source_risk || ""}>
            {coverage.artifact_source_risk
              ? coverage.artifact_source_risk.split("/").pop()
              : summarySources?.find((s) => s.includes("port_analysis"))
                ? summarySources.find((s) => s.includes("port_analysis"))!.split("/").pop()
                : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart helpers
// ---------------------------------------------------------------------------

function formatYAxis(value: number): string {
  if (Math.abs(value) >= 1) return value.toFixed(1);
  if (Math.abs(value) >= 0.01) return value.toFixed(3);
  return value.toFixed(5);
}

function tooltipFormatter(value: unknown): string {
  if (typeof value === "number") return value.toFixed(4);
  return String(value ?? "");
}

// ---------------------------------------------------------------------------
// Cumulative Return Chart
// ---------------------------------------------------------------------------

function CumulativeReturnChart({ curves }: { curves: CurvePoint[] }) {
  const { t } = useTranslation();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
      <h4 className="font-body-sm text-on-surface font-semibold mb-3">
        {t('backtest.cumulativeReturn')}
      </h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={curves}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e3e5" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatYAxis} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={tooltipFormatter}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke="#76777b" strokeDasharray="2 2" />
          <Line
            type="monotone"
            dataKey="strategy_nav"
            name="Strategy"
            stroke="#000000"
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="benchmark_nav"
            name="Benchmark"
            stroke="#888888"
            dot={false}
            strokeWidth={1}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="excess_nav"
            name="Excess"
            stroke="#2563eb"
            dot={false}
            strokeWidth={1}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawdown Chart
// ---------------------------------------------------------------------------

function DrawdownChart({ curves }: { curves: CurvePoint[] }) {
  const { t } = useTranslation();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
      <h4 className="font-body-sm text-on-surface font-semibold mb-3">
        {t('backtest.drawdown')}
      </h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={curves}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e3e5" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatYAxis} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={tooltipFormatter}
          />
          <ReferenceLine y={0} stroke="#76777b" strokeDasharray="2 2" />
          <Line
            type="monotone"
            dataKey="drawdown"
            name="Drawdown"
            stroke="#dc2626"
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk Analysis Table
// ---------------------------------------------------------------------------

interface RiskTableRow {
  group: string;
  metric: string;
  value: number | null;
}

function RiskTable({
  riskTable,
  formatPct,
  formatMetric,
}: {
  riskTable: RiskTableRow[];
  formatPct: (v: number | null | undefined) => string;
  formatMetric: (v: number | null | undefined, d?: number) => string;
}) {
  const { t } = useTranslation();
  const groups = new Map<string, RiskTableRow[]>();
  for (const row of riskTable) {
    const existing = groups.get(row.group) ?? [];
    existing.push(row);
    groups.set(row.group, existing);
  }

  const allMetrics = new Set<string>();
  for (const rows of groups.values()) {
    for (const row of rows) allMetrics.add(row.metric);
  }

  const lookup = new Map<string, Map<string, number | null>>();
  for (const row of riskTable) {
    if (!lookup.has(row.group)) lookup.set(row.group, new Map());
    lookup.get(row.group)!.set(row.metric, row.value);
  }

  const groupNames = Array.from(groups.keys());
  const metricNames = Array.from(allMetrics);

  const pctMetrics = new Set([
    "annualized_return",
    "max_drawdown",
    "mean",
    "std",
  ]);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant">
        <h4 className="font-body-sm text-on-surface font-semibold">{t('backtest.riskAnalysis')}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                {t('common.metric')}
              </th>
              {groupNames.map((g) => (
                <th
                  key={g}
                  className="px-4 py-2 text-right font-body-sm text-on-surface-variant font-medium"
                >
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {metricNames.map((metric) => (
              <tr key={metric}>
                <td className="px-4 py-2 font-body-sm text-on-surface-variant font-medium">
                  {metric}
                </td>
                {groupNames.map((group) => {
                  const val = lookup.get(group)?.get(metric) ?? null;
                  const isPct = pctMetrics.has(metric);
                  return (
                    <td
                      key={group}
                      className="px-4 py-2 font-body-sm text-on-surface font-mono text-right"
                    >
                      {isPct ? formatPct(val) : formatMetric(val, 4)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Indicator Preview Table
// ---------------------------------------------------------------------------

function IndicatorPreviewTable({
  indicators,
  formatMetric,
}: {
  indicators: IndicatorPreviewResponse;
  formatMetric: (v: number | null | undefined, d?: number) => string;
}) {
  const [showAll, setShowAll] = useState(false);
  const { t } = useTranslation();
  const displayRows = showAll
    ? indicators.rows
    : indicators.rows.slice(0, 10);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
        <h4 className="font-body-sm text-on-surface font-semibold">
          {t('backtest.indicatorPreview')}
        </h4>
        <span className="text-xs text-on-surface-variant">
          {indicators.rows.length} {t('backtest.rows')}
          {indicators.index_start && indicators.index_end
            ? ` \u00b7 ${indicators.index_start} to ${indicators.index_end}`
            : ""}
        </span>
      </div>

      {displayRows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low">
                {indicators.columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2 text-right font-body-sm text-on-surface-variant font-medium text-xs"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {displayRows.map((row, i) => (
                <tr key={i}>
                  {indicators.columns.map((col) => {
                    const val = row[col];
                    const display =
                      val !== null && val !== undefined
                        ? typeof val === "number"
                          ? formatMetric(val, 4)
                          : String(val)
                        : "-";
                    return (
                      <td
                        key={col}
                        className="px-4 py-2 font-body-sm text-on-surface font-mono text-right text-xs"
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {indicators.rows.length > 10 && (
        <div className="px-4 py-2 border-t border-outline-variant">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-primary hover:underline font-body-sm"
          >
            {showAll
              ? t('backtest.showLess')
              : t('backtest.showAll').replace('{count}', String(indicators.rows.length))}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare View
// ---------------------------------------------------------------------------

interface CompareViewProps {
  loading: boolean;
  result: BacktestCompareResponse | null;
  formatMetric: (v: number | null | undefined, d?: number) => string;
  formatPct: (v: number | null | undefined) => string;
}

function CompareView({ loading, result, formatMetric, formatPct }: CompareViewProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 font-body-sm text-on-surface-variant">
          {t('backtest.loadingComparison')}
        </p>
      </div>
    );
  }

  if (!result || result.runs.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 text-center">
        <p className="font-body-sm text-on-surface">{t('backtest.noRunsToCompare')}</p>
      </div>
    );
  }

  const metricRows = [
    { label: t('backtest.annReturn'), key: "annualized_return", pct: true },
    { label: t('backtest.infoRatio'), key: "information_ratio", pct: false },
    { label: t('backtest.maxDrawdown'), key: "max_drawdown", pct: true },
  ];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant">
        <h4 className="font-body-sm text-on-surface font-semibold">
          {t('backtest.runComparison').replace('{count}', String(result.runs.length))}
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="px-4 py-2 text-left font-body-sm text-on-surface-variant font-medium">
                {t('common.metric')}
              </th>
              {result.runs.map((run) => (
                <th
                  key={run.run_id}
                  className="px-4 py-2 text-right font-body-sm text-on-surface-variant font-medium"
                >
                  <span className="font-mono text-xs">
                    {run.run_id.substring(0, 8)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {metricRows.map((row) => (
              <tr key={row.label}>
                <td className="px-4 py-2 font-body-sm text-on-surface-variant font-medium">
                  {row.label}
                </td>
                {result.runs.map((run) => {
                  const val = run[row.key as keyof typeof run] as number | null;
                  return (
                    <td
                      key={run.run_id}
                      className="px-4 py-2 font-body-sm text-on-surface font-mono text-right"
                    >
                      {row.pct ? formatPct(val) : formatMetric(val, 4)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
