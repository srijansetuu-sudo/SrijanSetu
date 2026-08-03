# SrijanSetu Deployment Path

This project is designed so local development and production use the same application code but different environment variables.

## Local Development

Use Docker for PostgreSQL locally:

```bash
docker compose up -d postgres
```

Create the shared env file:

```bash
copy .env.example .env
```

Install backend dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Run database migrations:

```bash
alembic upgrade head
```

Start backend:

```bash
uvicorn app.main:app --reload
```

Start frontend:

```bash
cd frontend
npm install
npm run dev
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`
- PostgreSQL: `localhost:5432`

## Production Recommendation

Do not run the main production PostgreSQL database as a simple Docker container unless you are prepared to manage backups, storage, upgrades, monitoring, and disaster recovery.

Use managed services:

- Frontend: Vercel
- Backend: Render or Railway
- Database: Neon, Supabase, Railway Postgres, or Render Postgres
- Images: Cloudinary
- Payments: Razorpay

In production, set the same root `.env.example` variables on the hosting platforms. Backend-only variables belong on the backend host, and `NEXT_PUBLIC_*` variables belong on the frontend host:

```env
APP_NAME=SrijanSetu API
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DB_NAME
JWT_SECRET=use-a-long-random-secret
JWT_SECRET_KEY=use-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
RAZORPAY_KEY_ID=your-live-or-test-key
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
COMMISSION_PERCENT=15
FRONTEND_ORIGIN=https://your-frontend-domain.com
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api/v1
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-live-or-test-key
```

## Production Migration Flow

After connecting the backend to the managed production database:

```bash
cd backend
alembic upgrade head
```

Run migrations from a controlled deploy step or from the hosting provider shell. Do not manually edit production tables.

## Important Rule

The app should never hardcode database credentials. Only `DATABASE_URL` changes between local Docker PostgreSQL and production managed PostgreSQL.
