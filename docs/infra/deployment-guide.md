# GCP Deployment Guide - Complete Automation

This guide covers the complete, automated deployment of TXAI Support to Google Cloud Platform using best practices and a single command.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start (One Command)](#quick-start-one-command)
- [Step-by-Step Guide](#step-by-step-guide)
- [Deployment Scripts](#deployment-scripts)
- [Post-Deployment Configuration](#post-deployment-configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [CI/CD Setup](#cicd-setup)

---

## Overview

The deployment system consists of:
- **Bootstrap** (one-time): Creates state bucket, WIF provider, and service accounts
- **Infrastructure**: Terraform/OpenTofu manages all GCP resources
- **Backend**: Cloud Run service with Cloud SQL database
- **Frontend**: Firebase Hosting (CDN + SPA routing)

### Architecture
```
┌─────────────────────────────────────────────────────┐
│ Google Cloud Platform (Project: your-project-id)   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐      ┌──────────────┐            │
│  │   Frontend  │      │   Backend    │            │
│  │ (Firebase)  │─────▶│ (Cloud Run)  │            │
│  └─────────────┘      └──────────────┘            │
│                              │                      │
│                              ▼                      │
│                       ┌──────────────┐            │
│                       │  Cloud SQL   │            │
│                       │  (Postgres)  │            │
│                       └──────────────┘            │
│                              │                      │
│  ┌─────────────┐            │                      │
│  │   Uploads   │◀───────────┘                      │
│  │ (GCS Bucket)│                                   │
│  └─────────────┘                                   │
│                                                     │
│  ┌─────────────────────────────────────────┐      │
│  │  Artifact Registry (Docker Images)      │      │
│  └─────────────────────────────────────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Tools
Install these before deploying:

```bash
# Google Cloud SDK
# macOS:
brew install google-cloud-sdk

# Linux:
curl https://sdk.cloud.google.com | bash

# OpenTofu (Terraform alternative)
brew install opentofu

# Node.js (for frontend build)
brew install node

# Verify installations
gcloud --version
tofu --version
node --version
npm --version
```

### GCP Setup

1. **Create a GCP Project**
   ```bash
   gcloud projects create your-project-id --name="TXAI Support Dev"
   ```

2. **Enable Billing**
   - Go to: https://console.cloud.google.com/billing
   - Link billing account to your project

3. **Authenticate**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project your-project-id
   ```

### GitHub Repository
You'll need:
- GitHub username/organization
- Repository name
- Admin access to set up secrets (for CI/CD)

---

## Quick Start (One Command)

For a complete first-time deployment:

```bash
PROJECT_ID=your-project-id \
GITHUB_OWNER=your-username \
GITHUB_REPO=your-repo \
./scripts/gcp/first-time-deploy.sh
```

This single command will:
1. ✅ Check all prerequisites
2. ✅ Run bootstrap (create state bucket, WIF)
3. ✅ Deploy infrastructure (Cloud Run, Cloud SQL, buckets)
4. ✅ Build and deploy backend container
5. ✅ Build and deploy frontend to Firebase Hosting
6. ✅ Verify deployment health

**Expected time:** 15-20 minutes (mostly Cloud SQL provisioning)

---

## Step-by-Step Guide

If you prefer to run steps individually:

### Step 1: Bootstrap (One-time)

```bash
PROJECT_ID=your-project-id \
GITHUB_OWNER=your-username \
GITHUB_REPO=your-repo \
./scripts/gcp/bootstrap.sh
```

**What it does:**
- Creates Terraform state bucket
- Sets up Workload Identity Federation for GitHub Actions
- Creates service accounts with proper IAM roles

**Save these outputs:**
```
TF_STATE_BUCKET=your-project-id-tfstate
WIF_PROVIDER=projects/.../locations/global/workloadIdentityPools/.../providers/github
TF_SERVICE_ACCOUNT=tf-admin@your-project-id.iam.gserviceaccount.com
```

### Step 2: Configure Terraform Variables (Optional)

```bash
cd infra/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
nano terraform.tfvars
```

**Key variables to customize:**
- `project_id`: Your GCP project ID
- `backend_env_vars`: JWT_SECRET, SMTP settings, etc.
- `database_tier`: Upgrade from db-f1-micro for production

### Step 3: Deploy Everything

```bash
PROJECT_ID=your-project-id \
TF_STATE_BUCKET=your-tfstate-bucket \
./scripts/gcp/deploy-all.sh
```

**What it does:**
1. Runs Terraform to create infrastructure
2. Builds backend Docker image
3. Pushes image to Artifact Registry
4. Deploys to Cloud Run
5. Builds frontend React app
6. Uploads to GCS bucket
7. Waits for health checks

### Step 4: Verify Deployment

```bash
PROJECT_ID=your-project-id ./scripts/gcp/verify-deployment.sh
```

**Checks:**
- ✓ Infrastructure created
- ✓ Backend responding
- ✓ Frontend accessible
- ✓ Database running
- ✓ Service accounts configured
- ✓ Environment variables set

---

## Deployment Scripts

All scripts are in `scripts/gcp/`:

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `first-time-deploy.sh` | Complete automated deployment | First deployment or fresh project |
| `bootstrap.sh` | One-time infrastructure setup | Before first deployment |
| `deploy-all.sh` | Full app deployment | After code changes |
| `deploy-backend.sh` | Backend only | After backend changes |
| `deploy-frontend-firebase.sh` | Frontend only (Firebase) | After frontend changes |
| `verify-deployment.sh` | Health checks | After any deployment |

### Script Features

All scripts include:
- ✅ Prerequisite validation
- ✅ Color-coded output
- ✅ Progress indicators
- ✅ Error handling
- ✅ Helpful next steps

---

## Post-Deployment Configuration

### 1. Set Environment Variables

The deployment auto-configures DATABASE_URL, CORS_ORIGINS, and GCS settings. You need to set:

```bash
# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Update Cloud Run service
gcloud run services update txai-backend \
  --region us-central1 \
  --update-env-vars \
    JWT_SECRET="${JWT_SECRET}",\
    NODE_ENV=production,\
    SMTP_HOST=smtp.gmail.com,\
    SMTP_PORT=587,\
    SMTP_USER=your-email@gmail.com,\
    SMTP_PASS=your-app-password
```

**Important:** The backend now enforces `JWT_SECRET` for security. If it's missing or doesn't match the one used to sign tokens, users will get `401 Unauthorized` errors.

### 2. Configure Custom Domain (Optional)

```bash
# Map domain to Cloud Run
gcloud run domain-mappings create \
  --service txai-backend \
  --domain api.your-domain.com \
  --region us-central1

# Map domain to Firebase Hosting
# See: https://firebase.google.com/docs/hosting/custom-domain
```

### 3. Set Up Monitoring

```bash
# Enable uptime checks
gcloud monitoring uptime-checks create \
  --display-name="TXAI Backend Health" \
  --resource-type="uptime-url" \
  --request-url="https://your-backend-url/api/health"

# View logs
gcloud run services logs read txai-backend \
  --region us-central1 \
  --limit 100 \
  --follow
```

---

## Verification

### Manual Testing

```bash
# Get URLs from Terraform outputs
cd infra/terraform/environments/dev
BACKEND_URL=$(tofu output -raw backend_cloud_run_url)
FIREBASE_URL=$(tofu output -raw firebase_hosting_url)

# Test backend
curl ${BACKEND_URL}/api/health

# Test frontend
open ${FIREBASE_URL}
```

### Automated Verification

```bash
PROJECT_ID=your-project ./scripts/gcp/verify-deployment.sh
```

**Expected output:**
```
✓ Terraform state exists
✓ Cloud Run service exists
✓ Backend responds to health check
✓ Frontend is publicly accessible
✓ Database instance is RUNNABLE

Passed:   12
Warnings: 2
Failed:   0
```

---

## Troubleshooting

### Common Issues

#### 1. "Billing not enabled"
```bash
# Check billing status
gcloud beta billing projects describe PROJECT_ID

# Enable at:
https://console.cloud.google.com/billing
```

#### 2. "API not enabled"
```bash
# Enable all required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

#### 3. "Permission denied"
```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login

# Verify active account
gcloud auth list
```

#### 4. "Backend health check failing"
```bash
# Check logs
gcloud run services logs read txai-backend \
  --region us-central1 \
  --limit 50

# Common causes:
# - Missing DATABASE_URL env var
# - Database not migrated (check Prisma logs)
# - Missing JWT_SECRET
```

#### 5. "Frontend not loading"
```bash
# Check Firebase Hosting status
firebase hosting:sites:list

# Check browser console for CORS errors
# If CORS is blocking, ensure backend CORS_ORIGINS matches your Firebase URL
```

#### 6. "Docker build fails"
```bash
# Check .dockerignore exists
ls -la backend/.dockerignore

# Test build locally
cd backend
docker build -t test .
```

### Getting Help

1. **View detailed logs:**
   ```bash
   # Cloud Run logs
   gcloud run services logs read txai-backend --region us-central1

   # Cloud SQL logs
   gcloud sql operations list --instance INSTANCE_NAME

   # Cloud Build logs
   gcloud builds list --limit 5
   ```

2. **Check Terraform state:**
   ```bash
   cd infra/terraform/environments/dev
   tofu state list
   tofu show
   ```

3. **Validate configuration:**
   ```bash
   cd infra/terraform/environments/dev
   tofu validate
   tofu plan
   ```

---

## CI/CD Setup

### GitHub Actions

After successful deployment, set up GitHub Actions for automated deployments:

1. **Add GitHub Secrets** (from bootstrap outputs):
   - `GCP_WIF_PROVIDER`: Workload Identity Provider
   - `GCP_TF_SERVICE_ACCOUNT`: Service account email
   - `TF_STATE_BUCKET`: Terraform state bucket

2. **Workflow Configuration** (`.github/workflows/deploy-dev.yml`):
   ```yaml
   name: Deploy to Dev
   on:
     push:
       branches: [main]

   jobs:
     deploy:
       runs-on: ubuntu-latest
       permissions:
         contents: read
         id-token: write

       steps:
         - uses: actions/checkout@v4

         - id: auth
           uses: google-github-actions/auth@v2
           with:
             workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
             service_account: ${{ secrets.GCP_TF_SERVICE_ACCOUNT }}

         - name: Deploy
           env:
             PROJECT_ID: your-project-id
             TF_STATE_BUCKET: ${{ secrets.TF_STATE_BUCKET }}
           run: ./scripts/gcp/deploy-all.sh
   ```

3. **Test the workflow:**
   - Push to main branch
   - Check Actions tab
   - Verify deployment succeeds

---

## Cost Optimization

### Free Tier Resources
- Cloud Run: 2M requests/month free
- Cloud SQL: db-f1-micro is ~$7/month (no free tier)
- Cloud Storage: 5GB free
- Cloud Build: 120 build-minutes/day free

### Cost Reduction Tips
1. **Use Cloud Run always-on sparingly** (cold starts are ok for dev)
2. **Use db-f1-micro** for development ($7/month vs $25+)
3. **Enable backups only in production**
4. **Set up budget alerts:**
   ```bash
   gcloud billing budgets create \
     --billing-account=BILLING_ACCOUNT_ID \
     --display-name="TXAI Dev Budget" \
     --budget-amount=50USD
   ```

---

## Next Steps

After successful deployment:

1. ✅ Set up custom domain
2. ✅ Configure monitoring and alerts
3. ✅ Enable GitHub Actions CI/CD
4. ✅ Set up staging environment
5. ✅ Configure backup/restore procedures
6. ✅ Document runbooks for common operations

---

## Support

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues
- **Infrastructure**: See `infra/terraform/` for all IaC code

---

**Last Updated**: 2024-12-22
**Maintained By**: DevOps Team
