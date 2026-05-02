interface DataHealthProps {
  dataPathExists: boolean;
  calendarExists: boolean;
  instrumentsExists: boolean;
  featuresExists: boolean;
}

function CheckItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors">
      <span className="font-code-snippet text-code-snippet text-on-surface">
        {label}
      </span>
      <span
        className={`material-symbols-outlined text-[18px] ${ok ? "text-on-surface" : "text-error"}`}
      >
        {ok ? "check_circle" : "cancel"}
      </span>
    </li>
  );
}

export default function DataHealth({
  dataPathExists,
  calendarExists,
  instrumentsExists,
  featuresExists,
}: DataHealthProps) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded flex flex-col">
      <div className="p-4 border-b border-outline-variant">
        <h3 className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">
          Data Health
        </h3>
      </div>
      <div className="p-0">
        <ul className="divide-y divide-outline-variant">
          <CheckItem label="Data path exists" ok={dataPathExists} />
          <CheckItem label="calendars folder exists" ok={calendarExists} />
          <CheckItem label="instruments folder exists" ok={instrumentsExists} />
          <CheckItem label="features folder exists" ok={featuresExists} />
        </ul>
      </div>
    </div>
  );
}
