# SrijanSetu

SrijanSetu is a custom-products marketplace that connects customers with skilled creators. Customers post requests, creators send offers, orders are paid through the platform, and the platform earns through commission plus light ads.

## Project Layout

```text
Project/
  frontend/   Next.js, Tailwind CSS, shadcn-style UI primitives
  backend/    FastAPI, SQLAlchemy, Alembic, JWT-ready API structure
  database/   PostgreSQL schema reference, seed notes, database docs
  docker-compose.yml   Local PostgreSQL for development
```

## MVP Scope

- Customer request posting and browsing
- Creator profiles and categories
- Creator quotations
- Order and payment lifecycle
- Requirement references and order delivery files
- Commission calculation
- Reviews
- Notifications and saved creators
- Future AI generation tracking
- Basic ads metadata for future controlled ad slots
- Clean admin-ready data model

## Local Setup

Start local PostgreSQL:

```bash
docker compose up -d postgres
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Database:

```bash
cd backend
alembic upgrade head
```

Copy the root `.env.example` to `.env` before running real services. Keep all private backend and frontend environment variables in that single root `.env` file.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the local-to-production path.
