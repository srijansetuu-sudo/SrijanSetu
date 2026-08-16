#!/bin/sh
set -eu

cd /app

if [ -n "${DATABASE_URL:-}" ]; then
  : # Keep the runtime database URL in the environment for Alembic and Uvicorn.
fi

alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
