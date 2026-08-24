# Qlib Studio

[![CI](https://github.com/ximilu0114-droid/qlib-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/ximilu0114-droid/qlib-studio/actions/workflows/ci.yml)

[English](README.md) | [简体中文](README.zh-CN.md)

Qlib Studio is a local, full-stack research workbench for
[Microsoft Qlib](https://github.com/microsoft/qlib). It turns the repetitive parts of a
quantitative-research workflow—environment checks, YAML editing, `qrun` execution, MLflow
inspection, and backtest review—into one browser application. It also provides a guarded
launcher and health dashboard for [RD-Agent](https://github.com/microsoft/RD-Agent).

> Research software only. This project does not provide investment advice, brokerage
> connectivity, or live trading.

## Features

- Qlib/Python/MLflow and dataset readiness checks.
- Built-in LightGBM Alpha158 and Alpha360 workflow templates.
- Safe workflow persistence, asynchronous `qrun` jobs, live logs, and cancellation.
- MLflow experiment, run, metric, parameter, tag, and artifact browsing.
- Backtest return/drawdown charts, risk tables, indicator preview, and run comparison.
- RD-Agent dependency checks, secret-redacted health output, and job lifecycle management.
- English and Simplified Chinese UI; responsive desktop/mobile layout.
- FastAPI/OpenAPI backend and a typed React frontend.

All settings, workflows, logs, and the SQLite database remain under `storage/`; MLflow uses
the local `mlruns/` directory by default. A remote MLflow tracking server can be configured
for experiment browsing. Backtest artifact analysis currently requires local artifacts.

## Architecture

```text
React + TypeScript + Vite (5173)
             │ /api proxy
             ▼
FastAPI + SQLAlchemy (8000)
   ├── qrun subprocess/job manager ──► Qlib data
   ├── MLflow client ─────────────────► mlruns or remote tracking server
   ├── artifact analyzer ─────────────► local Qlib pickle artifacts
   └── RD-Agent launcher ─────────────► Docker + configured LLM
```

## Prerequisites

- Conda (recommended) or Python 3.10+
- Node.js 22.12+ and npm
- A prepared Qlib dataset; the default is `~/.qlib/qlib_data/cn_data`
- Docker with a running daemon and an LLM configuration only if using RD-Agent

The repository pins the integrations that were verified together: pyqlib 0.9.7, MLflow
3.11.1, and RD-Agent 0.8.0. See `backend/pyproject.toml` for the complete constraints.

## Quick start with Conda

```bash
git clone https://github.com/ximilu0114-droid/qlib-studio.git
cd qlib-studio
conda env create -f environment.yml
conda activate qlib-studio
```

Start the API:

```bash
python backend/run.py
```

In a second terminal, start the frontend:

```bash
conda activate qlib-studio
cd frontend
npm ci
npm run dev
```

Open <http://localhost:5173>. API documentation is available at
<http://localhost:8000/docs>.

### Install into an existing environment

```bash
conda activate qlib-studio
python -m pip install -e "./backend[dev,mlflow,qlib,rdagent]"
cd frontend && npm ci
```

RD-Agent brings a large optional dependency set. If it is not needed, use
`"./backend[dev,mlflow,qlib]"` instead.

## Configure and run Qlib

1. Open **Workbench** and confirm the Qlib dataset checks are green. Update the path if
   your dataset is elsewhere.
2. Open **Workflows**, choose Alpha158 or Alpha360, review the YAML, and save it.
3. Start `qrun` and follow its job status and logs.
4. Inspect the generated run in **Experiments**.
5. Select it in **Backtest Analyzer** to view curves, risk metrics, and indicators.

Saved workflows are written to `storage/workflows/`; qrun logs are written to
`storage/logs/jobs/{job_id}.log`.

The analyzer uses these standard Qlib artifacts:

| Artifact | Used for |
| --- | --- |
| `portfolio_analysis/report_normal_1day.pkl` | returns, benchmark, cost, turnover, drawdown |
| `portfolio_analysis/port_analysis_1day.pkl` | annualized return, information ratio, max drawdown |
| `portfolio_analysis/indicator_analysis_1day.pkl` | execution-indicator preview |

Missing artifacts produce scoped warnings; they do not break the rest of the analysis.
Because pickle files can execute code while loading, only analyze artifacts from trusted
Qlib/MLflow runs.

## Optional RD-Agent setup

1. Start Docker and verify it with `docker info`.
2. Copy `.env.example` to `.env` and fill in your provider, chat model, embedding model,
   and credentials. Never commit `.env`.
3. Open **RD-Agent**, confirm all readiness checks pass, then run its health check.
4. Select `fin_factor`, `fin_model`, `fin_quant`, or `fin_factor_report` and start a job.

RD-Agent logs are written to `storage/logs/rdagent/{job_id}.log`; configured relative paths
are resolved from the repository root. Most RD-Agent scenarios use Docker and can consume
substantial LLM quota and compute.

## Configuration

| Setting | Default | Location |
| --- | --- | --- |
| Qlib data | `~/.qlib/qlib_data/cn_data` | Workbench |
| MLflow tracking URI | `file:<repo>/mlruns` | Experiments |
| RD-Agent working directory | repository root | RD-Agent |
| RD-Agent output directory | `<repo>/storage/rdagent_outputs` | RD-Agent |
| RD-Agent environment file | `.env` | RD-Agent |
| Application data | `<repo>/storage` | `QLIB_STUDIO_STORAGE_DIR` override |
| Extra permitted qrun directory | unset | `QLIB_STUDIO_SAFE_WORKING_DIR` |

All backend settings also accept the `QLIB_STUDIO_` environment prefix, for example
`QLIB_STUDIO_DEBUG=true`.

## Development and verification

```bash
conda activate qlib-studio

cd backend
python -m ruff format --check app tests
python -m ruff check app tests
python -m pytest -q
python -m pip check

cd ../frontend
npm ci
npm audit
npm run build
```

The test suite isolates its database, workflows, and logs in a temporary directory, so it
does not modify a developer's real `storage/`. GitHub Actions runs the same lint, test,
type-check, audit, and production-build gates.

## Project layout

```text
qlib-studio/
├── backend/
│   ├── app/{api,core,db,schemas,services}/
│   ├── tests/
│   └── pyproject.toml
├── configs/qlib_templates/
├── frontend/src/{api,components,i18n,types}/
├── storage/                  # generated and git-ignored
├── mlruns/                   # generated and git-ignored
├── environment.yml
└── .github/workflows/ci.yml
```

## API groups

The generated OpenAPI page at `/docs` is the source of truth.

| Group | Representative endpoints |
| --- | --- |
| Health and settings | `GET /api/health`, `GET /api/qlib/status`, `GET /api/settings` |
| Workflows and jobs | `GET /api/workflows/templates`, `POST /api/workflows/save`, `POST /api/jobs/qrun` |
| MLflow | `GET /api/mlflow/status`, `GET /api/experiments`, `GET /api/runs/{id}` |
| Backtest | `GET /api/backtest/runs/{id}/summary`, `POST /api/backtest/compare` |
| RD-Agent | `GET /api/rdagent/status`, `POST /api/rdagent/health-check`, `POST /api/rdagent/jobs` |

## Current scope

- Qlib datasets must be prepared separately.
- Backtest analysis supports local MLflow artifacts; remote artifact download is not yet
  implemented.
- RD-Agent outputs are not yet automatically registered as Qlib factors or models.
- There is no authentication or multi-user isolation; bind the backend to localhost unless
  you add an appropriate access-control layer.
- Live trading is intentionally out of scope.

## License

[MIT](LICENSE)
