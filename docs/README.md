# Documentation

## Overview

TXAI Support runs with **local ↔ cloud parity** - same code, different infrastructure:

| Component | Local | Cloud |
|-----------|-------|-------|
| Database | Firebase Emulator | Cloud Firestore |
| Storage | fake-gcs-server | Cloud Storage |
| Redis | Docker container | Redis Cloud |
| Backend | Docker container | Cloud Run |
| Frontend | Nginx container | Firebase Hosting |

## Main Guides

### Architecture
- **[Local vs Cloud](architecture/LOCAL_VS_CLOUD.md)** - Environment differences
- **[Storage & Redis](STORAGE_AND_REDIS_SETUP.md)** - Storage and session setup

### Infrastructure
- **[Deployment Guide](infra/deployment-guide.md)** - Full GCP deploy
- **[Terraform](infra/terraform.md)** - Infrastructure as Code

### Development
- **[Docker](docker.md)** - Local setup
- **[Troubleshooting](troubleshooting.md)** - Common issues

## Service URLs

### Local (Docker Compose)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8081 |
| Backend API | http://localhost:3001/api |
| Firebase Emulator UI | http://localhost:4000 |
| GCS Emulator | http://localhost:4443 |
| Redis | localhost:6379 |

### Production (GCP)

| Service | URL |
|---------|-----|
| Frontend | https://`<project>`.web.app |
| Backend | https://`<service>`.run.app |
| Database | Cloud Firestore |
| Redis | Redis Cloud (TLS) |
| Storage | Cloud Storage |

## Environment Variables

### Backend

| Variable | Description | Local | Cloud |
|----------|-------------|-------|-------|
| `FIRESTORE_EMULATOR_HOST` | Firestore emulator | `firebase-emulator:8080` | (not set) |
| `GCP_PROJECT_ID` | GCP project | `local-dev` | Your project ID |
| `REDIS_URL` | Redis connection | `redis://redis:6379` | `rediss://...` (TLS) |
| `STORAGE_EMULATOR_HOST` | GCS emulator | `http://fake-gcs:4443` | (not set) |
| `GCS_BUCKET` | Upload bucket | `txai-uploads` | `project-uploads` |
| `JWT_SECRET` | JWT signing key | `.env` file | Secret Manager |
| `ADMIN_DEFAULT_PASSWORD` | Initial admin password | `.env` file | Secret Manager |

### Frontend

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend API URL |

## Deploy Scripts

| Script | Purpose |
|--------|---------|
| `./scripts/gcp/first-time-deploy.sh` | Initial setup |
| `./scripts/gcp/deploy-backend.sh` | Deploy backend |
| `./scripts/gcp/deploy-frontend-firebase.sh` | Deploy frontend |
| `./scripts/test-firestore.sh` | Run API tests |
