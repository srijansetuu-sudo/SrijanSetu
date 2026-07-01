# SrijanSetu Backend Robot API Tests

This test suite validates the FastAPI backend through real HTTP calls against `/api/v1`.

## What It Covers

- Authentication and JWT refresh/logout flows
- OAuth2 bearer protected routes
- Role-based authorization for CUSTOMER and CREATOR
- Requirement CRUD and ownership rules
- Creator profile and saved creator flows
- Quotation and order creation marketplace flow
- Order status, file metadata, and chat messages
- Payment creation, verification, and history
- Notification listing/read behavior
- Negative tests for invalid UUIDs, missing bodies, malformed JSON, bad enums, wrong roles, and ownership violations

## Install Test Dependencies

From `Project/`:

```powershell
python -m pip install -r requirements-test.txt
```

## Start Backend

From `Project/`:

```powershell
docker compose up -d postgres
cd backend
.\.venv\Scripts\activate
python -m alembic upgrade head
uvicorn app.main:app --reload
```

## Environment Variables

Defaults are provided in `tests/robot/variables/env.py`. You can override:

```powershell
$env:BASE_URL="http://127.0.0.1:8000"
$env:CUSTOMER_PASSWORD="StrongCustomerPass123!"
$env:CREATOR_PASSWORD="StrongCreatorPass123!"
$env:ADMIN_PASSWORD="StrongAdminPass123!"
```

If emails are not supplied, the suite creates unique dynamic emails automatically.

## Run All Tests

From `Project/`:

```powershell
robot -d reports tests/robot
```

## Run One Suite

```powershell
robot -d reports tests/robot/auth/auth_tests.robot
robot -d reports tests/robot/orders/orders_tests.robot
```

## Parallel Execution

```powershell
pabot --processes 4 -d reports tests/robot
```

## Reports

Robot automatically generates:

- `reports/report.html`
- `reports/log.html`
- `reports/output.xml`

## CI Notes

Use a clean PostgreSQL database or a disposable container for CI because these tests create users and marketplace data.

