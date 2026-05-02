import type { Job } from "../types/api";

interface Props {
  jobs: Job[];
  onViewLogs: (jobId: number) => void;
  onCancel: (jobId: number) => void;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-800",
    running: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleTimeString();
}

export default function JobList({ jobs, onViewLogs, onCancel }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
          work
        </span>
        <p className="font-body-sm text-on-surface-variant">No jobs yet</p>
        <p className="text-xs text-on-surface-variant mt-1">
          Run a workflow to see jobs here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant">
        <h3 className="font-body-sm text-on-surface font-semibold">Jobs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="px-4 py-3 text-left font-body-sm text-on-surface-variant font-medium">
                ID
              </th>
              <th className="px-4 py-3 text-left font-body-sm text-on-surface-variant font-medium">
                Type
              </th>
              <th className="px-4 py-3 text-left font-body-sm text-on-surface-variant font-medium">
                Status
              </th>
              <th className="px-4 py-3 text-left font-body-sm text-on-surface-variant font-medium">
                Workflow Path
              </th>
              <th className="px-4 py-3 text-left font-body-sm text-on-surface-variant font-medium">
                Started
              </th>
              <th className="px-4 py-3 text-left font-body-sm text-on-surface-variant font-medium">
                Finished
              </th>
              <th className="px-4 py-3 text-right font-body-sm text-on-surface-variant font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-surface-container-low">
                <td className="px-4 py-3 font-body-sm text-on-surface">
                  {job.id}
                </td>
                <td className="px-4 py-3 font-body-sm text-on-surface-variant">
                  {job.type}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 font-body-sm text-on-surface-variant max-w-xs truncate">
                  {job.workflow_path}
                </td>
                <td className="px-4 py-3 font-body-sm text-on-surface-variant">
                  {formatTime(job.started_at)}
                </td>
                <td className="px-4 py-3 font-body-sm text-on-surface-variant">
                  {formatTime(job.finished_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onViewLogs(job.id)}
                      className="text-primary hover:bg-primary-container px-2 py-1 rounded text-xs font-medium"
                    >
                      Logs
                    </button>
                    {job.status === "running" && (
                      <button
                        onClick={() => onCancel(job.id)}
                        className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
