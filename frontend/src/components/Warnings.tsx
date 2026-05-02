interface WarningsProps {
  warnings: string[];
  backendError?: boolean;
}

export default function Warnings({ warnings, backendError }: WarningsProps) {
  if (backendError) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded p-4">
        <h3 className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-3 border-b border-outline-variant pb-1">
          System Warnings
        </h3>
        <div className="bg-error-container border border-outline-variant rounded p-3 flex items-start">
          <span className="material-symbols-outlined text-on-error-container mr-3 mt-0.5">
            error
          </span>
          <div>
            <p className="font-body-md text-body-md text-on-error-container">
              Backend is not reachable. Please start the FastAPI server on port 8000.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded p-4">
      <h3 className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-3 border-b border-outline-variant pb-1">
        System Warnings
      </h3>
      {warnings.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded p-3 flex items-start">
          <span className="material-symbols-outlined text-on-surface-variant mr-3 mt-0.5">
            info
          </span>
          <div>
            <p className="font-body-md text-body-md text-on-surface">
              No active warnings.
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              The system is operating within expected parameters.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="bg-error-container border border-outline-variant rounded p-3 flex items-start"
            >
              <span className="material-symbols-outlined text-on-error-container mr-3 mt-0.5">
                warning
              </span>
              <p className="font-body-md text-body-md text-on-error-container">
                {w}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
