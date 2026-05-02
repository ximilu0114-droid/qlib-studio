import { useEffect, useRef } from "react";

interface Props {
  jobId: number | null;
  logs: string;
  onClose: () => void;
  onCancel: (jobId: number) => void;
  jobStatus?: string;
}

export default function JobLogs({
  jobId,
  logs,
  onClose,
  onCancel,
  jobStatus,
}: Props) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (jobId === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-container-lowest rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
        <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-body-lg text-on-surface font-semibold">
            Job #{jobId} Logs
          </h3>
          <div className="flex items-center space-x-2">
            {jobStatus === "running" && (
              <button
                onClick={() => onCancel(jobId)}
                className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded font-body-sm text-sm flex items-center"
              >
                <span className="material-symbols-outlined text-[16px] mr-1">
                  cancel
                </span>
                Cancel Job
              </button>
            )}
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:bg-surface-container-low p-1 rounded"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="font-mono text-sm text-on-surface whitespace-pre-wrap bg-surface-container-high p-4 rounded-lg min-h-[300px] max-h-[60vh] overflow-auto">
            {logs || "No logs yet..."}
            <div ref={logsEndRef} />
          </pre>
        </div>
        <div className="px-4 py-3 border-t border-outline-variant flex justify-between items-center">
          <div className="font-body-sm text-on-surface-variant">
            Status: <span className="font-medium">{jobStatus || "unknown"}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-container-high text-on-surface rounded font-body-sm hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
