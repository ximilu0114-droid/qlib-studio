interface ReadinessBannerProps {
  ready: boolean;
}

export default function ReadinessBanner({ ready }: ReadinessBannerProps) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span
          className={`material-symbols-outlined ${ready ? "text-on-surface" : "text-error"}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {ready ? "check_circle" : "error"}
        </span>
        <span className="font-headline-sm text-headline-sm text-on-surface">
          {ready ? "System Ready" : "System Not Ready"}
        </span>
      </div>
      <span
        className={`${ready ? "bg-surface-variant" : "bg-error-container"} ${ready ? "text-on-surface" : "text-on-error-container"} px-2 py-0.5 rounded font-label-mono text-label-mono border border-outline-variant`}
      >
        {ready ? "ALL SYSTEMS GO" : "ISSUES DETECTED"}
      </span>
    </div>
  );
}
