import os
import shutil
import subprocess
import sys
from pathlib import Path

from app.core.config import RDAGENT_OUTPUT_DIR, RDAGENT_WORKING_DIR
from app.services.secret_sanitizer import sanitize_text

_ENV_KEYS_TO_CHECK = [
    "OPENAI_API_KEY",
    "OPENAI_API_BASE",
    "CHAT_MODEL",
    "EMBEDDING_MODEL",
    "AZURE_API_KEY",
    "AZURE_API_BASE",
    "DEEPSEEK_API_KEY",
    "LITELLM_PROXY_API_KEY",
    "LITELLM_PROXY_API_BASE",
]


def _get_python_version() -> str:
    return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"


def _check_rdagent_installed() -> tuple[bool, str | None]:
    """Check if the rdagent CLI exists on PATH and get its version."""
    if not shutil.which("rdagent"):
        return False, None

    try:
        result = subprocess.run(
            ["rdagent", "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        version = result.stdout.strip() or result.stderr.strip()
        return True, version or "installed (version unknown)"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return True, "installed (version check failed)"


def _check_docker_installed() -> tuple[bool, str | None]:
    """Check if the docker CLI exists on PATH."""
    if not shutil.which("docker"):
        return False, None

    try:
        result = subprocess.run(
            ["docker", "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return True, result.stdout.strip()
        return False, None
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False, None


def _check_docker_daemon() -> bool:
    """Check if the Docker daemon is reachable (docker info)."""
    if not shutil.which("docker"):
        return False

    try:
        result = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def _resolve_path(path: str | Path, base: Path) -> Path:
    raw = Path(path).expanduser()
    if raw.is_absolute():
        return raw.resolve()
    return (base / raw).resolve()


def _check_env_file(env_path: Path) -> tuple[bool, bool]:
    """Check whether .env exists and whether it contains LLM config keys.

    Returns (env_file_exists, llm_config_detected).
    Never exposes actual secret values.
    """
    if not env_path.is_file():
        return False, False

    try:
        content = env_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return True, False

    found_keys: set[str] = set()
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key = stripped.split("=", 1)[0].strip().strip('"').strip("'")
        found_keys.add(key)

    has_key = any(k in found_keys for k in _ENV_KEYS_TO_CHECK)
    return True, has_key


def _check_output_dir(output_dir: Path) -> bool:
    """Check whether the default RD-Agent output directory exists."""
    return output_dir.is_dir()


def check_rdagent_status(
    working_dir: str | None = None,
    output_dir: str | None = None,
    env_file: str | None = None,
) -> dict:
    """Run all RD-Agent environment checks and return a status dict.

    Never raises — all failures are captured as warnings.
    Never exposes secret values.
    """
    warnings: list[str] = []

    # 1. Python version
    python_version = _get_python_version()

    # 2 & 3. rdagent installed + version
    rdagent_installed, rdagent_version = _check_rdagent_installed()
    if not rdagent_installed:
        warnings.append("RD-Agent is not installed. Install with: pip install rdagent")

    # 4. Docker CLI present
    docker_installed, docker_version_str = _check_docker_installed()
    if not docker_installed:
        warnings.append("Docker CLI not found. Please install Docker.")

    # 5. Docker daemon reachable
    docker_available = False
    if docker_installed:
        docker_available = _check_docker_daemon()
        if not docker_available:
            warnings.append(
                "Docker is installed but the daemon is not running. "
                "Please start Docker Desktop or the Docker service."
            )

    # 6 & 7. .env file and LLM config
    project_root = RDAGENT_WORKING_DIR.resolve()
    resolved_working_dir = _resolve_path(working_dir or RDAGENT_WORKING_DIR, project_root)
    env_name = env_file or ".env"
    env_path = _resolve_path(env_name, resolved_working_dir)

    env_file_exists, llm_config_detected = _check_env_file(env_path)
    if not env_file_exists:
        warnings.append(
            f"No {env_name} file found in {resolved_working_dir}. "
            "Create one from RD-Agent's .env.example to configure LLM access."
        )
    elif not llm_config_detected:
        warnings.append(
            ".env file exists but no recognised LLM config keys were found. "
            "Ensure at least OPENAI_API_KEY or CHAT_MODEL is set."
        )

    # 8. Output directory
    resolved_output_dir = _resolve_path(output_dir or RDAGENT_OUTPUT_DIR, project_root)
    output_dir_exists = _check_output_dir(resolved_output_dir)

    # ready = rdagent installed AND Docker daemon reachable
    ready = rdagent_installed and docker_available

    return {
        "python_version": python_version,
        "rdagent_installed": rdagent_installed,
        "rdagent_version": rdagent_version,
        "docker_installed": docker_installed,
        "docker_version": docker_version_str,
        "docker_available": docker_available,
        "env_file_exists": env_file_exists,
        "llm_config_detected": llm_config_detected,
        "working_dir": str(resolved_working_dir),
        "output_dir": str(resolved_output_dir),
        "output_dir_exists": output_dir_exists,
        "ready": ready,
        "warnings": warnings,
    }


def _sanitize_output(text: str) -> str:
    """Remove anything that looks like a secret from command output."""
    return sanitize_text(text)


def run_health_check() -> dict:
    """Run ``rdagent health_check --no-check-env`` and return structured results.

    Returns a dict matching RDagentHealthCheckResponse.
    Never raises and never exposes secrets.
    """
    warnings: list[str] = []

    if not shutil.which("rdagent"):
        warnings.append("RD-Agent is not installed. Install with: pip install rdagent")
        return {
            "success": False,
            "return_code": -1,
            "stdout": "",
            "stderr": "",
            "warnings": warnings,
        }

    try:
        result = subprocess.run(
            ["rdagent", "health_check", "--no-check-env"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return {
            "success": result.returncode == 0,
            "return_code": result.returncode,
            "stdout": _sanitize_output(result.stdout),
            "stderr": _sanitize_output(result.stderr),
            "warnings": warnings,
        }
    except subprocess.TimeoutExpired:
        warnings.append("rdagent health_check timed out after 30 seconds.")
        return {
            "success": False,
            "return_code": -1,
            "stdout": "",
            "stderr": "",
            "warnings": warnings,
        }
    except FileNotFoundError:
        warnings.append("RD-Agent is not installed. Install with: pip install rdagent")
        return {
            "success": False,
            "return_code": -1,
            "stdout": "",
            "stderr": "",
            "warnings": warnings,
        }
