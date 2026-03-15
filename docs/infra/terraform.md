# Terraform (OpenTofu)

Infrastructure as Code for GCP using OpenTofu (Terraform-compatible).

## Architecture

```
infra/terraform/
├── bootstrap/              # One-time setup (run locally)
│   └── main.tf             # - GCS bucket for state
│                           # - GitHub OIDC (WIF)
│                           # - tf-admin service account
│
└── environments/
    └── dev/
        ├── main.tf         # Cloud Run, GCS, Firestore, DNS
        ├── wppconnect-vm.tf # GCE VM for WPPConnect
        ├── variables.tf    # Input variables
        ├── outputs.tf      # Exported values
        └── scripts/
            └── wppconnect-vm-startup.sh
```

## Resources Created

```
┌─────────────────────────────────────────────────────────────────┐
│                    Terraform Resources                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cloud Run                                                      │
│  └─ txai-backend          (serverless API)                     │
│                                                                 │
│  Compute Engine                                                 │
│  ├─ wppconnect-server     (VM: e2-small, 1 vCPU, 2GB)         │
│  ├─ wppconnect-server-ip  (Static external IP)                 │
│  ├─ wppconnect-server-data (Persistent SSD disk)               │
│  └─ wppconnect-server-allow-api (Firewall: 21465, 22)          │
│                                                                 │
│  Storage                                                        │
│  └─ uploads bucket        (private, signed URLs)               │
│                                                                 │
│  Firestore                                                      │
│  └─ (default) database    (native mode)                        │
│                                                                 │
│  Service Accounts                                               │
│  ├─ ci-deployer           (Cloud Build, Artifact Registry)     │
│  ├─ runtime-api           (Backend: Firestore, GCS, Secrets)   │
│  └─ runtime-whatsapp      (WPPConnect VM)                      │
│                                                                 │
│  Automation                                                     │
│  └─ null_resource         (Syncs VM IP → Backend env var)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Bootstrap (one-time, local)

```bash
cd infra/terraform/bootstrap
tofu init
tofu apply \
  -var="project_id=your-project" \
  -var="region=us-central1" \
  -var="github_owner=your-username" \
  -var="github_repo=your-repo"
```

### Deploy Environment

```bash
cd infra/terraform/environments/dev

# Create terraform.tfvars from example
cp terraform.tfvars.example terraform.tfvars
# Edit with your values

# Initialize and apply
tofu init
tofu apply
```

Or use the deploy script:
```bash
./scripts/gcp/deploy-all.sh
```

## Key Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `project_id` | GCP project ID | Yes |
| `region` | GCP region | Yes |
| `environment_name` | Environment (dev/prod) | Yes |
| `wppconnect_secret_key` | WPPConnect API secret | Yes |
| `wppconnect_webhook_secret` | Webhook auth token | Yes |

## Outputs

| Output | Description |
|--------|-------------|
| `backend_cloud_run_url` | Backend API URL |
| `wppconnect_vm_ip` | WPPConnect VM static IP |
| `wppconnect_vm_url` | WPPConnect API URL |
| `wppconnect_vm_ssh` | SSH command to VM |
| `firebase_hosting_url` | Frontend URL |
| `uploads_bucket_name` | GCS bucket name |

## WPPConnect VM Auto-Sync

The backend's `WPPCONNECT_BASE_URL` is **automatically updated** when the VM IP changes:

```hcl
resource "null_resource" "sync_wppconnect_url_to_backend" {
  triggers = {
    wppconnect_ip = google_compute_address.wppconnect_vm.address
  }

  provisioner "local-exec" {
    command = <<-EOT
      gcloud run services update txai-backend \
        --update-env-vars="WPPCONNECT_BASE_URL=http://${VM_IP}:21465"
    EOT
  }
}
```

## Environment Files

```
infra/
└── .env.local              # Terraform deployment settings (not committed)
```

## Remote State

The `dev` environment uses a GCS backend declared in `infra/terraform/environments/dev/versions.tf`.
Local scripts and GitHub Actions must both initialize OpenTofu with the same backend prefix:

```bash
tofu init \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="prefix=txai-support/dev"
```

If CI uses a different prefix, it will read a different state snapshot and may try to recreate existing infrastructure.

## Commands

```bash
# Plan changes
tofu plan

# Apply changes
tofu apply

# Destroy (careful!)
tofu destroy

# Show outputs
tofu output

# Format code
tofu fmt -recursive
```

## See Also

- [Deployment Guide](deployment-guide.md)
- [Local vs Cloud](../architecture/LOCAL_VS_CLOUD.md)
