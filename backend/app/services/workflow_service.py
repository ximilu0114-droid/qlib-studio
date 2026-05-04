from pathlib import Path

from app.core.config import WORKFLOWS_DIR


def _validate_filename(filename: str) -> None:
    """Validate filename to prevent path traversal attacks."""
    if not filename:
        raise ValueError("Filename cannot be empty")

    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValueError("Invalid filename: path traversal detected")

    if not filename.endswith((".yaml", ".yml")):
        raise ValueError("Only .yaml and .yml files are allowed")


def list_workflow_templates() -> list[dict]:
    templates = []
    for yaml_file in sorted(WORKFLOWS_DIR.glob("*.yaml")):
        name = yaml_file.stem.replace("_", " ").replace("-", " ").title()
        templates.append({
            "filename": yaml_file.name,
            "name": name,
            "description": f"Workflow template: {name}",
        })

    for yaml_file in sorted(WORKFLOWS_DIR.glob("*.yml")):
        if not any(t["filename"] == yaml_file.name for t in templates):
            name = yaml_file.stem.replace("_", " ").replace("-", " ").title()
            templates.append({
                "filename": yaml_file.name,
                "name": name,
                "description": f"Workflow template: {name}",
            })

    return templates


def get_workflow_content(filename: str) -> str:
    _validate_filename(filename)
    file_path = WORKFLOWS_DIR / filename
    if not file_path.exists():
        raise FileNotFoundError(f"Workflow template not found: {filename}")
    return file_path.read_text()


def save_workflow_content(filename: str, content: str) -> None:
    _validate_filename(filename)
    file_path = WORKFLOWS_DIR / filename
    file_path.write_text(content)


def create_default_templates() -> None:
    if list(WORKFLOWS_DIR.glob("*.yaml")) or list(WORKFLOWS_DIR.glob("*.yml")):
        return

    workflow_yaml = """qlib_init:
  provider_uri: "~/.qlib/qlib_data/cn_data"
  region: cn

market: &market csi300
benchmark: &benchmark SH000300

data_handler_config: &data_handler_config
  start_time: 2008-01-01
  end_time: 2020-12-31
  fit_start_time: 2008-01-01
  fit_end_time: 2019-12-31
  instruments: *market

port_analysis_config: &port_analysis_config
  strategy:
    class: TopkDropoutStrategy
    module_path: qlib.contrib.strategy
    kwargs:
      signal: <PRED>
      topk: 50
      n_drop: 5
  backtest:
    start_time: 2020-07-01
    end_time: 2020-12-31
    account: 100000000
    benchmark: *benchmark
    exchange_kwargs:
      limit_threshold: 0.095
      deal_price: close
      open_cost: 0.0005
      close_cost: 0.0015
      min_cost: 5

task:
  model:
    class: LGBModel
    module_path: qlib.contrib.model.gbdt
    kwargs:
      loss: mse
      colsample_bytree: 0.8879
      learning_rate: 0.0421
      subsample: 0.8789
      lambda_l1: 205.6999
      lambda_l2: 580.9768
      max_depth: 8
      num_leaves: 210
      num_threads: 20
  dataset:
    class: DatasetH
    module_path: qlib.data.dataset
    kwargs:
      handler:
        class: Alpha158
        module_path: qlib.contrib.data.handler
        kwargs: *data_handler_config
      segments:
        train: [2008-01-01, 2019-12-31]
        valid: [2020-01-01, 2020-06-30]
        test: [2020-07-01, 2020-12-31]
  record:
    - class: SignalRecord
      module_path: qlib.workflow.record_temp
      kwargs:
        model: <MODEL>
        dataset: <DATASET>
    - class: SigAnaRecord
      module_path: qlib.workflow.record_temp
      kwargs:
        ana_long_short: False
        ann_scaler: 252
    - class: PortAnaRecord
      module_path: qlib.workflow.record_temp
      kwargs:
        config: *port_analysis_config
"""

    train_yaml = """qlib_init:
  provider_uri: "~/.qlib/qlib_data/cn_data"
  region: cn

data_handler_config:
  start_time: 2008-01-01
  end_time: 2020-12-31
  fit_start_time: 2008-01-01
  fit_end_time: 2019-12-31
  instruments: csi300

task:
  model:
    class: LGBModel
    module_path: qlib.contrib.model.gbdt
    kwargs:
      loss: mse
      colsample_bytree: 0.8879
      learning_rate: 0.0421
      subsample: 0.8789
      lambda_l1: 205.6999
      lambda_l2: 580.9768
      max_depth: 8
      num_leaves: 210
      num_threads: 20
  dataset:
    class: DatasetH
    module_path: qlib.data.dataset
    kwargs:
      handler:
        class: Alpha158
        module_path: qlib.contrib.data.handler
        kwargs:
          start_time: 2008-01-01
          end_time: 2020-12-31
          fit_start_time: 2008-01-01
          fit_end_time: 2019-12-31
          instruments: csi300
      segments:
        train: [2008-01-01, 2019-12-31]
        valid: [2020-01-01, 2020-06-30]
        test: [2020-07-01, 2020-12-31]
  record:
    - class: SignalRecord
      module_path: qlib.workflow.record_temp
      kwargs:
        model: <MODEL>
        dataset: <DATASET>
"""

    backtest_yaml = """qlib_init:
  provider_uri: "~/.qlib/qlib_data/cn_data"
  region: cn

market: &market csi300
benchmark: &benchmark SH000300

data_handler_config: &data_handler_config
  start_time: 2008-01-01
  end_time: 2020-12-31
  fit_start_time: 2008-01-01
  fit_end_time: 2019-12-31
  instruments: *market

port_analysis_config: &port_analysis_config
  strategy:
    class: TopkDropoutStrategy
    module_path: qlib.contrib.strategy
    kwargs:
      signal: <PRED>
      topk: 50
      n_drop: 5
  backtest:
    start_time: 2020-07-01
    end_time: 2020-12-31
    account: 100000000
    benchmark: *benchmark
    exchange_kwargs:
      limit_threshold: 0.095
      deal_price: close
      open_cost: 0.0005
      close_cost: 0.0015
      min_cost: 5

task:
  model:
    class: LGBModel
    module_path: qlib.contrib.model.gbdt
    kwargs:
      loss: mse
      colsample_bytree: 0.8879
      learning_rate: 0.0421
      subsample: 0.8789
      lambda_l1: 205.6999
      lambda_l2: 580.9768
      max_depth: 8
      num_leaves: 210
      num_threads: 20
  dataset:
    class: DatasetH
    module_path: qlib.data.dataset
    kwargs:
      handler:
        class: Alpha158
        module_path: qlib.contrib.data.handler
        kwargs: *data_handler_config
      segments:
        train: [2008-01-01, 2019-12-31]
        valid: [2020-01-01, 2020-06-30]
        test: [2020-07-01, 2020-12-31]
  record:
    - class: SignalRecord
      module_path: qlib.workflow.record_temp
      kwargs:
        model: <MODEL>
        dataset: <DATASET>
    - class: SigAnaRecord
      module_path: qlib.workflow.record_temp
      kwargs:
        ana_long_short: False
        ann_scaler: 252
    - class: PortAnaRecord
      module_path: qlib.workflow.record_temp
      kwargs:
        config: *port_analysis_config
"""

    (WORKFLOWS_DIR / "workflow.yaml").write_text(workflow_yaml)
    (WORKFLOWS_DIR / "workflow_train.yaml").write_text(train_yaml)
    (WORKFLOWS_DIR / "workflow_backtest.yaml").write_text(backtest_yaml)
