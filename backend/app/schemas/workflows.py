from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TemplateItem(BaseModel):
    name: str
    path: str


class TemplateListResponse(BaseModel):
    templates: list[TemplateItem]


class TemplateContentResponse(BaseModel):
    name: str
    content: str


class WorkflowSaveRequest(BaseModel):
    name: str
    content: str


class WorkflowSaveResponse(BaseModel):
    name: str
    path: str
    message: str


class WorkflowTemplate(BaseModel):
    filename: str
    name: str
    description: str


class WorkflowContent(BaseModel):
    filename: str
    content: str


class QrunRequest(BaseModel):
    workflow_name: Optional[str] = None
    workflow_path: Optional[str] = None
    working_dir: str = "."


class QrunResponse(BaseModel):
    job_id: int
    status: str


class JobCreateRequest(BaseModel):
    name: str
    workflow_filename: str


class JobResponse(BaseModel):
    id: int
    type: str
    status: str
    workflow_path: str
    working_dir: str
    pid: Optional[int] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    exit_code: Optional[int] = None
    log_path: Optional[str] = None

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    jobs: list[JobResponse]


class JobLogResponse(BaseModel):
    job_id: int
    logs: str
