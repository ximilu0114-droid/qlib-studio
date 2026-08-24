import os
import shutil
import tempfile
from pathlib import Path

TEST_STORAGE_DIR = Path(tempfile.mkdtemp(prefix="qlib_studio_tests_"))
os.environ["QLIB_STUDIO_STORAGE_DIR"] = str(TEST_STORAGE_DIR)
os.environ["QLIB_STUDIO_DATABASE_URL"] = (
    f"sqlite:///{TEST_STORAGE_DIR / 'qlib_studio_tests.sqlite'}"
)
os.environ["MLFLOW_TRACKING_URI"] = f"sqlite:///{TEST_STORAGE_DIR / 'mlflow.sqlite'}"


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(TEST_STORAGE_DIR, ignore_errors=True)
