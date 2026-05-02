# Qlib Studio

A local web-based research workbench for [Microsoft Qlib](https://github.com/microsoft/qlib).

Qlib Studio provides a visual dashboard to manage your Qlib environment, configure data paths, and monitor system readiness — all running locally on your machine.

## Current Phase

**Phase 3 — Experiment Center**

## Features

### Phase 1 (Foundation)
- FastAPI backend with SQLite storage
- Qlib installation and version detection
- MLflow installation and version detection
- Qlib data path validation (calendars, instruments, features)
- Configurable data path with persistent settings
- Real-time dashboard UI with system status overview

### Phase 2 (Workflow Runner)
- View and edit Qlib workflow YAML templates
- Save workflow YAML files
- Run `qrun` from the web UI using subprocess
- Real-time job status monitoring
- Live log streaming with polling
- Cancel running jobs
- Job history and metadata storage

### Phase 3 (Experiment Center)
- View MLflow experiments created by Qlib workflows
- Browse runs under each experiment
- View run details: params, metrics, and tags
- Browse run artifacts with folder navigation
- Configure MLflow tracking URI from the UI
- Graceful fallback when MLflow is not installed or mlruns path is missing

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.10+, FastAPI, SQLAlchemy, Pydantic |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Database | SQLite |
| Icons | Google Material Symbols |
| Fonts | Inter, Space Grotesk |

## Project Structure

```
qlib-studio/
├── backend/
│   ├── pyproject.toml
│   ├── run.py
│   └── app/
│       ├── main.py              # FastAPI app, CORS, lifespan
│       ├── api/
│       │   ├── health.py        # GET /api/health
│       │   ├── qlib_status.py   # GET /api/qlib/status
│       │   ├── settings.py      # GET/POST /api/settings
│       │   ├── workflows.py     # Workflow & template endpoints
│       │   ├── jobs.py          # Job execution endpoints
│       │   └── experiments.py   # Experiment & run endpoints
│       ├── services/
│       │   ├── qlib_checker.py  # Environment checks
│       │   ├── path_checker.py  # Path validation
│       │   ├── template_service.py  # YAML template management
│       │   ├── workflow_service.py  # Workflow file management
│       │   ├── job_runner.py    # qrun subprocess management
│       │   └── experiment_service.py # MLflow experiment reader
│       ├── core/
│       │   └── config.py        # App configuration
│       ├── schemas/
│       │   ├── qlib.py          # Qlib response models
│       │   ├── settings.py      # Settings models
│       │   ├── workflows.py     # Workflow & job models
│       │   └── experiments.py   # Experiment & run models
│       └── db/
│           ├── database.py      # SQLAlchemy engine
│           └── models.py        # DB models (Setting, Job)
├── configs/
│   └── qlib_templates/          # YAML workflow templates
│       ├── workflow_config_lightgbm_Alpha158.yaml
│       └── workflow_config_lightgbm_Alpha360.yaml
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx
│       ├── api/client.ts
│       ├── types/api.ts
│       └── components/
│           ├── Sidebar.tsx
│           ├── ReadinessBanner.tsx
│           ├── StatusCards.tsx
│           ├── DataPathSection.tsx
│           ├── DataHealth.tsx
│           ├── Warnings.tsx
│           ├── WorkflowRunner.tsx
│           ├── WorkflowList.tsx
│           ├── YamlEditor.tsx
│           ├── JobList.tsx
│           ├── JobLogs.tsx
│           └── ExperimentCenter.tsx
└── storage/
    ├── qlib_studio.db           # SQLite database (auto-created)
    ├── workflows/               # Saved workflow files
    └── logs/
        └── jobs/                # Per-job log files
            └── {job_id}.log
```

## Prerequisites

Before running Qlib Studio, you need to install:

### 1. Microsoft Qlib

```bash
pip install pyqlib
```

Or install from source:

```bash
git clone https://github.com/microsoft/qlib.git
cd qlib
pip install .
```

### 2. MLflow (Optional, for Experiment Center)

```bash
pip install mlflow
```

## Quick Start

### Backend

```bash
cd backend

# Install dependencies
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings

# Start the server
python run.py
```

The backend runs at `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend.

### What This Phase Adds

Phase 3 introduces the Experiment Center, which reads MLflow experiment results created by Qlib workflows. Users can browse experiments, inspect runs, view parameters and metrics, and navigate artifact files — all from the web UI.

### How It Works

Qlib Studio uses the `mlflow.tracking.MlflowClient` API to read experiment data. When you run a Qlib workflow via `qrun`, MLflow automatically logs parameters, metrics, and artifacts to the configured tracking URI. Qlib Studio then reads this data and displays it in the Experiment Center.

### Default MLflow Tracking URI

By default, Qlib Studio uses:

```
file:./mlruns
```

This means MLflow reads experiment data from the `mlruns` directory relative to the backend working directory. If your Qlib workflows store results elsewhere, you can configure the tracking URI in the UI.

### Configuring the Tracking URI

1. Navigate to the **Experiments** page in the sidebar
2. In the **MLflow Configuration** section, enter the tracking URI
3. Click **Save**

Accepted formats:
- `file:./mlruns` — relative path
- `/absolute/path/to/mlruns` — absolute path
- `https://remote-server` — remote MLflow server

### Viewing Experiments

1. Navigate to the **Experiments** page
2. The experiment list shows all MLflow experiments with:
   - Experiment name
   - Experiment ID
   - Number of runs

### Viewing Runs

1. Click an experiment to view its runs
2. The run list shows:
   - Run ID (first 8 characters)
   - Status (FINISHED, RUNNING, FAILED)
   - Duration
   - Metrics count
   - Params count
   - Start time

### Viewing Run Details

1. Click a run to view its details
2. The detail view shows:
   - **Basic info**: Status, start time, end time, run ID
   - **Parameters table**: All logged parameters
   - **Metrics table**: All logged metrics
   - **Tags table**: All logged tags (collapsed by default)

### Browsing Artifacts

1. In the run detail view, the **Artifacts** section shows logged files
2. Click folders to navigate into subdirectories
3. Click `..` to navigate back to the parent directory
4. File sizes are displayed for files

### Graceful Fallback

If MLflow is not installed or the tracking path does not exist:
- A clear warning message is displayed
- The experiment list is empty
- The UI remains functional for other features

## Phase 2: Qlib Workflow Runner

### What This Phase Adds

Phase 2 introduces a complete workflow execution system for running Qlib experiments directly from the web UI. Users can browse YAML templates, edit configurations, save custom workflows, and execute them via `qrun` with real-time monitoring.

### Adding YAML Templates

Place your Qlib workflow YAML files in the `configs/qlib_templates/` directory:

```bash
configs/qlib_templates/
├── workflow_config_lightgbm_Alpha158.yaml
├── workflow_config_lightgbm_Alpha360.yaml
└── your_custom_workflow.yaml
```

Templates are automatically detected and displayed in the Workflow Runner UI.

### Starting the Backend

```bash
cd backend

# Install dependencies
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings

# Start the server
python run.py
```

The backend runs at `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.

### Starting the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend.

### Running a qrun Workflow

1. Navigate to the **Workflows** page in the sidebar (or use the **Workflows** button on mobile)
2. Select a template from the list to view its YAML content
3. Edit the YAML if needed and save with a custom filename using the **Save Workflow** section
4. After saving, the workflow is automatically selected in the **Saved Workflow** dropdown and can be run directly
5. Set the working directory (defaults to `.`)
6. Click **Run qrun** to start the job
7. Monitor progress in the Jobs table below
8. Click **Logs** to view real-time output

### Job Log Location

Job logs are saved to:

```
storage/logs/jobs/{job_id}.log
```

Each job receives its own log file containing stdout and stderr output from the `qrun` process.

### Job Statuses

| Status | Description |
|--------|-------------|
| `pending` | Job created, waiting to start |
| `running` | qrun process is executing |
| `success` | Job completed with exit code 0 |
| `failed` | Job completed with non-zero exit code or qrun not found |
| `cancelled` | Job terminated by user |

## API Endpoints

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Backend health check |
| GET | `/api/qlib/status` | Full environment status |
| GET | `/api/settings` | Get current settings |
| POST | `/api/settings/qlib-data-path` | Update the Qlib data path |
| POST | `/api/settings/mlflow-tracking-uri` | Update MLflow tracking URI |

### Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflows/templates` | List YAML templates from configs/ |
| GET | `/api/workflows/templates/{name}` | Get template content |
| POST | `/api/workflows/save` | Save workflow to storage/workflows/ |
| GET | `/api/workflows/list` | List saved workflows |
| GET | `/api/workflows/{filename}` | Get saved workflow content |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs/qrun` | Start a new qrun job |
| GET | `/api/jobs` | List all jobs (newest first) |
| GET | `/api/jobs/{id}` | Get job details |
| GET | `/api/jobs/{id}/logs` | Get job logs |
| POST | `/api/jobs/{id}/cancel` | Cancel a running job |

### Experiments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/experiments` | List all MLflow experiments |
| GET | `/api/experiments/{id}` | Get experiment details |
| GET | `/api/experiments/{id}/runs` | List runs under an experiment |
| GET | `/api/runs/{id}` | Get run details (params, metrics, tags) |
| GET | `/api/runs/{id}/params` | Get run parameters only |
| GET | `/api/runs/{id}/metrics` | Get run metrics only |
| GET | `/api/runs/{id}/artifacts` | List run artifacts (supports `?path=` for subdirectories) |

## What This Phase Does NOT Do Yet

- **No backtest charting**: Phase 3 does not plot return curves or performance charts
- **No pred.pkl parsing**: Phase 3 does not read or analyze prediction pickle files
- **No RD-Agent integration**: RD-Agent support is planned for Phase 5

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| **Phase 1** | Foundation & Environment Checker | Done |
| **Phase 2** | qrun Workflow Runner | Done |
| **Phase 3** | Experiment Center | Current |
| **Phase 4** | Backtest Analyzer | Planned |
| **Phase 5** | RD-Agent Integration | Planned |

## License

MIT
