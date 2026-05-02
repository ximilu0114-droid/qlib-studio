from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def _migrate_jobs_table() -> None:
    """Add missing columns to jobs table if they don't exist."""
    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns("jobs")}

    migrations = []
    if "type" not in columns:
        migrations.append("ALTER TABLE jobs ADD COLUMN type TEXT DEFAULT 'qrun'")
    if "working_dir" not in columns:
        migrations.append("ALTER TABLE jobs ADD COLUMN working_dir TEXT DEFAULT '.'")

    if migrations:
        with engine.begin() as conn:
            for stmt in migrations:
                conn.execute(text(stmt))


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    if "jobs" in inspect(engine).get_table_names():
        _migrate_jobs_table()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
