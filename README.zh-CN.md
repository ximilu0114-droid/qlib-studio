# Qlib Studio

[English](README.md) | [简体中文](README.zh-CN.md)

Qlib Studio 是一个面向 [Microsoft Qlib](https://github.com/microsoft/qlib) 的本地 Web 研究工作台。它把量化研究里常见的环境检查、数据路径校验、工作流编辑与运行、任务日志查看、MLflow 实验浏览、回测分析和 RD-Agent 集成整合到一个浏览器界面里。

项目默认在本机运行。你的 Qlib 数据、工作流文件、SQLite 数据库、任务日志和 MLflow artifacts 都保存在本地；除非你主动配置远程 MLflow 服务。

## 亮点

- 本地看板：检查 Qlib、Python、MLflow 和数据集就绪状态。
- 持久化配置：保存 Qlib 数据路径和 MLflow Tracking URI。
- 内置 LightGBM Alpha158、Alpha360 Qlib 工作流模板。
- YAML 工作流编辑器，保存文件到 `storage/workflows/`。
- 在 Web UI 中运行 `qrun`、查看任务状态、查看日志、取消任务。
- MLflow 实验中心：浏览 experiments、runs、params、metrics、tags 和 artifacts。
- 回测分析器：收益曲线、回撤图、风险表、指标预览、多 run 对比。
- RD-Agent 集成：自动化因子进化、模型进化和报告因子提取。
- FastAPI 后端 + React/Vite 类型化前端。

## 界面模块

Qlib Studio 当前包含五个主要页面：

- **Workbench**：检查本地 Qlib 安装、MLflow 安装、数据路径、calendars、instruments 和 features。
- **Workflows**：加载 YAML 模板，保存编辑后的工作流，启动 `qrun`，查看任务日志。
- **Experiments**：读取 MLflow 实验结果，查看 runs 和 artifacts。
- **Backtest Analyzer**：加载 Qlib 回测 artifacts，展示收益曲线、回撤图、风险分析表和多 run 对比。
- **RD-Agent**：管理 RD-Agent 自动化研究任务，包括状态检查、任务生命周期和日志流。

## Phase 4 — 回测分析器

Phase 4 为 Qlib Studio 新增了回测分析页面。通过 `qrun` 运行 Qlib 工作流后，可以在浏览器中直接查看回测 artifacts。

### 功能概览

- 交互式图表：累计收益、基准收益、超额收益、回撤。
- 摘要指标卡片：年化收益、信息比率、最大回撤、含成本 / 不含成本超额收益。
- 风险分析表：按收益类型和指标分组。
- 指标预览表：交易执行数据的列名、行数、日期范围和前几行数据。
- 多 run 对比：选择两个或多个 run，并排比较关键指标。

### 使用的 Qlib artifacts

回测分析器从 MLflow run 的 artifact 目录读取以下 pickle 文件：

| Artifact | 用途 |
| --- | --- |
| `portfolio_analysis/report_normal_1day.pkl` | 每日组合收益、基准收益、成本和换手率，用于构建收益和回撤曲线。 |
| `portfolio_analysis/port_analysis_1day.pkl` | 风险分析指标（年化收益、信息比率、最大回撤），区分含成本和不含成本超额收益。 |
| `indicator_analysis_1day.pkl` | 交易执行指标（成交率、价格优势等），以预览表形式展示。 |

以上三个文件均由标准 Qlib 回测工作流生成。如果某个 artifact 缺失，对应区域会显示警告而非空白。

### 图表

- **累计收益**：策略净值、基准净值和超额净值随时间变化。
- **回撤**：策略从峰值回撤随时间变化。

两个图表均使用 Recharts，能优雅地处理 null 或缺失数据点。

### 表格

- **摘要指标**：年化收益、信息比率、最大回撤及超额收益变体。
- **风险分析**：行为各指标，列为不含成本和含成本超额收益。
- **指标预览**：列名、行数、日期范围以及指标数据的前几行。
- **多 run 对比**：选择两个或多个 run，并排比较关键指标。

### 如何使用

1. 打开 **Workflows** 并通过 `qrun` 运行 Qlib 工作流。
2. 等待任务完成（在 **Workflows** 中查看状态和日志）。
3. 打开 **Experiments** 找到对应的 run，或直接进入 **Backtest Analyzer**。
4. 选择实验和要分析的 run。
5. 点击 **Analyze**。
6. 图表、表格和警告会根据可用的 artifacts 自动加载。

要对比多个 run，勾选两个或多个 run 旁边的复选框，然后点击 **Compare Selected**。

### 限制

- 仅支持本地 MLflow artifacts，本阶段不支持远程 MLflow 服务器。
- 缺失的 artifacts 会显示警告而非报错，应用其他功能不受影响。
- 实盘交易尚未包含。

## Phase 5 — RD-Agent 集成

Phase 5 为 Qlib Studio 新增了 [RD-Agent](https://github.com/microsoft/RD-Agent) 集成。RD-Agent 是微软的研究自动化框架，使用 LLM 迭代生成、评估和优化量化因子与模型。

### 功能概览

- 专用 **RD-Agent** 页面，管理自动化研究任务。
- 状态面板：显示 RD-Agent 安装状态、Docker 可用性和 LLM 配置。
- 一键健康检查：运行 `rdagent health_check`。
- 任务生命周期管理：启动、监控日志、取消 RD-Agent 任务。
- 可配置工作目录、输出目录和环境文件。
- 每个任务的日志流和自动滚动。

### 支持的场景

| 场景 | 说明 |
| --- | --- |
| `fin_factor` | 迭代因子进化 — 自动生成和评估 alpha 因子。 |
| `fin_model` | 迭代模型进化 — 自主训练和评估预测模型。 |
| `fin_quant` | 因子 + 模型联合进化 — 端到端量化管线优化。 |
| `fin_factor_report` | 报告因子提取 — 从研究报告中提取 alpha 因子。 |

### 环境要求

- **推荐 Linux。** RD-Agent 内部使用 Docker 容器。macOS 可用于开发，但生产环境推荐 Linux。
- **Docker** 已安装且守护进程正在运行。用 `docker info` 验证。
- **RD-Agent** 已安装。安装命令：`pip install rdagent`。
- 项目根目录下有 `.env` 文件并配置了 LLM 密钥：
  - `OPENAI_API_KEY` 和 `OPENAI_API_BASE` 用于 OpenAI 兼容端点。
  - `CHAT_MODEL` 和 `EMBEDDING_MODEL` 用于模型选择。
  - 完整列表参见 RD-Agent 的 `.env.example`。

### 如何检查 RD-Agent 状态

1. 打开 **RD-Agent** 页面。
2. 状态面板显示：Python 版本、RD-Agent 安装及版本、Docker 状态、`.env` 文件和 LLM 配置检测、工作目录和输出目录。
3. 所有检查均为非阻塞 — 缺失组件会显示警告。

### 如何运行健康检查

1. 打开 **RD-Agent** 页面。
2. 点击 **Run Health Check**。
3. `rdagent health_check --no-check-env` 的输出会显示在界面中。
4. 密钥会自动脱敏。

### 如何启动 RD-Agent 任务

1. 打开 **RD-Agent** 页面。
2. 选择场景（如 `fin_quant`）。
3. 可选：添加额外参数或环境变量。
4. 点击 **Start Job**。
5. 在同一页面监控任务状态和日志。
6. 随时点击 **Cancel** 取消运行中的任务。

### 日志位置

RD-Agent 任务日志保存在：

```text
storage/logs/rdagent/{job_id}.log
```

每个日志文件包含场景、工作目录、命令和 `rdagent` 进程的完整 stdout/stderr 输出。

### 当前限制

- 尚无自动因子注册。RD-Agent 输出需手动集成到 Qlib 工作流。
- 尚无自动模型注册。生成的模型不会自动添加到 Qlib 模型库。
- 尚无从 RD-Agent 输出自动生成 Qlib 工作流。
- 实盘交易尚未包含。
- 大多数 RD-Agent 场景需要 Docker。纯本地执行尚未完全支持。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 后端 | Python 3.10+, FastAPI, SQLAlchemy, Pydantic |
| 前端 | React 18, TypeScript, Vite, Tailwind CSS |
| 存储 | SQLite, 本地文件系统 |
| 量化工作流 | Microsoft Qlib, `qrun` |
| 实验追踪 | MLflow |
| 研究自动化 | Microsoft RD-Agent, Docker |

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd qlib-studio
```

如果你的本地目录名里有空格也没关系，后续需要时给路径加引号即可。

### 2. 启动后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate

pip install -e ".[mlflow]" pyqlib
python run.py
```

API 地址是 [http://localhost:8000](http://localhost:8000)。接口文档在 [http://localhost:8000/docs](http://localhost:8000/docs)。

### 3. 启动前端

打开第二个终端：

```bash
cd frontend
npm install
npm run dev
```

应用地址是 [http://localhost:5173](http://localhost:5173)。Vite 会把 `/api` 请求代理到 `localhost:8000`。

### 4. 配置 Qlib 数据

默认检查的数据路径是：

```text
~/.qlib/qlib_data/cn_data
```

如果你的 Qlib 数据在其他目录，打开 Workbench 页面修改数据路径。一个可用的数据目录通常需要包含 calendars、instruments 和 features。

### 5. 运行工作流

1. 打开 **Workflows** 页面。
2. 选择内置模板。
3. 按需编辑 YAML。
4. 保存为工作流文件。
5. 点击 **Run qrun**。
6. 在同一页面查看任务状态和日志。

保存后的工作流位于 `storage/workflows/`。任务日志位于 `storage/logs/jobs/{job_id}.log`。

## 配置

Qlib Studio 使用本地默认配置，并把用户在界面中修改的设置保存到 SQLite。

| 配置项 | 默认值 | 修改位置 |
| --- | --- | --- |
| Qlib 数据路径 | `~/.qlib/qlib_data/cn_data` | Workbench 页面 |
| MLflow Tracking URI | `file:./mlruns` | Experiments 页面 |
| RD-Agent 工作目录 | `.`（项目根目录） | RD-Agent 页面 |
| RD-Agent 输出目录 | `storage/rdagent_outputs` | RD-Agent 页面 |
| RD-Agent 环境文件 | `.env` | RD-Agent 页面 |
| 后端地址 | `http://localhost:8000` | `frontend/vite.config.ts` proxy |
| 前端地址 | `http://localhost:5173` | Vite dev server |

后端支持 `QLIB_STUDIO_` 前缀的环境变量，例如：

```bash
QLIB_STUDIO_DEBUG=true python run.py
```

为了降低误操作风险，`qrun` 的工作目录默认限制在项目根目录、`backend/`，或通过 `QLIB_STUDIO_SAFE_WORKING_DIR` 指定的目录中。

```bash
export QLIB_STUDIO_SAFE_WORKING_DIR=/path/to/research/workspace
```

## 项目结构

```text
qlib-studio/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI 路由
│   │   ├── core/         # 应用配置
│   │   ├── db/           # SQLite 模型和会话
│   │   ├── schemas/      # Pydantic 请求/响应模型
│   │   └── services/     # Qlib、workflow、job、MLflow、RD-Agent 服务
│   ├── tests/
│   ├── pyproject.toml
│   └── run.py
├── configs/
│   └── qlib_templates/   # 内置 Qlib workflow YAML 模板
├── frontend/
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # 看板、工作流、实验中心、RD-Agent UI
│   │   └── types/        # 共享 TypeScript API 类型
│   ├── package.json
│   └── vite.config.ts
└── storage/
    ├── qlib_studio.db    # 自动创建的 SQLite 数据库
    ├── workflows/        # 保存的 workflow YAML 文件
    └── logs/
        ├── jobs/         # 每个 qrun 任务的日志
        └── rdagent/      # 每个 RD-Agent 任务的日志
```

## API 概览

| 模块 | 接口 |
| --- | --- |
| Health | `GET /api/health` |
| Qlib 状态 | `GET /api/qlib/status` |
| Settings | `GET /api/settings`, `POST /api/settings/qlib-data-path`, `POST /api/settings/mlflow-tracking-uri`, `POST /api/settings/rdagent` |
| Workflows | `GET /api/workflows/templates`, `GET /api/workflows/templates/{name}`, `POST /api/workflows/save`, `GET /api/workflows/list`, `GET /api/workflows/{filename}`, `PUT /api/workflows/{filename}` |
| Jobs | `POST /api/jobs/qrun`, `GET /api/jobs`, `GET /api/jobs/{id}`, `GET /api/jobs/{id}/logs`, `POST /api/jobs/{id}/cancel` |
| Experiments | `GET /api/experiments`, `GET /api/experiments/{id}`, `GET /api/experiments/{id}/runs`, `GET /api/runs/{id}`, `GET /api/runs/{id}/params`, `GET /api/runs/{id}/metrics`, `GET /api/runs/{id}/artifacts` |
| Backtest | `GET /api/backtest/runs/{id}/summary`, `GET /api/backtest/runs/{id}/curves`, `GET /api/backtest/runs/{id}/risk`, `GET /api/backtest/runs/{id}/indicators`, `POST /api/backtest/compare` |
| RD-Agent | `GET /api/rdagent/status`, `POST /api/rdagent/health-check`, `POST /api/rdagent/jobs`, `GET /api/rdagent/jobs`, `GET /api/rdagent/jobs/{id}`, `GET /api/rdagent/jobs/{id}/logs`, `POST /api/rdagent/jobs/{id}/cancel` |

## 开发

运行后端测试：

```bash
cd backend
pip install -e ".[dev,mlflow]" pyqlib
pytest
```

构建前端：

```bash
cd frontend
npm install
npm run build
```

## 路线图

| 阶段 | 功能 | 状态 |
| --- | --- | --- |
| Phase 1 | 基础能力和环境检查 | Done |
| Phase 2 | Qlib workflow runner | Done |
| Phase 3 | MLflow Experiment Center | Done |
| Phase 4 | 回测分析和图表 | Done |
| Phase 5 | RD-Agent 集成 | Current |
| Phase 6 | RD-Agent 输出解析和因子/模型库 | Planned |
| Phase 7 | 完整 AI 量化研究闭环 | Planned |

## 说明

- Qlib Studio 目前不会自动下载行情数据。请先准备 Qlib 数据，再在界面中配置目录。
- Experiment Center 只读取 MLflow 数据，不会改写 runs 或 artifacts。
- 如果 MLflow 未安装或 tracking path 不存在，应用其他功能仍然可用，Experiments 页面会显示空状态或提示信息。

## License

MIT
