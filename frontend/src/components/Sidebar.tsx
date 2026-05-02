interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ currentPage, onNavigate }: Props) {
  return (
    <nav className="bg-surface-container-lowest text-on-surface font-body-sm fixed left-0 top-0 h-screen w-64 border-r border-outline-variant pt-12 z-40 hidden md:flex flex-col">
      <div className="px-4 mb-8">
        <h1 className="text-sm font-black uppercase tracking-widest text-on-surface">
          Qlib Studio
        </h1>
        <span className="text-on-surface-variant font-label-mono text-label-mono mt-1 block">
          v0.2.0-alpha
        </span>
      </div>
      <div className="flex-1 px-2 space-y-1">
        <button
          onClick={() => onNavigate("dashboard")}
          className={`w-full text-left flex items-center px-3 py-2 transition-colors border-l-2 ${
            currentPage === "dashboard"
              ? "bg-surface-variant text-on-surface border-primary"
              : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border-transparent"
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[18px]">
            terminal
          </span>
          Workbench
        </button>
        <button
          onClick={() => onNavigate("workflows")}
          className={`w-full text-left flex items-center px-3 py-2 transition-colors border-l-2 ${
            currentPage === "workflows"
              ? "bg-surface-variant text-on-surface border-primary"
              : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border-transparent"
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[18px]">
            play_circle
          </span>
          Workflows
        </button>
        <button
          onClick={() => onNavigate("experiments")}
          className={`w-full text-left flex items-center px-3 py-2 transition-colors border-l-2 ${
            currentPage === "experiments"
              ? "bg-surface-variant text-on-surface border-primary"
              : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border-transparent"
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[18px]">
            science
          </span>
          Experiments
        </button>
        <a className="text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface flex items-center px-3 py-2 transition-colors border-l-2 border-transparent opacity-50 cursor-not-allowed">
          <span className="material-symbols-outlined mr-3 text-[18px]">
            database
          </span>
          Datasets
        </a>
        <a className="text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface flex items-center px-3 py-2 transition-colors border-l-2 border-transparent opacity-50 cursor-not-allowed">
          <span className="material-symbols-outlined mr-3 text-[18px]">hub</span>
          Models
        </a>
        <a className="text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface flex items-center px-3 py-2 transition-colors border-l-2 border-transparent opacity-50 cursor-not-allowed">
          <span className="material-symbols-outlined mr-3 text-[18px]">
            settings
          </span>
          System Settings
        </a>
      </div>
    </nav>
  );
}
