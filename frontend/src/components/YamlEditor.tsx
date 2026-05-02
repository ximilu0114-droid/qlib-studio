import { useState, useEffect } from "react";

interface Props {
  filename: string | null;
  content: string;
  saving: boolean;
  onSave: (content: string) => void;
}

export default function YamlEditor({
  filename,
  content,
  saving,
  onSave,
}: Props) {
  const [editedContent, setEditedContent] = useState(content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setEditedContent(content);
    setDirty(false);
  }, [content]);

  const handleChange = (value: string) => {
    setEditedContent(value);
    setDirty(true);
  };

  const handleSave = () => {
    onSave(editedContent);
  };

  if (!filename) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex items-center justify-center h-96">
        <div className="text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-2">
            code
          </span>
          <p className="font-body-sm">Select a workflow template to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center">
        <div>
          <h3 className="font-body-sm text-on-surface font-semibold">
            {filename}
          </h3>
          {dirty && (
            <span className="text-xs text-amber-600 ml-2">(modified)</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="bg-surface-container-high text-on-surface border border-outline-variant px-3 py-1.5 rounded font-body-sm text-body-sm hover:opacity-90 transition-opacity flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[16px] mr-1">
            save
          </span>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <textarea
        value={editedContent}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-96 p-4 font-mono text-sm bg-surface-container-lowest text-on-surface resize-none focus:outline-none"
        spellCheck={false}
      />
    </div>
  );
}
