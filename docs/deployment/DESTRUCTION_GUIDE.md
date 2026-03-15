# Infrastructure Destruction Guide

Complete guide for destroying all GCP infrastructure managed by Terraform.

⚠️ **WARNING: This is irreversible. Destruction will delete all cloud resources including databases and storage.**

## Overview

This repository contains two destroy scripts:
- **Bash**: `scripts/gcp/destroy-all.sh` (macOS/Linux)
- **PowerShell**: `scripts/gcp/destroy-all.ps1` (Windows)

### What Gets Destroyed

✗ Cloud Run backend service  
✗ Compute Engine VM (`wppconnect-server`)  
✗ Firestore database  
✗ Service accounts and secrets  
✗ Artifact Registry  
✗ GCS uploads bucket (with manual cleanup)  

### What Remains (Protected)

The following require **manual deletion** due to protection mechanisms:
- **State Bucket** (`{project_id}-tfstate`) - Kept for recovery unless explicitly deleted
- **Static IP Address** - Must be manually deleted
- **Firewall rules** - May need manual cleanup

---

## Prerequisites

### Required Tools

- **gcloud CLI** - Google Cloud SDK
  ```bash
  # macOS
  brew install google-cloud-sdk
  # or download: https://cloud.google.com/sdk/docs/install
  ```

- **OpenTofu** (Terraform-compatible)
  ```bash
  brew install opentofu
  ```

- **gsutil** - Google Cloud Storage utilities
  ```bash
  gcloud components install gsutil
  ```

### Authentication

1. **Login to Google Cloud**
   ```bash
   gcloud auth login
   ```

2. **Verify authentication**
   ```bash
   gcloud auth list
   ```

---

## Usage

### Option 1: Using Bash (macOS/Linux)

#### Basic Destruction
```bash
cd /path/to/txai-support
PROJECT_ID=your-project-id \
TF_STATE_BUCKET=your-tfstate-bucket \
./scripts/gcp/destroy-all.sh
```

#### With Environment File
Create `.env.local` in the repo root:
```bash
PROJECT_ID=my-project
TF_STATE_BUCKET=my-project-tfstate
ENVIRONMENT_NAME=dev
REGION=us-central1
```

Then run:
```bash
./scripts/gcp/destroy-all.sh
```

#### Destroy State Bucket Too
```bash
DESTROY_STATE_BUCKET=true ./scripts/gcp/destroy-all.sh
```

### Option 2: Using PowerShell (Windows)

#### Basic Destruction
```powershell
cd C:\path\to\txai-support
$env:PROJECT_ID = "your-project-id"
$env:TF_STATE_BUCKET = "your-tfstate-bucket"
.\scripts\gcp\destroy-all.ps1
```

#### With Parameters
```powershell
.\scripts\gcp\destroy-all.ps1 -DestroyStateBegin -SkipConfirmation
```

Parameters:
- `-DestroyStateBegin` - Also destroy the state bucket
- `-SkipConfirmation` - Skip interactive prompts (use with caution!)

---

## Destruction Flow

### Step 1: Environment Setup & Validation

The script will:
1. Load environment variables from `.env.local` and `infra/.env.local`
2. Validate required configuration
3. Check all prerequisites (gcloud, tofu, gsutil)
4. Verify GCP authentication

### Step 2: Display Configuration & Confirm

```
Configuration:
  Project ID:       my-project
  Environment:      dev
  Region:           us-central1
  State Bucket:     my-project-tfstate
  Uploads Bucket:   my-project-uploads

Type 'destroy' to continue:
```

**Type exactly `destroy` to proceed.**

### Step 3: Plan Infrastructure Destruction

The script generates a Terraform destruction plan showing:
- What resources will be deleted
- Resource dependencies
- Estimated impact

Review the plan carefully before proceeding.

### Step 4: Execute Destruction

After confirming with `yes`, the script will:

1. **Destroy Terraform resources**
   - Cloud Run services
   - Compute Engine resources
   - Firestore (if not protected)
   - Service accounts
   - Secrets
   - All other managed infrastructure

2. **Handle Protected GCS Buckets**
   - Empty the uploads bucket
   - Attempt deletion (may fail if protection is active)
   - Provide manual cleanup commands if needed

3. **Optional: Destroy Bootstrap**
   - GitHub OIDC configuration
   - Terraform admin service account
   - (State bucket remains unless `DESTROY_STATE_BUCKET=true`)

### Step 5: Manual Cleanup

Some resources require manual deletion:

#### Clean Up Static IP Address
```bash
gcloud compute addresses list --project=your-project-id
gcloud compute addresses delete wppconnect-ip --project=your-project-id
```

#### Clean Up Firewall Rules
```bash
gcloud compute firewall-rules list --project=your-project-id
gcloud compute firewall-rules delete {rule-name} --project=your-project-id
```

#### Destroy State Bucket (Optional)
```bash
# List contents
gsutil ls -r gs://my-project-tfstate/

# Delete all objects
gsutil -m rm -r gs://my-project-tfstate/*

# Delete the bucket
gcloud storage buckets delete gs://my-project-tfstate
```

---

## Safeguards & Protections

### Double Confirmation

The script requires explicit confirmation at multiple stages:

1. **Initial confirmation**: Type `destroy`
2. **For non-dev environments**: Type `destroy-{environment}`
3. **Before applying plan**: Type `yes`
4. **For bootstrap destruction**: Separate confirmation

### Terraform State

- **State backed up in GCS** - Versioning enabled
- **State protected** - `force_destroy = false`
- **Manual cleanup only** - Unless explicitly enabled

### Protected Buckets

Both state and uploads buckets have `force_destroy = false`:
```bash
# Terraform cannot delete them directly
# Emptying required before deletion
```

---

## Troubleshooting

### Error: "State bucket not found"

Ensure you're using the correct bucket name:
```bash
gcloud storage buckets list --project=your-project-id
```

### Error: "Bucket not empty"

GCS requires buckets to be empty before deletion:
```bash
# Empty all objects
gsutil -m rm -r gs://bucket-name/*

# For buckets with retention policy
gcloud storage buckets update gs://bucket-name --clear-retention-policy
gsutil -m rm -r gs://bucket-name/*
```

### Error: "Resource in use"

Some resources may have dependencies. Check GCP Console:
```bash
gcloud compute resources list --project=your-project-id
```

### Manual Cleanup Checklist

If the script fails partway through:

```bash
# 1. Check Terraform state
cd infra/terraform/environments/dev
tofu state list

# 2. Check remaining resources
gcloud compute instances list --project=PROJECT_ID
gcloud run services list --project=PROJECT_ID

# 3. Force destroy specific resources
gcloud compute instances delete wppconnect-server --project=PROJECT_ID

# 4. Empty buckets
gsutil -m rm -r gs://bucket-name/*

# 5. Delete buckets
gcloud storage buckets delete gs://bucket-name
```

---

## Recovery

### Restore from State Backup

If you destroyed resources accidentally, the state bucket has versioning enabled:

```bash
# List state versions
gsutil ls -L gs://my-project-tfstate/txai-support/dev/

# Restore previous version
gsutil cp gs://my-project-tfstate/txai-support/dev/terraform.tfstate.v2 terraform.tfstate

# Reapply infrastructure
tofu apply
```

### Restore from Git

All infrastructure code is in the repository:

```bash
git log --oneline infra/terraform/
git show <commit>:infra/terraform/environments/dev/main.tf
```

---

## Cost Implications

### Before Destruction
- **Monthly cost**: ~$10-15 USD
  - Cloud Run: ~$5
  - Compute Engine: ~$5-7
  - Firestore: ~$1-2
  - Other: ~$1

### After Destruction
- **Monthly cost**: ~$0.50 USD (storage only if state bucket retained)

**Savings**: ~$10-15 per month

---

## Advanced Options

### Destroy Specific Environment

```bash
ENVIRONMENT_NAME=staging ./scripts/gcp/destroy-all.sh
```

### Destroy with Different Region

```bash
REGION=europe-west1 ./scripts/gcp/destroy-all.sh
```

### Full Destruction (Include State)

```bash
# Bash
DESTROY_STATE_BUCKET=true ./scripts/gcp/destroy-all.sh

# PowerShell
.\scripts\gcp\destroy-all.ps1 -DestroyStateBegin
```

---

## See Also

- [Deployment Guide](../infra/deployment-guide.md)
- [Terraform Documentation](../infra/terraform.md)
- [Bootstrap Instructions](GITHUB_SECRETS.md)
- [LOCAL_VS_CLOUD Architecture](../architecture/LOCAL_VS_CLOUD.md)

---

## Questions?

Refer to the deployment guide for infrastructure details:
- [Deployment Architecture](../infra/deployment-guide.md)
- [Terraform Modules](../infra/terraform.md)
- [Environment Variables](GITHUB_SECRETS.md)
