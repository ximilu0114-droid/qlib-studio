import { useState, useEffect, useCallback } from "react";
import type { Job, SavedWorkflow, TemplateItem } from "../types/api";
import {
  fetchWorkflowTemplates,
  fetchTemplateContent,
  saveWorkflow,
  fetchSavedWorkflows,
  startQrunJob,
  fetchJobs,
  fetchJobLogs,
  cancelJob,
} from "../api/client";
import WorkflowList from "./WorkflowList";
import YamlEditor from "./YamlEditor";
import JobList from "./JobList";
import JobLogs from "./JobLogs";

export default function WorkflowRunner() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateContent, setTemplateContent] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logJobId, setLogJobId] = useState<number | null>(null);
  const [logContent, setLogContent] = useState("");
  const [saveFilename, setSaveFilename] = useState("");
  const [selectedWorkflowName, setSelectedWorkflowName] = useState("");
  const [workingDir, setWorkingDir] = useState(".");
  const [errors, setErrors] = useState<string[]>([]);

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error";

  const addError = (msg: string) => {
    setErrors((prev) => (prev.includes(msg) ? prev : [...prev, msg]));
  };

  const clearErrors = () => setErrors([]);

  const loadData = useCallback(async (preferredWorkflowName?: string) => {
    setLoading(true);
    clearErrors();

    const results = await Promise.allSettled([
      fetchWorkflowTemplates(),
      fetchSavedWorkflows(),
      fetchJobs(),
    ]);

    const [templatesResult, savedResult, jobsResult] = results;

    if (templatesResult.status === "fulfilled") {
      setTemplates(templatesResult.value.templates);
      setSelectedTemplate(
        (current) => current ?? templatesResult.value.templates[0]?.name ?? null,
      );
    } else {
      console.error("Failed to load templates:", templatesResult.reason);
      addError(`Failed to load workflow templates. ${getErrorMessage(templatesResult.reason)}`);
    }

    if (savedResult.status === "fulfilled") {
      setSavedWorkflows(savedResult.value);
      setSelectedWorkflowName(
        (current) => preferredWorkflowName ?? current ?? savedResult.value[0]?.filename ?? "",
      );
    } else {
      console.error("Failed to load saved workflows:", savedResult.reason);
      addError(`Failed to load saved workflows. ${getErrorMessage(savedResult.reason)}`);
    }

    if (jobsResult.status === "fulfilled") {
      setJobs(jobsResult.value);
    } else {
      console.error("Failed to load jobs:", jobsResult.reason);
      addError(`Failed to load jobs. ${getErrorMessage(jobsResult.reason)}`);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedTemplate) {
      fetchTemplateContent(selectedTemplate)
        .then((data) => {
          setTemplateContent(data.content);
        })
        .catch((error) => {
          console.error("Failed to load template:", error);
          addError(`Failed to open workflow template. ${getErrorMessage(error)}`);
        });
    }
  }, [selectedTemplate]);

  useEffect(() => {
    const hasRunningJobs = jobs.some((j) => j.status === "running");
    if (!hasRunningJobs) return;

    const interval = setInterval(async () => {
      try {
        const jobsData = await fetchJobs();
        setJobs(jobsData);
      } catch (error) {
        console.error("Failed to refresh jobs:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobs]);

  useEffect(() => {
    if (logJobId === null) return;

    const job = jobs.find((j) => j.id === logJobId);
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
        const logData = await fetchJobLogs(logJobId);
        setLogContent(logData.logs);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [logJobId, jobs]);

  const handleSelectTemplate = (filename: string) => {
    setSelectedTemplate(filename);
    setSaveFilename(filename);
  };

  const handleSave = async (content: string) => {
    if (!saveFilename.trim()) return;
    setSaving(true);
    try {
      const saved = await saveWorkflow({ name: saveFilename, content });
      setTemplateContent(content);
      setSelectedWorkflowName(saved.name);
      clearErrors();
      await loadData(saved.name);
    } catch (error) {
      console.error("Failed to save:", error);
      addError(`Failed to save workflow. ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!selectedWorkflowName.trim()) return;
    try {
      await startQrunJob({
        workflow_name: selectedWorkflowName,
        working_dir: workingDir,
      });
      const jobsData = await fetchJobs();
      setJobs(jobsData);
      clearErrors();
    } catch (error) {
      console.error("Failed to start job:", error);
      addError(`Failed to start qrun job. ${getErrorMessage(error)}`);
    }
  };

  const handleViewLogs = async (jobId: number) => {
    setLogJobId(jobId);
    setLogContent("");
    try {
      const logData = await fetchJobLogs(jobId);
      setLogContent(logData.logs);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      addError(`Failed to fetch job logs. ${getErrorMessage(error)}`);
    }
  };

  const handleCancel = async (jobId: number) => {
    try {
      await cancelJob(jobId);
      const jobsData = await fetchJobs();
      setJobs(jobsData);
      clearErrors();
    } catch (error) {
      console.error("Failed to cancel job:", error);
      addError(`Failed to cancel job. ${getErrorMessage(error)}`);
    }
  };

  const handleCloseLogs = () => {
    setLogJobId(null);
    setLogContent("");
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

      {/* Template Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <WorkflowList
            templates={templates}
            selected={selectedTemplate}
            onSelect={handleSelectTemplate}
          />
        </div>
        <div className="lg:col-span-2">
          <YamlEditor
            filename={selectedTemplate}
            content={templateContent}
            saving={saving}
            onSave={handleSave}
          />
        </div>
      </div>

      {/* Save Workflow Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
        <h3 className="font-body-sm text-on-surface font-semibold mb-3">
          Save Workflow
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={saveFilename}
            onChange={(e) => setSaveFilename(e.target.value)}
            placeholder="Enter filename (e.g., my_workflow.yaml)"
            className="flex-1 px-3 py-2 border border-outline-variant rounded font-body-sm text-on-surface bg-surface-container-low focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => handleSave(templateContent)}
            disabled={saving || !saveFilename.trim()}
            className="bg-primary text-on-primary px-4 py-2 rounded font-body-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Run Workflow Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
        <h3 className="font-body-sm text-on-surface font-semibold mb-3">
          Run Workflow
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block font-body-sm text-on-surface-variant mb-1">
              Saved Workflow
            </label>
            <select
              value={selectedWorkflowName}
              onChange={(e) => setSelectedWorkflowName(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant rounded font-body-sm text-on-surface bg-surface-container-low focus:outline-none focus:border-primary"
            >
              <option value="">Select a saved workflow</option>
              {savedWorkflows.map((workflow) => (
                <option key={workflow.filename} value={workflow.filename}>
                  {workflow.filename}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-body-sm text-on-surface-variant mb-1">
              Working Directory
            </label>
            <input
              type="text"
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              placeholder="."
              className="w-full px-3 py-2 border border-outline-variant rounded font-body-sm text-on-surface bg-surface-container-low focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={!selectedWorkflowName.trim()}
          className="bg-primary text-on-primary px-4 py-2 rounded font-body-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <span className="material-symbols-outlined text-[16px] mr-1">
            play_arrow
          </span>
          Run qrun
        </button>
      </div>

      {/* Job List Section */}
      <JobList
        jobs={jobs}
        onViewLogs={handleViewLogs}
        onCancel={handleCancel}
      />

      {/* Log Viewer */}
      <JobLogs
        jobId={logJobId}
        logs={logContent}
        onClose={handleCloseLogs}
        onCancel={handleCancel}
        jobStatus={jobs.find((j) => j.id === logJobId)?.status}
      />
    </div>
  );
}
