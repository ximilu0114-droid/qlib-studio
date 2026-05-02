from pathlib import Path

from app.core.config import CONFIGS_DIR, WORKFLOWS_DIR


def _validate_filename(filename: str) -> None:
    """Validate filename to prevent path traversal attacks."""
    if not filename:
        raise ValueError("Filename cannot be empty")

    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValueError("Invalid filename: path traversal detected")

    if not filename.endswith((".yaml", ".yml")):
        raise ValueError("Only .yaml and .yml files are allowed")


def list_templates() -> list[dict]:
    """List all YAML template files from configs/qlib_templates/."""
    templates = []

    for yaml_file in sorted(CONFIGS_DIR.glob("*.yaml")):
        templates.append({
            "name": yaml_file.name,
            "path": str(yaml_file),
        })

    for yaml_file in sorted(CONFIGS_DIR.glob("*.yml")):
        if not any(t["name"] == yaml_file.name for t in templates):
            templates.append({
                "name": yaml_file.name,
                "path": str(yaml_file),
            })

    return templates


def get_template_content(template_name: str) -> str:
    """Get the content of a template file."""
    _validate_filename(template_name)

    file_path = CONFIGS_DIR / template_name
    if not file_path.exists():
        raise FileNotFoundError(f"Template not found: {template_name}")

    return file_path.read_text()


def save_workflow(name: str, content: str) -> Path:
    """Save a workflow file to storage/workflows/."""
    _validate_filename(name)

    file_path = WORKFLOWS_DIR / name
    file_path.write_text(content)

    return file_path
