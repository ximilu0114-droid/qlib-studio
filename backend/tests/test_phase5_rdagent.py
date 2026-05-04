import os
import stat
import time
from pathlib import Path

os.environ.setdefault(
    "QLIB_STUDIO_DATABASE_URL",
    "sqlite:////tmp/qlib_studio_phase5_tests.sqlite",
)
Path("/tmp/qlib_studio_phase5_tests.sqlite").unlink(missing_ok=True)

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.rdagent_runner import VALID_SCENARIOS


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def make_fake_rdagent(tmp_path: Path, script: str) -> Path:
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    rdagent = bin_dir / "rdagent"
    rdagent.write_text(script)
    rdagent.chmod(rdagent.stat().st_mode | stat.S_IXUSR)
    return bin_dir


def wait_for_status(client: TestClient, job_id: int, terminal_statuses: set[str]) -> dict:
    for _ in range(50):
        job = client.get(f"/api/rdagent/jobs/{job_id}").json()
        if job["status"] in terminal_statuses:
            return job
        time.sleep(0.1)
    return job


def test_supported_scenarios_are_exact():
    assert VALID_SCENARIOS == {
        "fin_factor",
        "fin_model",
        "fin_quant",
        "fin_factor_report",
    }


def test_invalid_scenario_returns_400(client):
    response = client.post(
        "/api/rdagent/jobs",
        json={"scenario": "bad_scenario", "working_dir": "."},
    )

    assert response.status_code == 400
    assert "Invalid scenario" in response.json()["detail"]


def test_status_uses_saved_rdagent_settings(client, tmp_path):
    working_dir = tmp_path / "rdagent_work"
    output_dir = tmp_path / "rdagent_output"
    working_dir.mkdir()
    output_dir.mkdir()
    env_file = working_dir / "custom.env"
    env_file.write_text("OPENAI_API_KEY=sk-testsecret12345678901234567890\n")

    settings = client.post(
        "/api/settings/rdagent",
        json={
            "rdagent_working_dir": str(working_dir),
            "rdagent_output_dir": str(output_dir),
            "rdagent_env_file": "custom.env",
        },
    )
    assert settings.status_code == 200

    status = client.get("/api/rdagent/status")
    body = status.json()

    assert status.status_code == 200
    assert body["working_dir"] == str(working_dir.resolve())
    assert body["output_dir"] == str(output_dir.resolve())
    assert body["output_dir_exists"] is True
    assert body["env_file_exists"] is True
    assert body["llm_config_detected"] is True
    assert "sk-testsecret" not in str(body)


def test_rdagent_logs_and_command_args_are_redacted(client, monkeypatch, tmp_path):
    secret = "sk-secretvalue123456789012345678901234"
    bin_dir = make_fake_rdagent(
        tmp_path,
        "#!/bin/sh\n"
        "echo args: \"$@\"\n"
        f"echo OPENAI_API_KEY={secret}\n"
        "echo AZURE_API_BASE=https://private.example.test\n"
        "exit 0\n",
    )
    monkeypatch.setenv("PATH", str(bin_dir))

    response = client.post(
        "/api/rdagent/jobs",
        json={
            "scenario": "fin_quant",
            "working_dir": ".",
            "extra_args": ["--api-key", secret, "--token=plain-secret-token"],
            "env_vars": {"OPENAI_API_KEY": secret},
        },
    )

    assert response.status_code == 200
    job = wait_for_status(client, response.json()["job_id"], {"success", "failed"})
    assert job["status"] == "success"

    logs = client.get(f"/api/rdagent/jobs/{job['id']}/logs").json()["logs"]

    assert secret not in logs
    assert "plain-secret-token" not in logs
    assert "https://private.example.test" not in logs
    assert "--api-key [REDACTED]" in logs
    assert "--token=[REDACTED]" in logs
    assert "OPENAI_API_KEY=[REDACTED]" in logs
    assert "AZURE_API_BASE=[REDACTED]" in logs


def test_missing_rdagent_command_fails_gracefully(client, monkeypatch, tmp_path):
    monkeypatch.setenv("PATH", str(tmp_path))

    response = client.post(
        "/api/rdagent/jobs",
        json={"scenario": "fin_factor", "working_dir": "."},
    )

    assert response.status_code == 200
    job_id = response.json()["job_id"]
    job = client.get(f"/api/rdagent/jobs/{job_id}").json()
    logs = client.get(f"/api/rdagent/jobs/{job_id}/logs").json()["logs"]

    assert job["status"] == "failed"
    assert job["exit_code"] == -1
    assert "rdagent' command not found" in logs
