# Qlib Studio

[English](README.md) | [简体中文](README.zh-CN.md)

Qlib Studio is a local web workbench for [Microsoft Qlib](https://github.com/microsoft/qlib). It wraps common quant research tasks in a browser UI: environment readiness checks, Qlib data path validation, workflow editing and execution, job logs, MLflow experiment browsing, backtest analysis, and RD-Agent integration.

The project is designed to run on your own machine. Your Qlib data, workflow files, SQLite database, job logs, and MLflow artifacts stay local unless you configure a remote MLflow server yourself.

## Highlights

- Local dashboard for Qlib, Python, MLflow, and dataset readiness.
- Persistent Qlib data path and MLflow tracking URI settings.
- Built-in Qlib workflow templates for LightGBM Alpha158 and Alpha360.
- YAML workflow editor with saved workflows under `storage/workflows/`.
- Web UI for running `qrun`, tracking job status, viewing logs, and cancelling jobs.
- MLflow Experiment Center for experiments, runs, params, metrics, tags, and artifacts.
- Backtest Analyzer with return curves, drawdown charts, risk tables, and multi-run comparison.
- RD-Agent integration for automated factor evolution, model evolution, and report-based factor extraction.
- FastAPI backend with a typed React/Vite frontend.

## Screens

Qlib Studio currently includes five main views:

- **Workbench**: checks local Qlib installation, MLflow installation, configured data path, calendars, instruments, and features.
- **Workflows**: loads YAML templates, saves edited workflows, starts `qrun`, and streams job logs.
- **Experiments**: reads MLflow experiment results and lets you inspect runs and artifacts.
- **Backtest Analyzer**: loads Qlib backtest artifacts and displays return curves, drawdown charts, risk analysis tables, and multi-run comparison.
- **RD-Agent**: manages RD-Agent jobs for automated quantitative research, including status checks, job lifecycle, and log streaming.

## Phase 4 - Backtest Analyzer

Phase 4 adds a dedicated backtest analysis page to Qlib Studio. After running a Qlib workflow through `qrun`, you can inspect the resulting backtest artifacts directly in the browser.

### What it adds

- Interactive charts for cumulative return, benchmark return, excess return, and drawdown.
- Summary metrics cards (annualized return, information ratio, max drawdown, excess return with and without cost).
- Risk analysis table grouped by return type and metric.
- Indicator preview table for trade execution data.
- Multi-run comparison side by side.

### Qlib artifacts used

The Backtest Analyzer reads the following pickle files from the MLflow run's artifact directory:

| Artifact | Purpose |
| --- | --- |
| `portfolio_analysis/report_normal_1day.pkl` | Daily portfolio returns, benchmark returns, costs, and turnover used to build return and drawdown curves. |
| `portfolio_analysis/port_analysis_1day.pkl` | Risk analysis metrics (annualized return, information ratio, max drawdown) for excess return with and without cost. |
| `indicator_analysis_1day.pkl` | Trade execution indicators (fill rate, price advantage, etc.) shown as a preview table. |

All three are produced by a standard Qlib backtest workflow. If any artifact is missing, the corresponding section shows a warning instead of a blank area.

### Charts

- **Cumulative Return**: strategy NAV, benchmark NAV, and excess NAV over time.
- **Drawdown**: strategy drawdown from peak over time.

Both charts use Recharts and handle null or missing data points gracefully.

### Tables

- **Summary Metrics**: annualized return, information ratio, max drawdown, and excess return variants.
- **Risk Analysis**: rows for each metric, columns for excess return without cost and with cost.
- **Indicator Preview**: column names, row count, date range, and the first rows of indicator data.
- **Multi-Run Comparison**: select two or more runs and compare key metrics side by side.

### How to use

1. Open **Workflows** and run a Qlib workflow with `qrun`.
2. Wait for the job to finish (check **Workflows** for status and logs).
3. Open **Experiments** to find the run, or go directly to **Backtest Analyzer**.
4. Select the experiment and the run you want to analyze.
5. Click **Analyze**.
6. Charts, tables, and warnings load automatically based on available artifacts.

To compare multiple runs, check the boxes next to two or more runs and click **Compare Selected**.

### Limitations

- Only local MLflow artifacts are supported. Remote MLflow servers are not supported in this phase.
- Missing artifacts show warnings, not errors. The rest of the app continues to work.
- Live trading is not included.

## Phase 5 - RD-Agent Integration

Phase 5 adds [RD-Agent](https://github.com/microsoft/RD-Agent) integration to Qlib Studio. RD-Agent is a research automation framework from Microsoft that uses LLMs to iteratively generate, evaluate, and refine quantitative factors and models.

### What it adds

- Dedicated **RD-Agent** page in the web UI for managing automated research jobs.
- Status dashboard showing RD-Agent installation, Docker availability, and LLM configuration.
- One-click health check via `rdagent health_check`.
- Job lifecycle management: start, monitor logs, and cancel RD-Agent jobs.
- Configurable working directory, output directory, and environment file.
- Per-job log streaming with auto-scroll.

### Supported scenarios

| Scenario | Description |
| --- | --- |
| `fin_factor` | Iterative Factor Evolution — automated generation and evaluation of alpha factors. |
| `fin_model` | Iterative Model Evolution — train and evaluate predictive models autonomously. |
| `fin_quant` | Joint Factor & Model Evolution — end-to-end quantitative pipeline optimization. |
| `fin_factor_report` | Factor Extraction from Reports — extract alpha factors from text-based research reports. |

### Requirements

- **Linux recommended.** RD-Agent uses Docker containers internally. macOS works for development but Linux is recommended for production workloads.
- **Docker** installed and the Docker daemon running. Verify with `docker info`.
- **RD-Agent** installed. Install with `pip install rdagent`.
- **LLM configuration** in a `.env` file in the project root. Required keys depend on your LLM provider:
  - `OPENAI_API_KEY` and `OPENAI_API_BASE` for OpenAI-compatible endpoints.
  - `CHAT_MODEL` and `EMBEDDING_MODEL` for model selection.
  - See RD-Agent's `.env.example` for the full list.

### How to check RD-Agent status

1. Open the **RD-Agent** page in the UI.
2. The status panel shows:
   - Python version
   - RD-Agent installation and version
   - Docker CLI and daemon status
   - `.env` file presence and LLM config detection
   - Working directory and output directory
3. All checks are non-blocking — warnings are shown for any missing component.

### How to run a health check

1. Open the **RD-Agent** page.
2. Click **Run Health Check**.
3. The output of `rdagent health_check --no-check-env` is displayed in the UI.
4. Secrets are automatically redacted from the output.

### How to start an RD-Agent job

1. Open the **RD-Agent** page.
2. Select a scenario (e.g. `fin_quant`).
3. Optionally add extra arguments or environment variables.
4. Click **Start Job**.
5. Monitor job status and logs from the same page.
6. Cancel a running job at any time with the **Cancel** button.

### Where logs are saved

RD-Agent job logs are saved to:

```text
storage/logs/rdagent/{job_id}.log
```

Each log file contains the scenario, working directory, command, and full stdout/stderr output from the `rdagent` process.

### Current limitations

- No automatic factor registration yet. RD-Agent output must be manually integrated into Qlib workflows.
- No automatic model registration yet. Generated models are not automatically added to the Qlib model zoo.
- No automatic Qlib workflow generation from RD-Agent output yet.
- No live trading.
- Docker is required for most RD-Agent scenarios. Local-only execution is not fully supported.

## Tech Stack

| Layer | Stack |
| --- | --- |
| Backend | Python 3.10+, FastAPI, SQLAlchemy, Pydantic |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Storage | SQLite, local filesystem |
| Quant workflow | Microsoft Qlib, `qrun` |
| Experiment tracking | MLflow |
| Research automation | Microsoft RD-Agent, Docker |

## Prerequisites & Download

Qlib Studio requires the following external tools. Please install them separately as they are not included in this repository to keep it lightweight.

1. **Microsoft Qlib** ([GitHub](https://github.com/microsoft/qlib))
   ```bash
   pip install pyqlib
   ```

2. **Microsoft RD-Agent** ([GitHub](https://github.com/microsoft/RD-Agent))
   ```bash
   pip install rdagent
   ```

3. **MLflow** (Optional, for Experiment Center)
   ```bash
   pip install mlflow
   ```

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/ximilu0114-droid/qlib-studio.git
cd qlib-studio
```

If your local folder name contains spaces, the commands still work. Just keep using quoted paths when needed.

### 2. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate

pip install -e ".[mlflow]" pyqlib
python run.py
```

The API runs at [http://localhost:8000](http://localhost:8000). Open [http://localhost:8000/docs](http://localhost:8000/docs) for the generated API docs.

### 3. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173). Vite proxies `/api` requests to the backend at `localhost:8000`.

### 4. Configure Qlib data

By default, Qlib Studio checks:

```text
~/.qlib/qlib_data/cn_data
```

If your Qlib dataset lives somewhere else, open the Workbench page and update the data path. A valid dataset should include calendars, instruments, and feature files.

### 5. Run a workflow

1. Open **Workflows**.
2. Select one of the built-in templates.
3. Edit the YAML if needed.
4. Save it as a workflow file.
5. Click **Run qrun**.
6. Watch job status and logs from the same page.

Saved workflows are written to `storage/workflows/`. Job logs are written to `storage/logs/jobs/{job_id}.log`.

## Configuration

Qlib Studio works with sensible local defaults and stores user-facing settings in SQLite.

| Setting | Default | Where to change |
| --- | --- | --- |
| Qlib data path | `~/.qlib/qlib_data/cn_data` | Workbench UI |
| MLflow tracking URI | `file:./mlruns` | Experiments UI |
| RD-Agent working dir | `.` (project root) | RD-Agent UI |
| RD-Agent output dir | `storage/rdagent_outputs` | RD-Agent UI |
| RD-Agent env file | `.env` | RD-Agent UI |
| Backend URL | `http://localhost:8000` | `frontend/vite.config.ts` proxy |
| Frontend URL | `http://localhost:5173` | Vite dev server |

The backend also supports environment variables with the `QLIB_STUDIO_` prefix. For example:

```bash
QLIB_STUDIO_DEBUG=true python run.py
```

For `qrun`, the working directory is restricted to the project root, `backend/`, or a directory provided by `QLIB_STUDIO_SAFE_WORKING_DIR`.

```bash
export QLIB_STUDIO_SAFE_WORKING_DIR=/path/to/research/workspace
```

## Project Structure

```text
qlib-studio/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routes
│   │   ├── core/         # App configuration
│   │   ├── db/           # SQLite models and session setup
│   │   ├── schemas/      # Pydantic response/request models
│   │   └── services/     # Qlib, workflow, job, MLflow, RD-Agent services
│   ├── tests/
│   ├── pyproject.toml
│   └── run.py
├── configs/
│   └── qlib_templates/   # Built-in workflow YAML templates
├── frontend/
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # Dashboard, workflow, experiment, RD-Agent UI
│   │   └── types/        # Shared TypeScript API types
│   ├── package.json
│   └── vite.config.ts
└── storage/
    ├── qlib_studio.db    # Auto-created SQLite database
    ├── workflows/        # Saved workflow YAML files
    └── logs/
        ├── jobs/         # Per-job qrun logs
        └── rdagent/      # Per-job RD-Agent logs
```

## API Overview

| Area | Endpoints |
| --- | --- |
| Health | `GET /api/health` |
| Qlib status | `GET /api/qlib/status` |
| Settings | `GET /api/settings`, `POST /api/settings/qlib-data-path`, `POST /api/settings/mlflow-tracking-uri`, `POST /api/settings/rdagent` |
| Workflows | `GET /api/workflows/templates`, `GET /api/workflows/templates/{name}`, `POST /api/workflows/save`, `GET /api/workflows/list`, `GET /api/workflows/{filename}`, `PUT /api/workflows/{filename}` |
| Jobs | `POST /api/jobs/qrun`, `GET /api/jobs`, `GET /api/jobs/{id}`, `GET /api/jobs/{id}/logs`, `POST /api/jobs/{id}/cancel` |
| Experiments | `GET /api/experiments`, `GET /api/experiments/{id}`, `GET /api/experiments/{id}/runs`, `GET /api/runs/{id}`, `GET /api/runs/{id}/params`, `GET /api/runs/{id}/metrics`, `GET /api/runs/{id}/artifacts` |
| Backtest | `GET /api/backtest/runs/{id}/summary`, `GET /api/backtest/runs/{id}/curves`, `GET /api/backtest/runs/{id}/risk`, `GET /api/backtest/runs/{id}/indicators`, `POST /api/backtest/compare` |
| RD-Agent | `GET /api/rdagent/status`, `POST /api/rdagent/health-check`, `POST /api/rdagent/jobs`, `GET /api/rdagent/jobs`, `GET /api/rdagent/jobs/{id}`, `GET /api/rdagent/jobs/{id}/logs`, `POST /api/rdagent/jobs/{id}/cancel` |

## Development

Run backend tests:

```bash
cd backend
pip install -e ".[dev,mlflow]" pyqlib
pytest
```

Build the frontend:

```bash
cd frontend
npm install
npm run build
```


## Troubleshooting

- If `pip install -e "[... ]"` fails with proxy/network errors (for example `403 Forbidden` when resolving packages), configure a reachable package index or proxy first, then retry installation.
- Backend tests depend on the `dev` extra (`httpx`, `pytest`, `pytest-asyncio`). Install with:

```bash
cd backend
pip install -e ".[dev,mlflow]" pyqlib
pytest
```

## Roadmap

| Phase | Feature | Status |
| --- | --- | --- |
| Phase 1 | Foundation and environment checker | Done |
| Phase 2 | Qlib workflow runner | Done |
| Phase 3 | MLflow Experiment Center | Done |
| Phase 4 | Backtest analyzer and charts | Done |
| Phase 5 | RD-Agent integration | Current |
| Phase 6 | RD-Agent output parser and factor/model library | Planned |
| Phase 7 | Full AI quant research loop | Planned |

## Notes

- Qlib Studio does not download market data for you yet. Prepare your Qlib data separately, then point the UI to that directory.
- The Experiment Center reads MLflow data; it does not rewrite runs or artifacts.
- If MLflow is missing or the tracking path does not exist, the rest of the app continues to work and the Experiments page shows an empty or warning state.

## License

MIT
