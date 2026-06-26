# TXAI Support

Technical support system with PostgreSQL, Redis, and WhatsApp integration.

## Quick Start

### Prerequisites

Create a `.env` file with your secrets (optional, but recommended):

```bash
cp .env.local.example .env.local
# Edit .env.local and set:
# - JWT_SECRET
# - ADMIN_DEFAULT_PASSWORD
# - POSTGRES_PASSWORD
# - WPPCONNECT_SECRET_KEY / WPPCONNECT_WEBHOOK_SECRET
```

### Start Locally (Docker Compose)

```bash
docker compose up -d
```

**Local URLs:**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8081 |
| Backend API | http://localhost:3001/api |
| PostgreSQL | localhost:5432 |
| WPPConnect Server | http://localhost:21465 |

**Default Admin:**
- Email: `admin@txai.com`
- Password: (from your `ADMIN_DEFAULT_PASSWORD` env var)

### Development (hot reload)

```bash
npm run dev:services:detached   # PostgreSQL, Redis, WPPConnect
cp backend/.env.local.example backend/.env.local
npm run dev                     # Frontend + Backend locally
```

## Architecture

| Component | Local | Production |
|-----------|-------|------------|
| **Database** | PostgreSQL (Docker) | PostgreSQL |
| **Storage** | Local disk (`./uploads`) | Local disk volume |
| **Redis** | Redis container | Redis |
| **Backend** | Node.js | Docker / VPS |
| **Frontend** | Nginx container | Nginx / static host |

## Troubleshooting

### 401 Unauthorized after restart

Clear browser localStorage and login again.

### Database connection issues

```bash
docker compose logs postgres
docker compose down -v && docker compose up -d
```
