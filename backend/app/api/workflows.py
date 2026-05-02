from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.workflows import (
    JobCreateRequest,
    JobResponse,
    TemplateContentResponse,
    TemplateItem,
    TemplateListResponse,
    WorkflowContent,
    WorkflowSaveRequest,
    WorkflowSaveResponse,
    WorkflowTemplate,
)
from app.services import job_runner, template_service, workflow_service

router = APIRouter(tags=["workflows"])


@router.get("/workflows/templates", response_model=TemplateListResponse)
def list_templates():
    """List all YAML template files from configs/qlib_templates/."""
    templates = template_service.list_templates()
    return TemplateListResponse(templates=[TemplateItem(**t) for t in templates])


@router.get("/workflows/templates/{template_name}", response_model=TemplateContentResponse)
def get_template(template_name: str):
    """Get the content of a specific template."""
    try:
        content = template_service.get_template_content(template_name)
        return TemplateContentResponse(name=template_name, content=content)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Template not found: {template_name}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/workflows/save", response_model=WorkflowSaveResponse)
def save_workflow(body: WorkflowSaveRequest):
    """Save a workflow file to storage/workflows/."""
    try:
        file_path = template_service.save_workflow(body.name, body.content)
        return WorkflowSaveResponse(
            name=body.name,
            path=str(file_path),
            message=f"Workflow saved successfully: {body.name}",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/workflows/list", response_model=list[WorkflowTemplate])
def list_workflows():
    """List saved workflows from storage/workflows/."""
    return workflow_service.list_workflow_templates()


@router.get("/workflows/{filename:path}", response_model=WorkflowContent)
def get_workflow(filename: str):
    """Get content of a saved workflow."""
    try:
        content = workflow_service.get_workflow_content(filename)
        return WorkflowContent(filename=filename, content=content)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {filename}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/workflows/{filename:path}", response_model=WorkflowContent)
def update_workflow(filename: str, body: WorkflowSaveRequest):
    """Update a saved workflow."""
    try:
        workflow_service.save_workflow_content(filename, body.content)
        return WorkflowContent(filename=filename, content=body.content)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {filename}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
