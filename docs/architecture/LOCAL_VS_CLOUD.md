# Local vs Cloud Deployment Guide

This guide explains the differences between local development and cloud production environments, demonstrating the **environment parity** design philosophy of TXAI Support.

## Overview

The TXAI Support application is designed with **"write once, run anywhere"** in mind. The same codebase runs seamlessly in both environments through abstraction layers that automatically detect and configure themselves.

## Architecture Diagrams

### Local Development Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Local Development (Docker Compose)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   localhost:8080          localhost:3001           localhost:4443        │
│   ┌──────────────┐       ┌──────────────┐        ┌──────────────┐       │
│   │   Frontend   │       │   Backend    │        │ fake-gcs-    │       │
│   │   (Nginx)    │──────▶│   (Node.js)  │───────▶│ server       │       │
│   └──────────────┘       └──────┬───────┘        │ (GCS Emu)    │       │
│                                 │                └──────────────┘       │
│                                 │                                        │
│                    ┌────────────┼────────────┐                          │
│                    │            │            │                          │
│                    ▼            ▼            ▼                          │
│            ┌────────────┐ ┌──────────┐ ┌──────────────┐                 │
│            │ PostgreSQL │ │  Redis   │ │  WhatsApp    │                 │
│            │ :5433      │ │  :6379   │ │  Sessions    │                 │
│            └────────────┘ └──────────┘ └──────────────┘                 │
│                                                                          │
│   All services run in Docker containers on the same network              │
│   Data persists in Docker volumes                                        │
│   No internet connection required                                        │
│   Total cost: $0                                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cloud Production Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Cloud Production (GCP + Redis Cloud)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Firebase Hosting         Cloud Run              Cloud Storage          │
│   ┌──────────────┐       ┌──────────────┐        ┌──────────────┐       │
│   │   Frontend   │       │   Backend    │        │ GCS Bucket   │       │
│   │   (CDN)      │──────▶│ (Serverless) │───────▶│ (Private)    │       │
│   └──────────────┘       └──────┬───────┘        └──────────────┘       │
│                                 │                                        │
│                    ┌────────────┼────────────┐                          │
│                    │            │            │                          │
│                    ▼            ▼            ▼                          │
│            ┌────────────┐ ┌──────────┐ ┌──────────────┐                 │
│            │ Cloud SQL  │ │  Redis   │ │  WhatsApp    │                 │
│            │ (Postgres) │ │  Cloud   │ │  Sessions    │                 │
│            │            │ │  (TLS)   │ │  (in Redis)  │                 │
│            └────────────┘ └──────────┘ └──────────────┘                 │
│                                                                          │
│   Managed services with auto-scaling                                     │
│   Data persists with automatic backups                                   │
│   Global CDN for frontend                                                │
│   Total cost: ~$10-15/month (sporadic traffic)                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Differences

### 1. Infrastructure Hosting

| Aspect | Local Development | Cloud Production |
|--------|-------------------|------------------|
| **Hosting** | Docker containers on your machine | Google Cloud Platform managed services |
| **Management** | `docker-compose` commands | Terraform IaC + GitHub Actions |
| **Networking** | Docker bridge network (172.x.x.x) | Google VPC + public internet |
| **Data Persistence** | Docker volumes | Managed cloud storage |
| **Cost** | $0 (uses local resources) | ~$10-15/month |

### 2. Service Discovery & Networking

**Local Development:**
```bash
# Services use Docker DNS names
DATABASE_URL=postgresql://txai:txai123@postgres:5432/txai_support
REDIS_URL=redis://redis:6379
STORAGE_EMULATOR_HOST=http://fake-gcs:4443
```

**Cloud Production:**
```bash
# Services use Cloud endpoints
DATABASE_URL=postgresql://txai:PASSWORD@localhost:5432/txai_support?host=/cloudsql/PROJECT:REGION:instance
REDIS_URL=rediss://:PASSWORD@redis-xxxxx.cloud.redislabs.com:16379
# No STORAGE_EMULATOR_HOST - uses real GCS
```

### 3. Authentication & Security

| Aspect | Local | Cloud |
|--------|-------|-------|
| **Service Auth** | None (localhost) | Service accounts + IAM |
| **Secrets** | `.env` file (gitignored) | Secret Manager |
| **Encryption** | None (HTTP) | TLS everywhere |
| **Credentials** | Simple passwords | Auto-rotated secrets |

### 4. Data Persistence

| Component | Local | Cloud |
|-----------|-------|-------|
| **Database** | Docker volume (can be lost) | Cloud SQL with auto-backups |
| **Redis** | Docker volume | Redis Cloud with AOF + snapshots |
| **Files** | fake-gcs-server volume | GCS with 11-nines durability |

## Detailed Comparison Table

| Component | Local Development | Cloud Production |
|-----------|-------------------|------------------|
| **Database** | PostgreSQL 15 in Docker | Cloud SQL (PostgreSQL 15) - managed |
| **Database Host** | `postgres:5432` (Docker DNS) | Unix socket via Cloud SQL Proxy |
| **Database Backups** | None (manual) | Automatic daily + point-in-time recovery |
| **Database Cost** | $0 | ~$10/month (db-f1-micro) |
| | | |
| **Redis** | Redis 7 in Docker | Redis Cloud free tier (30MB) |
| **Redis Host** | `redis:6379` | `redis-xxxxx.cloud.redislabs.com:16379` |
| **Redis Encryption** | None | TLS 1.2+ (`rediss://` protocol) |
| **Redis Cost** | $0 | $0 (free tier) |
| | | |
| **Storage** | fake-gcs-server (emulator) | Google Cloud Storage |
| **Storage Endpoint** | `http://fake-gcs:4443` | `storage.googleapis.com` |
| **Storage Auth** | None (emulator) | Service account IAM |
| **Storage Durability** | Single machine | 99.999999999% (11 nines) |
| **Storage Cost** | $0 | ~$0.02/month |
| | | |
| **Backend** | Node.js in Docker | Cloud Run (serverless) |
| **Backend Scaling** | 1 instance | Auto-scales 0-N |
| **Backend URL** | `http://localhost:3001` | `https://PROJECT.run.app` |
| **Backend Cost** | $0 | ~$0-5/month |
| | | |
| **Frontend** | Nginx in Docker | Firebase Hosting |
| **Frontend URL** | `http://localhost:8080` | `https://PROJECT.web.app` |
| **Frontend CDN** | None | Global (150+ edge locations) |
| **Frontend Cost** | $0 | $0 (free tier) |
| | | |
| **SSL/TLS** | None (HTTP) | Automatic HTTPS |
| **Logs** | `docker-compose logs` | Cloud Logging (centralized) |
| **Monitoring** | None | Cloud Monitoring + alerts |
| | | |
| **WhatsApp Sessions** | Redis (same as cloud) | Redis Cloud (same as local) |
| **Deployment** | `docker-compose up` | `terraform apply` + CI/CD |
| **Total Monthly Cost** | **$0** | **~$10-15** |

## How the Code Adapts

### Storage Abstraction

The storage layer (`backend/src/storage/storage.ts`) automatically detects the environment:

```typescript
// Emulator detection - SDK uses STORAGE_EMULATOR_HOST automatically
const isEmulator = !!process.env.STORAGE_EMULATOR_HOST;

// Local: Routes to fake-gcs-server
// Cloud: Routes to storage.googleapis.com
```

**Local environment:**
```bash
STORAGE_DRIVER=gcs
STORAGE_EMULATOR_HOST=http://fake-gcs:4443  # Emulator
GCS_BUCKET=txai-uploads
```

**Cloud environment:**
```bash
STORAGE_DRIVER=gcs
# No STORAGE_EMULATOR_HOST = real GCS
GCS_BUCKET=project-id-uploads
GCS_CREDENTIALS_JSON={"type":"service_account",...}
```

### Redis Connection

Same connection format works for both:

```typescript
// Local (plain Redis)
REDIS_URL=redis://redis:6379

// Cloud (Redis Cloud with TLS - note double 's')
REDIS_URL=rediss://:PASSWORD@host:port
```

The WPPConnect service automatically handles both protocols.

### Environment Detection Flow

```
Application Starts
       │
       ▼
Check STORAGE_EMULATOR_HOST
       │
   ┌───┴───┐
   │       │
  SET?   NOT SET?
   │       │
   ▼       ▼
LOCAL   CLOUD
MODE    MODE
   │       │
   ▼       ▼
fake-gcs  Real GCS
emulator  googleapis.com
```

## Environment Profiles

Three profiles are provided for different scenarios:

### `.env.local.template` - Full Local Development

```bash
# All services run in Docker containers
DATABASE_URL=postgresql://txai:txai123@localhost:5433/txai_support
REDIS_URL=redis://localhost:6379
STORAGE_DRIVER=gcs
STORAGE_EMULATOR_HOST=http://localhost:4443
GCS_BUCKET=txai-uploads
WHATSAPP_TOKEN_STORE=redis
```

### `.env.dev.template` - Full Cloud Deployment

```bash
# All services in GCP + Redis Cloud
DATABASE_URL=postgresql://txai:PASS@localhost:5432/db?host=/cloudsql/PROJECT:REGION:instance
REDIS_URL=rediss://:PASS@HOST:PORT
STORAGE_DRIVER=gcs
GCS_BUCKET=project-id-uploads
# No STORAGE_EMULATOR_HOST
```

### `.env.hybrid.example` - Mix Local and Cloud

```bash
# Example: Local backend + Cloud database
DATABASE_URL=postgresql://txai:PASS@localhost:5432/db?host=/cloudsql/PROJECT:REGION:instance
REDIS_URL=redis://localhost:6379  # Local Redis
STORAGE_EMULATOR_HOST=http://localhost:4443  # Local storage
```

## Quick Commands

### Local Development

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down

# Reset (delete all data)
docker-compose down -v
```

### Cloud Production

```bash
# Deploy infrastructure
cd infra/terraform/environments/dev
terraform init && terraform apply

# Deploy backend
./scripts/gcp/deploy-backend.sh

# Deploy frontend
./scripts/gcp/deploy-frontend-firebase.sh

# View logs
gcloud run logs read txai-backend --project PROJECT_ID
```

## Cost Breakdown (Cloud)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud Run | Pay-per-use, <100 requests/day | $0-5 |
| Cloud SQL | db-f1-micro, 10GB disk | ~$10 |
| Cloud Storage | <1GB storage, <1000 operations | ~$0.02 |
| Redis Cloud | Free tier (30MB) | $0 |
| Secret Manager | <6 secrets | $0 |
| Firebase Hosting | Free tier | $0 |
| **Total** | | **~$10-15/month** |

## Troubleshooting

### Storage Not Working Locally

```bash
# Check emulator is running
curl http://localhost:4443/storage/v1/b

# Verify environment variable in backend
docker-compose exec backend env | grep STORAGE_EMULATOR_HOST
```

### Redis Connection Issues

**Local:**
```bash
docker-compose exec redis redis-cli ping
# Should return: PONG
```

**Cloud:**
```bash
redis-cli -h HOST -p PORT -a PASSWORD --tls ping
```

### Database Connection Issues

**Local:**
```bash
docker-compose exec postgres psql -U txai -d txai_support -c "SELECT 1"
```

**Cloud:**
```bash
gcloud sql connect INSTANCE_NAME --user=txai
```

## See Also

- [Storage and Redis Setup](../STORAGE_AND_REDIS_SETUP.md)
- [Deployment Guide](../infra/deployment-guide.md)
- [Docker Configuration](../docker.md)
- [Troubleshooting](../troubleshooting.md)

