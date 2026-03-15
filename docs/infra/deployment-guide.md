# GCP Deployment Guide

Deploy TXAI Support to Google Cloud Platform.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         GCP Infrastructure                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐ │
│  │   Firebase   │───▶│  Cloud Run   │───▶│   WPPConnect VM      │ │
│  │   Hosting    │    │   Backend    │    │   (GCE e2-small)     │ │
│  └──────────────┘    └──────────────┘    └──────────────────────┘ │
│         │                   │                      │               │
│         │            ┌──────┴──────┐               │               │
│         │            ▼             ▼               ▼               │
│         │      ┌──────────┐                 ┌──────────────┐      │
│         │      │Firestore │                 │ Persistent   │      │
│         │      │          │                 │ SSD Disk     │      │
│         │      └──────────┘                 └──────────────┘      │
│         │            │                                             │
│         │            ▼                                             │
│         │      ┌──────────┐                                        │
│         │      │  Cloud   │                                        │
│         └─────▶│ Storage  │                                        │
│                └──────────┘                                        │
└────────────────────────────────────────────────────────────────────┘
```

## Cost Estimate

| Service | Monthly Cost |
|---------|--------------|
| Firebase Hosting | Free |
| Cloud Run | ~$0-5 |
| **WPPConnect VM** | ~$5-7 |
| Cloud Firestore | ~$0-2 |
| Cloud Storage | ~$0.02 |
| **Total** | **~$5-14/month** |

## Prerequisites

```bash
# Install tools
brew install google-cloud-sdk opentofu node
npm install -g firebase-tools

# Authenticate
gcloud auth login
gcloud auth application-default login
firebase login
```

## First-Time Deploy

```bash
# Set variables
export PROJECT_ID=your-project-id
export REGION=us-central1

# Run first-time deploy
./scripts/gcp/first-time-deploy.sh
```

This will:
1. ✅ Create Terraform state bucket
2. ✅ Deploy infrastructure (Firestore, GCS, service accounts)
3. ✅ Create WPPConnect VM with static IP
4. ✅ Deploy backend to Cloud Run
5. ✅ Auto-sync VM IP to backend
6. ✅ Deploy frontend to Firebase

**Time:** ~15-20 minutes

## Day-to-Day Deploys

```bash
# Full deploy (infra + backend)
./scripts/gcp/deploy-all.sh

# Backend only
./scripts/gcp/deploy-backend.sh

# Frontend only
./scripts/gcp/deploy-frontend-firebase.sh

# Infrastructure changes
cd infra/terraform/environments/dev
tofu apply
```

## CI Handoff

Once the bootstrap values are stored in GitHub Actions secrets, GitHub can take over day-to-day deploy responsibility from a local machine.

```bash
# Shared backend for local + CI
TF_STATE_BUCKET=your-project-tfstate
TF_STATE_PREFIX=txai-support/dev
```

Before relying on CI as the primary deploy path:

1. Confirm local OpenTofu is already using `gs://$TF_STATE_BUCKET/txai-support/dev/default.tfstate`.
2. Back up the current state once with `tofu state pull`.
3. Add `GCP_WIF_PROVIDER`, `GCP_TF_SERVICE_ACCOUNT`, `TF_STATE_BUCKET`, and `FIREBASE_TOKEN` to GitHub Actions secrets.
4. Add `GCP_PROJECT_ID` to the `dev` GitHub environment.
5. Trigger `deploy.yml` with `components=infra` and confirm it can read outputs from the shared state.

## Post-Deploy: Set Secrets

```bash
# JWT Secret
gcloud run services update txai-backend --region us-central1 \
  --update-env-vars JWT_SECRET="$(openssl rand -base64 32)"

# Admin Password
gcloud run services update txai-backend --region us-central1 \
  --update-env-vars ADMIN_DEFAULT_PASSWORD="your-secure-password"
```

## WPPConnect VM Management

```bash
# SSH to VM
gcloud compute ssh wppconnect-server --zone=us-central1-a

# View logs
gcloud compute ssh wppconnect-server --zone=us-central1-a \
  --command="sudo docker logs -f wppconnect-server"

# Restart WPPConnect
gcloud compute ssh wppconnect-server --zone=us-central1-a \
  --command="sudo docker restart wppconnect-server"
```

## Terraform Automation

The WPPConnect VM IP is **automatically synced** to the backend:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Terraform Apply                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. google_compute_address    ──▶  Static IP reserved          │
│                                                                 │
│  2. google_compute_instance   ──▶  VM created with IP          │
│                                                                 │
│  3. google_cloud_run_service  ──▶  Backend deployed            │
│                                                                 │
│  4. null_resource.sync_*      ──▶  Backend updated with:       │
│                                    WPPCONNECT_BASE_URL=         │
│                                    http://<VM-IP>:21465         │
│                                                                 │
│  ✅ No manual steps needed!                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Verification

```bash
# Get outputs
cd infra/terraform/environments/dev
tofu output

# Test backend
curl $(tofu output -raw backend_cloud_run_url)/api/health

# Test WPPConnect
curl $(tofu output -raw wppconnect_vm_url)/api/health
```

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `first-time-deploy.sh` | Initial setup |
| `deploy-all.sh` | Full deploy |
| `deploy-backend.sh` | Backend only |
| `deploy-frontend-firebase.sh` | Frontend only |

## See Also

- [Local vs Cloud](../architecture/LOCAL_VS_CLOUD.md)
- [Terraform Reference](terraform.md)
- [Infrastructure Destruction Guide](../deployment/DESTRUCTION_GUIDE.md)
- [Troubleshooting](../troubleshooting.md)
