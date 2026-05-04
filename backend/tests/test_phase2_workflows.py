import os
import stat
import time
from pathlib import Path

os.environ.setdefault(
    "QLIB_STUDIO_DATABASE_URL",
    "sqlite:////tmp/qlib_studio_phase2_tests.sqlite",
)
Path("/tmp/qlib_studio_phase2_tests.sqlite").unlink(missing_ok=True)

import pytest
from fastapi.testclient import TestClient

from app.core.config import PROJECT_ROOT, WORKFLOWS_DIR
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def workflow_name():
    name = "phase2_test_workflow.yaml"
    path = WORKFLOWS_DIR / name
    path.write_text("phase2: test\n")
    yield name
    path.unlink(missing_ok=True)


def make_fake_qrun(tmp_path: Path, script: str) -> Path:
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    qrun = bin_dir / "qrun"
    qrun.write_text(script)
    qrun.chmod(qrun.stat().st_mode | stat.S_IXUSR)
    return bin_dir


def wait_for_status(client: TestClient, job_id: int, terminal_statuses: set[str]) -> dict:
    for _ in range(40):
        job = client.get(f"/api/jobs/{job_id}").json()
        if job["status"] in terminal_statuses:
            return job
        time.sleep(0.1)
    return job


def test_path_traversal_blocked_for_save_open_and_run(client, workflow_name):
    save = client.post(
        "/api/workflows/save",
        json={"name": "../escape.yaml", "content": "bad: true\n"},
    )
    assert save.status_code == 400

    open_workflow = client.get("/api/workflows/%2E%2E%2Fqlib_studio.db")
    assert open_workflow.status_code == 400

    run_traversal = client.post(
        "/api/jobs/qrun",
        json={"workflow_name": "../workflow.yaml", "working_dir": "."},
    )
    assert run_traversal.status_code == 400

    run_outside = client.post(
        "/api/jobs/qrun",
        json={"workflow_name": "/tmp/outside.yaml", "working_dir": "."},
    )
    assert run_outside.status_code == 400

    bad_working_dir = client.post(
        "/api/jobs/qrun",
        json={"workflow_name": workflow_name, "working_dir": "../../"},
    )
    assert bad_working_dir.status_code == 400


def test_missing_qrun_fails_gracefully(client, workflow_name, monkeypatch, tmp_path):
    monkeypatch.setenv("PATH", str(tmp_path))

    response = client.post(
        "/api/jobs/qrun",
        json={"workflow_name": workflow_name, "working_dir": "."},
    )

    assert response.status_code == 200
    job_id = response.json()["job_id"]
    job = client.get(f"/api/jobs/{job_id}").json()
    logs = client.get(f"/api/jobs/{job_id}/logs").json()["logs"]
    assert job["status"] == "failed"
    assert job["exit_code"] == -1
    assert "qrun' command not found" in logs


def test_mlflow_tracking_uri_is_normalized_and_reported(client, tmp_path):
    cases = [
        ("file:./mlruns", PROJECT_ROOT / "mlruns"),
        ("./mlruns", PROJECT_ROOT / "mlruns"),
        (str(tmp_path / "absolute_mlruns"), (tmp_path / "absolute_mlruns").resolve()),
    ]

    for raw_uri, expected_path in cases:
        response = client.post(
            "/api/settings/mlflow-tracking-uri",
            json={"mlflow_tracking_uri": raw_uri},
        )
        assert response.status_code == 200
        assert response.json()["mlflow_tracking_uri"] == f"file:{expected_path}"

        settings = client.get("/api/settings").json()
        assert settings["mlflow_tracking_uri"] == f"file:{expected_path}"

        status = client.get("/api/mlflow/status")
        assert status.status_code == 200
        body = status.json()
        assert body["mlflow_tracking_uri"] == f"file:{expected_path}"
        assert body["resolved_mlruns_path"] == str(expected_path)
        assert set(body).issuperset(
            {
                "mlflow_tracking_uri",
                "resolved_mlruns_path",
                "path_exists",
                "experiment_count",
                "run_count",
                "warnings",
            }
        )


def test_mlflow_status_warns_when_experiments_exist_but_no_runs(client):
    from unittest.mock import patch

    with patch("app.api.experiments.experiment_service.list_experiments") as mocked:
        mocked.return_value = {
            "experiments": [
                {
                    "experiment_id": "0",
                    "name": "Default",
                    "artifact_location": "",
                    "lifecycle_stage": "active",
                    "run_count": 0,
                },
                {
                    "experiment_id": "1",
                    "name": "workflow",
                    "artifact_location": "",
                    "lifecycle_stage": "active",
                    "run_count": 0,
                },
            ],
            "warnings": [],
        }

        response = client.get("/api/mlflow/status")

    assert response.status_code == 200
    body = response.json()
    assert body["experiment_count"] == 2
    assert body["run_count"] == 0
    assert any("0 runs" in warning for warning in body["warnings"])


def test_qrun_receives_normalized_mlflow_tracking_uri(client, workflow_name, monkeypatch, tmp_path):
    mlruns_path = tmp_path / "shared_mlruns"
    settings = client.post(
        "/api/settings/mlflow-tracking-uri",
        json={"mlflow_tracking_uri": str(mlruns_path)},
    ).json()
    normalized_uri = settings["mlflow_tracking_uri"]

    bin_dir = make_fake_qrun(
        tmp_path,
        "#!/bin/sh\n"
        "echo child-cwd=$(pwd)\n"
        "echo child-mlflow=$MLFLOW_TRACKING_URI\n"
        "exit 0\n",
    )
    monkeypatch.setenv("PATH", str(bin_dir))

    response = client.post(
        "/api/jobs/qrun",
        json={"workflow_name": workflow_name, "working_dir": "."},
    )
    assert response.status_code == 200

    job = wait_for_status(client, response.json()["job_id"], {"success", "failed"})
    logs = client.get(f"/api/jobs/{job['id']}/logs").json()["logs"]

    assert job["status"] == "success"
    assert f"[Qlib Studio] effective working_dir: {PROJECT_ROOT}" in logs
    assert f"[Qlib Studio] effective MLFLOW_TRACKING_URI: {normalized_uri}" in logs
    assert f"child-mlflow={normalized_uri}" in logs


def test_qrun_success_failure_and_logs(client, workflow_name, monkeypatch, tmp_path):
    bin_dir = make_fake_qrun(
        tmp_path,
        "#!/bin/sh\necho success-out\necho success-err >&2\nexit 0\n",
    )
    monkeypatch.setenv("PATH", str(bin_dir))

    success = client.post(
        "/api/jobs/qrun",
        json={"workflow_name": workflow_name, "working_dir": "."},
    )
    assert success.status_code == 200
    success_job = wait_for_status(client, success.json()["job_id"], {"success", "failed"})
    success_logs = client.get(f"/api/jobs/{success_job['id']}/logs").json()["logs"]
    assert success_job["status"] == "success"
    assert success_job["exit_code"] == 0
    assert "success-out" in success_logs
    assert "success-err" in success_logs

    (bin_dir / "qrun").write_text(
        "#!/bin/sh\necho fail-out\necho fail-err >&2\nexit 7\n"
    )
    failed = client.post(
        "/api/jobs/qrun",
        json={"workflow_name": workflow_name, "working_dir": "."},
    )
    assert failed.status_code == 200
    failed_job = wait_for_status(client, failed.json()["job_id"], {"success", "failed"})
    failed_logs = client.get(f"/api/jobs/{failed_job['id']}/logs").json()["logs"]
    assert failed_job["status"] == "failed"
    assert failed_job["exit_code"] == 7
    assert "fail-out" in failed_logs
    assert "fail-err" in failed_logs


def test_qrun_cancel_terminates_process_group(client, workflow_name, monkeypatch, tmp_path):
    bin_dir = make_fake_qrun(
        tmp_path,
        "#!/bin/sh\necho start\n/bin/sleep 20 &\nwait\n",
    )
    monkeypatch.setenv("PATH", f"{bin_dir}:/bin:/usr/bin")

    response = client.post(
        "/api/jobs/qrun",
        json={"workflow_name": workflow_name, "working_dir": "."},
    )
    assert response.status_code == 200
    job_id = response.json()["job_id"]

    running = wait_for_status(client, job_id, {"running"})
    assert running["status"] == "running"

    cancel = client.post(f"/api/jobs/{job_id}/cancel")
    assert cancel.status_code == 200
    cancelled = client.get(f"/api/jobs/{job_id}").json()
    logs = client.get(f"/api/jobs/{job_id}/logs").json()["logs"]
    assert cancelled["status"] == "cancelled"
    assert cancelled["exit_code"] == -15
    assert "process group terminated" in logs
