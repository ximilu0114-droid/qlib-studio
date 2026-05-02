# Qlib Studio

[English](README.md) | [简体中文](README.zh-CN.md)

Qlib Studio is a local web workbench for [Microsoft Qlib](https://github.com/microsoft/qlib). It wraps common quant research tasks in a browser UI: environment readiness checks, Qlib data path validation, workflow editing and execution, job logs, and MLflow experiment browsing.

The project is designed to run on your own machine. Your Qlib data, workflow files, SQLite database, job logs, and MLflow artifacts stay local unless you configure a remote MLflow server yourself.

## Highlights

- Local dashboard for Qlib, Python, MLflow, and dataset readiness.
- Persistent Qlib data path and MLflow tracking URI settings.
- Built-in Qlib workflow templates for LightGBM Alpha158 and Alpha360.
- YAML workflow editor with saved workflows under `storage/workflows/`.
- Web UI for running `qrun`, tracking job status, viewing logs, and cancelling jobs.
- MLflow Experiment Center for experiments, runs, params, metrics, tags, and artifacts.
- FastAPI backend with a typed React/Vite frontend.

## Screens

Qlib Studio currently includes three main views:

- **Workbench**: checks local Qlib installation, MLflow installation, configured data path, calendars, instruments, and features.
- **Workflows**: loads YAML templates, saves edited workflows, starts `qrun`, and streams job logs.
- **Experiments**: reads MLflow experiment results and lets you inspect runs and artifacts.

## Tech Stack

| Layer | Stack |
| --- | --- |
| Backend | Python 3.10+, FastAPI, SQLAlchemy, Pydantic |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Storage | SQLite, local filesystem |
| Quant workflow | Microsoft Qlib, `qrun` |
| Experiment tracking | MLflow |

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
│   │   └── services/     # Qlib, workflow, job, MLflow services
│   ├── tests/
│   ├── pyproject.toml
│   └── run.py
├── configs/
│   └── qlib_templates/   # Built-in workflow YAML templates
├── frontend/
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # Dashboard, workflow, experiment UI
│   │   └── types/        # Shared TypeScript API types
│   ├── package.json
│   └── vite.config.ts
└── storage/
    ├── qlib_studio.db    # Auto-created SQLite database
    ├── workflows/        # Saved workflow YAML files
    └── logs/jobs/        # Per-job qrun logs
```

## API Overview

| Area | Endpoints |
| --- | --- |
| Health | `GET /api/health` |
| Qlib status | `GET /api/qlib/status` |
| Settings | `GET /api/settings`, `POST /api/settings/qlib-data-path`, `POST /api/settings/mlflow-tracking-uri` |
| Workflows | `GET /api/workflows/templates`, `GET /api/workflows/templates/{name}`, `POST /api/workflows/save`, `GET /api/workflows/list`, `GET /api/workflows/{filename}`, `PUT /api/workflows/{filename}` |
| Jobs | `POST /api/jobs/qrun`, `GET /api/jobs`, `GET /api/jobs/{id}`, `GET /api/jobs/{id}/logs`, `POST /api/jobs/{id}/cancel` |
| Experiments | `GET /api/experiments`, `GET /api/experiments/{id}`, `GET /api/experiments/{id}/runs`, `GET /api/runs/{id}`, `GET /api/runs/{id}/params`, `GET /api/runs/{id}/metrics`, `GET /api/runs/{id}/artifacts` |

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
| Phase 3 | MLflow Experiment Center | Current |
| Phase 4 | Backtest analyzer and charts | Planned |
| Phase 5 | RD-Agent integration | Planned |

## Notes

- Qlib Studio does not download market data for you yet. Prepare your Qlib data separately, then point the UI to that directory.
- The Experiment Center reads MLflow data; it does not rewrite runs or artifacts.
- If MLflow is missing or the tracking path does not exist, the rest of the app continues to work and the Experiments page shows an empty or warning state.

## License

MIT
