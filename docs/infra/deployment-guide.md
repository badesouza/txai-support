# GCP Deployment Guide

Complete guide for deploying TXAI Support to Google Cloud Platform.

## Overview

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Firebase Hosting | Free |
| Backend | Cloud Run | ~$0-5/month |
| Database | Cloud Firestore | ~$0-2/month |
| Storage | Cloud Storage | ~$0.02/month |
| Redis | Redis Cloud | Free tier |
| **Total** | | **~$5-10/month** |

## Prerequisites

### Install Tools

```bash
# Google Cloud SDK
brew install google-cloud-sdk

# OpenTofu (Terraform alternative)
brew install opentofu

# Node.js
brew install node

# Firebase CLI
npm install -g firebase-tools
```

### GCP Setup

```bash
# Create project
gcloud projects create your-project-id

# Authenticate
gcloud auth login
gcloud auth application-default login
firebase login

# Set project
gcloud config set project your-project-id

# Enable billing at:
# https://console.cloud.google.com/billing
```

## Quick Start

### First-Time Deploy

```bash
PROJECT_ID=your-project-id \
GITHUB_OWNER=your-username \
GITHUB_REPO=your-repo \
./scripts/gcp/first-time-deploy.sh
```

This will:
1. Create Terraform state bucket
2. Set up Workload Identity Federation
3. Deploy infrastructure (Cloud Run, Firestore, GCS)
4. Build and deploy backend
5. Build and deploy frontend to Firebase
6. Run health checks

**Time:** ~10-15 minutes

## Day-to-Day Deploys

### Backend Changes

```bash
PROJECT_ID=your-project ./scripts/gcp/deploy-backend.sh
```

### Frontend Changes

```bash
./scripts/gcp/deploy-frontend-firebase.sh
```

### Infrastructure Changes

```bash
cd infra/terraform/environments/dev
terraform apply
```

## Post-Deploy Configuration

### 1. Set JWT Secret

```bash
JWT_SECRET=$(openssl rand -base64 32)

gcloud run services update txai-backend \
  --region us-central1 \
  --update-env-vars JWT_SECRET="${JWT_SECRET}"
```

### 2. Set Admin Password

```bash
gcloud run services update txai-backend \
  --region us-central1 \
  --update-env-vars ADMIN_DEFAULT_PASSWORD="your-secure-password"
```

### 3. Configure Redis Cloud

1. Create free account at [Redis Cloud](https://redis.io/try-free/)
2. Create a database (free tier)
3. Update Cloud Run:

```bash
gcloud run services update txai-backend \
  --region us-central1 \
  --update-env-vars REDIS_URL="rediss://default:PASSWORD@HOST:PORT"
```

## Verification

```bash
# Get URLs
BACKEND_URL=$(terraform output -raw backend_cloud_run_url)

# Test backend
curl ${BACKEND_URL}/api/health

# Run full test
ADMIN_PASSWORD=your-password ./scripts/test-firestore.sh
```

## Troubleshooting

### 401 Unauthorized

JWT_SECRET mismatch. Update and have users re-login:
```bash
gcloud run services describe txai-backend --format="yaml" | grep JWT
```

### CORS Errors

```bash
gcloud run services update txai-backend \
  --update-env-vars "CORS_ORIGINS=https://your-app.web.app"
```

### Database Issues

```bash
# Check Firestore is enabled
gcloud firestore databases list

# Check logs
gcloud run logs read txai-backend --limit=50
```

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `first-time-deploy.sh` | Complete initial setup |
| `bootstrap.sh` | One-time infrastructure setup |
| `deploy-backend.sh` | Deploy backend only |
| `deploy-frontend-firebase.sh` | Deploy frontend only |
| `verify-deployment.sh` | Run health checks |
| `test-firestore.sh` | Test API endpoints |

## See Also

- [Local vs Cloud](../architecture/LOCAL_VS_CLOUD.md)
- [Troubleshooting](../troubleshooting.md)
- [Docker Setup](../docker.md)
