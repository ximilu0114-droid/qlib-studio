from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import experiments, health, jobs, qlib_status, settings, workflows
from app.core.config import settings as app_settings
from app.db.database import create_tables
from app.services.workflow_service import create_default_templates


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    create_default_templates()
    yield


app = FastAPI(
    title=app_settings.app_name,
    version=app_settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(qlib_status.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(workflows.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(experiments.router, prefix="/api")
