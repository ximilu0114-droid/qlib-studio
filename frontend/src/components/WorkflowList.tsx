import type { TemplateItem } from "../types/api";
import { useTranslation } from "../i18n";

interface Props {
  templates: TemplateItem[];
  selected: string | null;
  onSelect: (name: string) => void;
}

export default function WorkflowList({ templates, selected, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant">
        <h3 className="font-body-sm text-on-surface font-semibold">
          {t('workflow.workflowTemplates')}
        </h3>
      </div>
      <div className="divide-y divide-outline-variant max-h-96 overflow-y-auto">
        {templates.map((template) => (
          <button
            key={template.name}
            onClick={() => onSelect(template.name)}
            className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
              selected === template.name
                ? "bg-primary-container text-on-primary-container"
                : "hover:bg-surface-container-low text-on-surface"
            }`}
          >
            <div className="flex items-center">
              <span className="material-symbols-outlined mr-2 text-[18px]">
                description
              </span>
              <div>
                <div className="font-body-sm font-medium">{template.name}</div>
              </div>
            </div>
          </button>
        ))}
        {templates.length === 0 && (
          <div className="px-4 py-6 text-center text-on-surface-variant text-sm">
            {t('workflow.noTemplatesFound')}
          </div>
        )}
      </div>
    </div>
  );
}
