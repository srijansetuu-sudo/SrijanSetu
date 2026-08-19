# SrijanSetu Deployment Guide for a Single Hetzner VPS

This repository already contains the application code and the production deployment files needed for a single Ubuntu Docker host. The local development Compose file remains unchanged, and the production deployment uses a separate Compose file.

## Architecture

The production architecture is:

- Nginx on ports 80 and 443
- Next.js frontend behind Nginx
- FastAPI backend behind Nginx
- PostgreSQL only inside the Docker network; it is not exposed publicly

The database is accessed by the backend using the Compose service name `postgres` and not `localhost`.

## Server requirements

On the Hetzner VPS, install Docker Engine and Docker Compose:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Log out and log back in, or run:

```bash
newgrp docker
```

Install common utilities:

```bash
sudo apt-get install -y git curl certbot nginx
```

## Project checkout

Clone the repository on the VPS:

```bash
cd /opt
sudo git clone <your-repository-url> srijansetu
cd srijansetu/Project
```

## .env creation

Create the production environment file from the template:

```bash
cp .env.example .env
```

Edit the file and set actual values. Keep this file on the server only; do not commit it.

Minimum production values:

```env
APP_NAME=SrijanSetu API
ENVIRONMENT=production
FRONTEND_ORIGIN=https://your-domain.example
NEXT_PUBLIC_API_URL=https://your-domain.example/api/v1

POSTGRES_DB=srijansetu
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strong-postgres-password
DATABASE_URL=postgresql+psycopg://postgres:strong-postgres-password@postgres:5432/srijansetu

JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

RAZORPAY_KEY_ID=your-live-or-test-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
COMMISSION_PERCENT=15
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-live-or-test-key

UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

CONTACT_RECIPIENT_EMAIL=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=...
```

Do not change the variable names already used by the app. The backend reads `DATABASE_URL` through the Docker service name `postgres`, not `localhost`.

## Build and deploy

Build the production stack:

```bash
docker compose -f docker-compose.production.yml build
```

Start the services:

```bash
docker compose -f docker-compose.production.yml up -d
```

Check status:

```bash
docker compose -f docker-compose.production.yml ps
```

## Alembic migrations

The backend container runs Alembic automatically on startup, but you can also run migrations manually when needed:

```bash
docker compose -f docker-compose.production.yml exec backend alembic upgrade head
```

This targets the production PostgreSQL service `postgres` inside Docker.

If you need to run the same command from the host without entering the container, use:

```bash
docker compose -f docker-compose.production.yml run --rm backend alembic upgrade head
```

## Create the first production admin

The application intentionally does not bootstrap an admin user in production. After the database migrations finish, run the one-time admin creation script. It prompts for the email and password without storing the password in source control:

```bash
docker compose -f docker-compose.production.yml run --rm --no-deps --entrypoint python backend scripts/create_first_admin.py
```

If an admin already exists, the script makes no changes. For non-interactive use, provide `ADMIN_EMAIL` and `ADMIN_PASSWORD` through the command environment; do not commit them to `.env` or source control.

## Logs

View logs for each service:

```bash
docker compose -f docker-compose.production.yml logs -f backend
docker compose -f docker-compose.production.yml logs -f frontend
docker compose -f docker-compose.production.yml logs -f nginx
docker compose -f docker-compose.production.yml logs -f postgres
```

## Restarting services

```bash
docker compose -f docker-compose.production.yml restart
docker compose -f docker-compose.production.yml restart backend
docker compose -f docker-compose.production.yml restart nginx
```

## Updating after git pull

```bash
cd /opt/srijansetu/Project
git pull
cp .env.example .env
# edit .env with any required production values

docker compose -f docker-compose.production.yml build --pull
docker compose -f docker-compose.production.yml up -d --remove-orphans

docker compose -f docker-compose.production.yml exec backend alembic upgrade head
```

## HTTPS / Let's Encrypt

The repository already includes an Nginx config prepared for TLS termination. Place the certificates in the mounted directory:

```bash
sudo mkdir -p /opt/srijansetu/Project/nginx/certs
sudo certbot certonly --standalone -d your-domain.example
sudo cp /etc/letsencrypt/live/your-domain.example/fullchain.pem /opt/srijansetu/Project/nginx/certs/fullchain.pem
sudo cp /etc/letsencrypt/live/your-domain.example/privkey.pem /opt/srijansetu/Project/nginx/certs/privkey.pem
sudo chown -R root:root /opt/srijansetu/Project/nginx/certs
sudo chmod 600 /opt/srijansetu/Project/nginx/certs/privkey.pem
```

Then enable the HTTPS server block in [nginx/default.conf](nginx/default.conf) and reload Nginx:

```bash
docker compose -f docker-compose.production.yml exec nginx nginx -s reload
```

Do not commit certificates or private keys to the repository.

## PostgreSQL backup procedure

PostgreSQL runs as a Docker service on the VPS and persists data in a named Docker volume. Perform a manual backup with:

```bash
mkdir -p /opt/srijansetu/backups
DATE=$(date +%F_%H%M%S)

docker exec srijansetu_postgres pg_dump -U postgres -d srijansetu > "/opt/srijansetu/backups/srijansetu_${DATE}.sql"
```

To restore a backup:

```bash
docker exec -i srijansetu_postgres psql -U postgres -d srijansetu < /opt/srijansetu/backups/srijansetu_YYYYMMDD_HHMMSS.sql
```

For a practical retention policy, keep daily backups and delete older than 30 days.

## Rollback procedure

If a deploy is unstable, revert to the previous working state:

```bash
git checkout <previous-commit>

docker compose -f docker-compose.production.yml down

docker compose -f docker-compose.production.yml up -d --build
```

If you need to restore a database backup, follow the restore command above before starting the application again.

## Local development continues to work

The original local development workflow remains intact:

```bash
docker compose up -d postgres
```

This project does not replace or rewrite the local development Compose file. The production stack is separate and intentionally uses the single-host Docker Compose setup.

## Security notes

- Only ports 80 and 443 are exposed publicly via Nginx.
- PostgreSQL port 5432 is not exposed on the host.
- FastAPI internal port 8000 is not exposed publicly.
- Next.js internal port 3000 is not exposed publicly.
- SSH port 22 remains managed separately by the VPS firewall.
