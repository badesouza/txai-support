# GCP Deployment Scripts

Automated deployment scripts for TXAI Support on Google Cloud Platform.

## Quick Start

**First-time deployment (one command):**
```bash
PROJECT_ID=your-project-id \
GITHUB_OWNER=your-username \
GITHUB_REPO=your-repo \
./first-time-deploy.sh
```

This will:
- ✅ Run bootstrap (create state bucket, WIF)
- ✅ Deploy infrastructure with Terraform
- ✅ Build and deploy backend to Cloud Run
- ✅ Build and deploy frontend to Firebase Hosting
- ✅ Verify everything is working

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| **first-time-deploy.sh** | Complete automated deployment | `PROJECT_ID=x GITHUB_OWNER=y GITHUB_REPO=z ./first-time-deploy.sh` |
| **bootstrap.sh** | One-time GCP setup | `PROJECT_ID=x GITHUB_OWNER=y GITHUB_REPO=z ./bootstrap.sh` |
| **setup-firebase.sh** | Initialize Firebase Hosting | `PROJECT_ID=x ./setup-firebase.sh` |
| **deploy-all.sh** | Deploy infrastructure + app | `PROJECT_ID=x TF_STATE_BUCKET=y ./deploy-all.sh` |
| **deploy-backend.sh** | Deploy backend only | `PROJECT_ID=x REGION=y ./deploy-backend.sh` |
| **deploy-frontend-firebase.sh** | Deploy frontend only (Firebase) | `API_URL=y ./deploy-frontend-firebase.sh` |
| **deploy-frontend-firebase.ps1** | Deploy frontend only (Firebase, Windows) | `$env:API_URL='y'; ./deploy-frontend-firebase.ps1` |
| **verify-deployment.sh** | Health checks | `PROJECT_ID=x ./verify-deployment.sh` |

## Prerequisites

Install these tools first:
- `gcloud` - Google Cloud SDK
- `tofu` - OpenTofu (Terraform)
- `node` - Node.js (for frontend build)

```bash
# macOS
brew install google-cloud-sdk opentofu node

# Authenticate
gcloud auth login
gcloud auth application-default login
```

## Common Workflows

### First Deployment
```bash
# 1. Bootstrap (one-time)
PROJECT_ID=my-project \
GITHUB_OWNER=myorg \
GITHUB_REPO=myrepo \
./bootstrap.sh

# 2. Deploy everything (or use first-time-deploy.sh)
PROJECT_ID=my-project \
TF_STATE_BUCKET=my-project-tfstate \
./deploy-all.sh

# 3. Verify
PROJECT_ID=my-project ./verify-deployment.sh
```

### After Code Changes
```bash
# Deploy everything
PROJECT_ID=my-project \
TF_STATE_BUCKET=my-project-tfstate \
./deploy-all.sh

# Or deploy just backend
PROJECT_ID=my-project ./deploy-backend.sh

# Or deploy just frontend
API_URL=https://backend-url/api \
./deploy-frontend-firebase.sh
```

### Troubleshooting
```bash
# Check deployment health
PROJECT_ID=my-project ./verify-deployment.sh

# View backend logs
gcloud run services logs read txai-backend --region us-central1 --limit 50

# Check terraform state
cd ../../infra/terraform/environments/dev
tofu state list
```

## Firebase Authentication for CI/CD

For non-interactive deployments (CI/CD pipelines), you need a Firebase token:

### Getting a Firebase Token

```bash
# Run this once to generate a token
firebase login:ci

# Copy the token that's displayed
# Example: 1//0hV7jLBqUSdwQ...
```

### Using the Token

```bash
# Set as environment variable
export FIREBASE_TOKEN="1//0hV7jLBqUSdwQ..."

# Now deployments work non-interactively
./scripts/gcp/deploy-frontend-firebase.sh

# For CI/CD, store as secret and use:
export FIREBASE_TOKEN="$CI_FIREBASE_TOKEN"
```

### Security Note

- Never commit tokens to git
- Store in CI/CD secrets (GitHub Secrets, GitLab Variables, etc.)
- Rotate tokens periodically

## Environment Variables

### first-time-deploy.sh
- `PROJECT_ID` *(required)*: GCP project ID
- `GITHUB_OWNER` *(required)*: GitHub username/org
- `GITHUB_REPO` *(required)*: Repository name
- `REGION` *(optional)*: GCP region (default: us-central1)
- `SKIP_BOOTSTRAP` *(optional)*: Skip bootstrap step (default: false)
- `TF_STATE_BUCKET` *(optional)*: State bucket (if bootstrap already done)

### bootstrap.sh
- `PROJECT_ID` *(required)*: GCP project ID
- `GITHUB_OWNER` *(required)*: GitHub username/org
- `GITHUB_REPO` *(required)*: Repository name
- `REGION` *(optional)*: GCP region (default: us-central1)
- `STATE_BUCKET_NAME` *(optional)*: Custom state bucket name

### deploy-all.sh
- `PROJECT_ID` *(required)*: GCP project ID
- `TF_STATE_BUCKET` *(required)*: Terraform state bucket
- `REGION` *(optional)*: GCP region (default: us-central1)
- `ENVIRONMENT_NAME` *(optional)*: Environment name (default: dev)

### deploy-backend.sh
- `PROJECT_ID` *(required)*: GCP project ID
- `REGION` *(optional)*: GCP region (default: us-central1)
- `AR_REPO` *(optional)*: Artifact Registry repo (default: txai-support)
- `IMAGE_NAME` *(optional)*: Docker image name (default: txai-backend)
- `SERVICE_NAME` *(optional)*: Cloud Run service (default: txai-backend)
- `SERVICE_ACCOUNT` *(optional)*: Service account email
- `CORS_ORIGINS` *(optional)*: Comma-separated CORS origins (auto-detected from Firebase if not set)
- `FIREBASE_PROJECT_ID` *(optional)*: For auto-calculating CORS origins
- `TIMEOUT_SECONDS` *(optional)*: Cloud Run request/startup timeout seconds (default: 300)
- `MAX_INSTANCES` *(optional)*: Cloud Run max instances (if unset, leaves current setting)

**Precedence (backend CORS inputs):**
- `CORS_ORIGINS` (explicit input) overrides everything
- else `FIREBASE_PROJECT_ID` is used to derive `https://<id>.web.app,https://<id>.firebaseapp.com`
- else the script does **not** modify CORS at all

### deploy-frontend-firebase.sh
- `API_URL` *(required)*: Backend API URL (e.g., https://backend/api)
- `FIREBASE_TOKEN` *(optional)*: CI token from `firebase login:ci`
- `PREVIEW` *(optional)*: Set to `true` for preview channel deployments

### verify-deployment.sh
- `PROJECT_ID` *(required)*: GCP project ID
- `REGION` *(optional)*: GCP region (default: us-central1)

## Features

All scripts include:
- ✅ Color-coded output for easy reading
- ✅ Prerequisite validation (tools, auth, billing)
- ✅ Comprehensive error messages
- ✅ Progress indicators
- ✅ Automatic .dockerignore creation
- ✅ Health checks and verification
- ✅ Helpful next steps and summaries

## Architecture

The scripts deploy this infrastructure:
```
┌─────────────────────────────────────┐
│  Google Cloud Platform              │
├─────────────────────────────────────┤
│  Frontend (Firebase) → Backend (Run)│
│                     ↓                │
│                  Cloud SQL           │
│                  Uploads (GCS)       │
│                  Artifact Registry   │
└─────────────────────────────────────┘
```

## Documentation

- **Complete Guide**: See `docs/infra/deployment-guide.md`
- **Terraform Docs**: See `docs/infra/terraform.md`
- **Infrastructure Code**: See `infra/terraform/`

## Troubleshooting

### "Billing not enabled"
Enable at: https://console.cloud.google.com/billing

### "Permission denied"
```bash
gcloud auth login
gcloud auth application-default login
```

### "API not enabled"
```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### "Backend health check failing"
Check logs:
```bash
gcloud run services logs read txai-backend --region us-central1 --limit 50
```

### "State bucket not found"
Run bootstrap first:
```bash
PROJECT_ID=x GITHUB_OWNER=y GITHUB_REPO=z ./bootstrap.sh
```

## Cost Estimate

Development environment (~$10-15/month):
- Cloud Run: ~$0 (within free tier)
- Cloud SQL (db-f1-micro): ~$7/month
- Cloud Storage: ~$0.50/month
- Cloud Build: ~$0 (within free tier)
- Artifact Registry: ~$0.10/month

## Support

- **Issues**: Report on GitHub
- **Documentation**: See `docs/` folder
- **Infrastructure**: See `infra/terraform/`

---

**Last Updated**: 2024-12-21
