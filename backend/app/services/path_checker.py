import os
from pathlib import Path


def expand_user_path(path: str) -> str:
    return str(Path(path).expanduser().resolve())


def check_path_exists(path: str) -> bool:
    return Path(expand_user_path(path)).exists()


def check_directory_writable(path: str) -> bool:
    expanded = expand_user_path(path)
    target = Path(expanded)
    if not target.exists():
        return False
    return os.access(target, os.W_OK)


def ensure_directory(path: str) -> Path:
    expanded = Path(expand_user_path(path))
    expanded.mkdir(parents=True, exist_ok=True)
    return expanded
