from typing import Optional

from pydantic import BaseModel


class RDagentStatusResponse(BaseModel):
    python_version: str
    rdagent_installed: bool
    rdagent_version: Optional[str] = None
    docker_installed: bool
    docker_version: Optional[str] = None
    docker_available: bool
    env_file_exists: bool
    llm_config_detected: bool
    working_dir: str
    output_dir: str
    output_dir_exists: bool
    ready: bool
    warnings: list[str]


class RDagentStartRequest(BaseModel):
    scenario: str
    working_dir: str = "."
    extra_args: list[str] = []
    env_vars: dict[str, str] = {}


class RDagentStartResponse(BaseModel):
    job_id: int
    status: str


class RDagentHealthCheckResponse(BaseModel):
    success: bool
    return_code: int
    stdout: str
    stderr: str
    warnings: list[str]
