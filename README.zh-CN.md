# Qlib Studio

[English](README.md) | [简体中文](README.zh-CN.md)

Qlib Studio 是一个面向 [Microsoft Qlib](https://github.com/microsoft/qlib) 的本地 Web 研究工作台。它把量化研究里常见的环境检查、数据路径校验、工作流编辑与运行、任务日志查看、MLflow 实验浏览整合到一个浏览器界面里。

项目默认在本机运行。你的 Qlib 数据、工作流文件、SQLite 数据库、任务日志和 MLflow artifacts 都保存在本地；除非你主动配置远程 MLflow 服务。

## 亮点

- 本地看板：检查 Qlib、Python、MLflow 和数据集就绪状态。
- 持久化配置：保存 Qlib 数据路径和 MLflow Tracking URI。
- 内置 LightGBM Alpha158、Alpha360 Qlib 工作流模板。
- YAML 工作流编辑器，保存文件到 `storage/workflows/`。
- 在 Web UI 中运行 `qrun`、查看任务状态、查看日志、取消任务。
- MLflow 实验中心：浏览 experiments、runs、params、metrics、tags 和 artifacts。
- FastAPI 后端 + React/Vite 类型化前端。

## 界面模块

Qlib Studio 当前包含三个主要页面：

- **Workbench**：检查本地 Qlib 安装、MLflow 安装、数据路径、calendars、instruments 和 features。
- **Workflows**：加载 YAML 模板，保存编辑后的工作流，启动 `qrun`，查看任务日志。
- **Experiments**：读取 MLflow 实验结果，查看 runs 和 artifacts。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 后端 | Python 3.10+, FastAPI, SQLAlchemy, Pydantic |
| 前端 | React 18, TypeScript, Vite, Tailwind CSS |
| 存储 | SQLite, 本地文件系统 |
| 量化工作流 | Microsoft Qlib, `qrun` |
| 实验追踪 | MLflow |

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
│   │   └── services/     # Qlib、workflow、job、MLflow 服务
│   ├── tests/
│   ├── pyproject.toml
│   └── run.py
├── configs/
│   └── qlib_templates/   # 内置 Qlib workflow YAML 模板
├── frontend/
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # 看板、工作流、实验中心 UI
│   │   └── types/        # 共享 TypeScript API 类型
│   ├── package.json
│   └── vite.config.ts
└── storage/
    ├── qlib_studio.db    # 自动创建的 SQLite 数据库
    ├── workflows/        # 保存的 workflow YAML 文件
    └── logs/jobs/        # 每个 qrun 任务的日志
```

## API 概览

| 模块 | 接口 |
| --- | --- |
| Health | `GET /api/health` |
| Qlib 状态 | `GET /api/qlib/status` |
| Settings | `GET /api/settings`, `POST /api/settings/qlib-data-path`, `POST /api/settings/mlflow-tracking-uri` |
| Workflows | `GET /api/workflows/templates`, `GET /api/workflows/templates/{name}`, `POST /api/workflows/save`, `GET /api/workflows/list`, `GET /api/workflows/{filename}`, `PUT /api/workflows/{filename}` |
| Jobs | `POST /api/jobs/qrun`, `GET /api/jobs`, `GET /api/jobs/{id}`, `GET /api/jobs/{id}/logs`, `POST /api/jobs/{id}/cancel` |
| Experiments | `GET /api/experiments`, `GET /api/experiments/{id}`, `GET /api/experiments/{id}/runs`, `GET /api/runs/{id}`, `GET /api/runs/{id}/params`, `GET /api/runs/{id}/metrics`, `GET /api/runs/{id}/artifacts` |

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
| Phase 3 | MLflow Experiment Center | Current |
| Phase 4 | 回测分析和图表 | Planned |
| Phase 5 | RD-Agent 集成 | Planned |

## 说明

- Qlib Studio 目前不会自动下载行情数据。请先准备 Qlib 数据，再在界面中配置目录。
- Experiment Center 只读取 MLflow 数据，不会改写 runs 或 artifacts。
- 如果 MLflow 未安装或 tracking path 不存在，应用其他功能仍然可用，Experiments 页面会显示空状态或提示信息。

## License

MIT
