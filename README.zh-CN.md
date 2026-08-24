# Qlib Studio

[![CI](https://github.com/ximilu0114-droid/qlib-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/ximilu0114-droid/qlib-studio/actions/workflows/ci.yml)

[English](README.md) | [简体中文](README.zh-CN.md)

Qlib Studio 是一个面向 [Microsoft Qlib](https://github.com/microsoft/qlib) 的本地全栈量化研究工作台。它把环境检查、YAML 编辑、`qrun` 执行、MLflow 实验查看和回测分析整合进一个浏览器应用，并为 [RD-Agent](https://github.com/microsoft/RD-Agent) 提供带安全约束的启动器与健康看板。

> 本项目仅用于研究，不构成投资建议，不连接券商，也不包含实盘交易能力。

## 核心能力

- 检查 Python、Qlib、MLflow 与数据集完整性。
- 内置 LightGBM Alpha158 和 Alpha360 工作流模板。
- 安全保存工作流，异步执行 `qrun`，实时查看日志并取消任务。
- 浏览 MLflow experiments、runs、metrics、params、tags 与 artifacts。
- 展示回测收益/回撤曲线、风险指标、交易指标预览与多 run 对比。
- 检查 RD-Agent 依赖、脱敏健康检查输出并管理任务生命周期。
- 中英文界面，适配桌面端和移动端。
- FastAPI/OpenAPI 后端与类型化 React 前端。

设置、工作流、日志和 SQLite 数据库默认都保留在本机 `storage/`；MLflow 默认使用本机 `mlruns/`。实验中心可以连接远程 MLflow Tracking Server，但回测 artifact 分析目前仅支持本地文件。

## 架构

```text
React + TypeScript + Vite (5173)
             │ /api 代理
             ▼
FastAPI + SQLAlchemy (8000)
   ├── qrun 子进程/任务管理器 ──► Qlib 数据
   ├── MLflow Client ───────────► 本地 mlruns 或远程服务
   ├── artifact 分析器 ─────────► 本地 Qlib pickle artifacts
   └── RD-Agent 启动器 ─────────► Docker + LLM 配置
```

## 环境要求

- Conda（推荐）或 Python 3.10+
- Node.js 22.12+ 和 npm
- 已准备好的 Qlib 数据；默认路径为 `~/.qlib/qlib_data/cn_data`
- 仅使用 RD-Agent 时需要：运行中的 Docker daemon 和 LLM 配置

仓库固定了已联合验证的核心集成版本：pyqlib 0.9.7、MLflow 3.11.1、RD-Agent 0.8.0。完整约束见 `backend/pyproject.toml`。

## 使用 Conda 快速启动

```bash
git clone https://github.com/ximilu0114-droid/qlib-studio.git
cd qlib-studio
conda env create -f environment.yml
conda activate qlib-studio
```

启动 API：

```bash
python backend/run.py
```

在第二个终端启动前端：

```bash
conda activate qlib-studio
cd frontend
npm ci
npm run dev
```

打开 <http://localhost:5173>；API 文档位于 <http://localhost:8000/docs>。

### 安装到现有 Conda 环境

```bash
conda activate qlib-studio
python -m pip install -e "./backend[dev,mlflow,qlib,rdagent]"
cd frontend && npm ci
```

RD-Agent 的可选依赖较大；不使用时可改为 `"./backend[dev,mlflow,qlib]"`。

## 配置并运行 Qlib

1. 打开 **Workbench**，确认 Qlib 数据集检查均通过；必要时修改数据路径。
2. 打开 **Workflows**，选择 Alpha158 或 Alpha360，检查 YAML 后保存。
3. 启动 `qrun`，查看任务状态和实时日志。
4. 在 **Experiments** 中检查生成的 run。
5. 在 **Backtest Analyzer** 中选择该 run，查看曲线、风险指标与交易指标。

保存的工作流位于 `storage/workflows/`；qrun 日志位于 `storage/logs/jobs/{job_id}.log`。

回测分析器读取 Qlib 的标准 artifacts：

| Artifact | 用途 |
| --- | --- |
| `portfolio_analysis/report_normal_1day.pkl` | 收益、基准、成本、换手率与回撤 |
| `portfolio_analysis/port_analysis_1day.pkl` | 年化收益、信息比率与最大回撤 |
| `portfolio_analysis/indicator_analysis_1day.pkl` | 交易执行指标预览 |

artifact 缺失时只对相关区域给出警告，不会使整个分析失败。pickle 文件在加载时可能执行代码，因此只能分析来自可信 Qlib/MLflow run 的 artifacts。

## 可选：配置 RD-Agent

1. 启动 Docker，并用 `docker info` 验证 daemon 可访问。
2. 将 `.env.example` 复制为 `.env`，填写服务商、对话模型、向量模型和密钥；不要提交 `.env`。
3. 打开 **RD-Agent**，确认就绪检查全部通过，再运行健康检查。
4. 选择 `fin_factor`、`fin_model`、`fin_quant` 或 `fin_factor_report` 并启动任务。

RD-Agent 日志写入 `storage/logs/rdagent/{job_id}.log`；相对路径统一以仓库根目录解析。多数 RD-Agent 场景依赖 Docker，并可能消耗较多 LLM 配额与计算资源。

## 配置项

| 配置 | 默认值 | 修改位置 |
| --- | --- | --- |
| Qlib 数据 | `~/.qlib/qlib_data/cn_data` | Workbench |
| MLflow Tracking URI | `file:<仓库>/mlruns` | Experiments |
| RD-Agent 工作目录 | 仓库根目录 | RD-Agent |
| RD-Agent 输出目录 | `<仓库>/storage/rdagent_outputs` | RD-Agent |
| RD-Agent 环境文件 | `.env` | RD-Agent |
| 应用数据目录 | `<仓库>/storage` | `QLIB_STUDIO_STORAGE_DIR` 覆盖 |
| 额外允许的 qrun 目录 | 未设置 | `QLIB_STUDIO_SAFE_WORKING_DIR` |

后端配置均支持 `QLIB_STUDIO_` 环境变量前缀，例如 `QLIB_STUDIO_DEBUG=true`。

## 开发与验证

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

测试套件会将数据库、工作流和日志隔离到临时目录，不会污染开发者真实的 `storage/`。GitHub Actions 会执行相同的格式检查、静态检查、测试、类型检查、安全审计和生产构建。

## 项目结构

```text
qlib-studio/
├── backend/
│   ├── app/{api,core,db,schemas,services}/
│   ├── tests/
│   └── pyproject.toml
├── configs/qlib_templates/
├── frontend/src/{api,components,i18n,types}/
├── storage/                  # 自动生成且被 git 忽略
├── mlruns/                   # 自动生成且被 git 忽略
├── environment.yml
└── .github/workflows/ci.yml
```

## API 分组

`/docs` 生成的 OpenAPI 页面是接口的最终准确信息源。

| 分组 | 代表接口 |
| --- | --- |
| 健康与设置 | `GET /api/health`、`GET /api/qlib/status`、`GET /api/settings` |
| 工作流与任务 | `GET /api/workflows/templates`、`POST /api/workflows/save`、`POST /api/jobs/qrun` |
| MLflow | `GET /api/mlflow/status`、`GET /api/experiments`、`GET /api/runs/{id}` |
| 回测 | `GET /api/backtest/runs/{id}/summary`、`POST /api/backtest/compare` |
| RD-Agent | `GET /api/rdagent/status`、`POST /api/rdagent/health-check`、`POST /api/rdagent/jobs` |

## 当前边界

- Qlib 数据集需要单独准备。
- 回测分析支持本地 MLflow artifacts，尚未实现远程 artifact 下载。
- RD-Agent 输出尚未自动注册为 Qlib 因子或模型。
- 当前没有身份认证或多用户隔离；除非自行增加访问控制，否则后端应只监听 localhost。
- 实盘交易明确不在当前范围内。

## License

[MIT](LICENSE)
