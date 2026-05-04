import { useTranslation } from "../i18n";

interface StatusCardsProps {
  backendOk: boolean;
  pythonVersion: string;
  qlibInstalled: boolean;
  qlibVersion: string | null;
  mlflowInstalled: boolean;
  mlflowVersion: string | null;
}

interface CardProps {
  label: string;
  value: string;
  ok: boolean;
  icon?: string;
}

function Card({ label, value, ok, icon }: CardProps) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded p-3 flex flex-col justify-between h-24">
      <span className="font-label-mono text-label-mono text-on-surface-variant">
        {label}
      </span>
      <div className="flex items-center mt-2">
        {icon ? (
          <span
            className={`material-symbols-outlined text-[16px] mr-1 ${ok ? "text-on-surface" : "text-error"}`}
          >
            {icon}
          </span>
        ) : (
          <div
            className={`w-2 h-2 rounded-full mr-2 ${ok ? "bg-on-surface" : "bg-error"}`}
          />
        )}
        <span className="font-code-snippet text-code-snippet text-on-surface">
          {value}
        </span>
      </div>
    </div>
  );
}

export default function StatusCards({
  backendOk,
  pythonVersion,
  qlibInstalled,
  qlibVersion,
  mlflowInstalled,
  mlflowVersion,
}: StatusCardsProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="font-label-mono text-label-mono text-on-surface-variant mb-3 uppercase tracking-widest border-b border-outline-variant pb-1">
        {t('dashboard.systemStatus')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-panel-gap">
        <Card
          label={t('statusCards.backendStatus')}
          value={backendOk ? t('common.online') : t('common.offline')}
          ok={backendOk}
        />
        <Card
          label={t('statusCards.pythonVersion')}
          value={pythonVersion || "\u2014"}
          ok={!!pythonVersion}
        />
        <Card
          label={t('statusCards.qlibInstalled')}
          value={qlibInstalled ? t('common.yes') : t('common.no')}
          ok={qlibInstalled}
          icon="check"
        />
        <Card
          label={t('statusCards.qlibVersion')}
          value={qlibVersion || "\u2014"}
          ok={qlibInstalled}
        />
        <Card
          label={t('statusCards.mlflowInstalled')}
          value={mlflowInstalled ? t('common.yes') : t('common.no')}
          ok={mlflowInstalled}
          icon="check"
        />
        <Card
          label={t('statusCards.mlflowVersion')}
          value={mlflowVersion || "\u2014"}
          ok={mlflowInstalled}
        />
      </div>
    </div>
  );
}
