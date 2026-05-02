import { useEffect, useState } from "react";

interface DataPathSectionProps {
  currentPath: string;
  pathExists: boolean;
  onSave: (path: string) => Promise<void>;
}

export default function DataPathSection({
  currentPath,
  pathExists,
  onSave,
}: DataPathSectionProps) {
  const [input, setInput] = useState(currentPath);
  const [saving, setSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);

  useEffect(() => {
    setInput(currentPath);
  }, [currentPath]);

  const handleSave = async () => {
    setSaving(true);
    setSavingError(null);
    try {
      await onSave(input);
      setSavingError(null);
    } catch {
      setSavingError(
        "Failed to save Qlib data path. Please check if the backend is running."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded flex flex-col">
      <div className="p-4 border-b border-outline-variant">
        <h3 className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">
          Qlib Data Path
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          This path should point to the Qlib data directory.
        </p>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-center">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-surface-bright border border-outline-variant rounded px-3 py-1.5 font-code-snippet text-code-snippet text-on-surface focus:outline-none focus:border-primary focus:ring-0"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-surface-container-lowest text-on-surface border border-outline-variant px-4 py-1.5 rounded font-body-sm text-body-sm hover:bg-surface-container-low transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
        {savingError && (
          <div className="mt-3 flex items-center text-error font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[16px] mr-1">
              error
            </span>
            <span>{savingError}</span>
          </div>
        )}
        {!savingError && (
          <div className="mt-3 flex items-center text-on-surface-variant font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[16px] mr-1">
              {pathExists ? "folder_open" : "folder_off"}
            </span>
            <span>
              {pathExists ? "Current path verified" : "Path does not exist"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
