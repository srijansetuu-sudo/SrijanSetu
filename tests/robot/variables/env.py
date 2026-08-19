import os
import time
from pathlib import Path


def load_env_file():
    project_root = Path(__file__).resolve().parents[3]
    for env_file in (project_root / ".env", project_root / ".env.testing", project_root / ".env.example", project_root / ".env.testing.example"):
        if not env_file.exists():
            continue
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        return


load_env_file()

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")

_RUN_ID = str(int(time.time() * 1000))

CUSTOMER_EMAIL = os.getenv("CUSTOMER_EMAIL") or f"robot.customer.{_RUN_ID}@example.com"
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD", "StrongCustomerPass123!")

CREATOR_EMAIL = os.getenv("CREATOR_EMAIL") or f"robot.creator.{_RUN_ID}@example.com"
CREATOR_PASSWORD = os.getenv("CREATOR_PASSWORD", "StrongCreatorPass123!")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL") or f"robot.admin.{_RUN_ID}@example.com"
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "StrongAdminPass123!")

RUN_ID = _RUN_ID
API_PREFIX = "/api/v1"
