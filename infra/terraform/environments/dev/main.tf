locals {
  required_apis = [
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "serviceusage.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "storage.googleapis.com",
    "compute.googleapis.com", # For GCE VM option
    "firestore.googleapis.com",
    "firebaserules.googleapis.com",
  ]

  uploads_bucket_name = var.gcs_uploads_bucket_name != "" ? var.gcs_uploads_bucket_name : lower("${var.project_id}-${var.environment_name}-txai-uploads")

  gcs_location = var.gcs_bucket_location != "" ? var.gcs_bucket_location : var.region
}

resource "google_project_service" "apis" {
  for_each = toset(local.required_apis)

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_repo_id
  format        = "DOCKER"
  description   = "txai-support Docker images"

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "ci_deployer" {
  project      = var.project_id
  account_id   = var.service_accounts.ci_deployer
  display_name = "CI Deployer"

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "runtime_api" {
  project      = var.project_id
  account_id   = var.service_accounts.runtime_api
  display_name = "Runtime API"

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "runtime_whatsapp" {
  project      = var.project_id
  account_id   = var.service_accounts.runtime_whatsapp
  display_name = "Runtime WhatsApp"

  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "ci_deployer_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
    "roles/cloudbuild.builds.editor",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.ci_deployer.email}"
}

resource "google_project_iam_member" "runtime_roles" {
  for_each = toset([
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/datastore.user", # For Firestore access
  ])

  project = var.project_id
  role    = each.value

  member = "serviceAccount:${google_service_account.runtime_api.email}"
}

resource "google_service_account_iam_member" "runtime_api_token_creator" {
  service_account_id = google_service_account.runtime_api.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.runtime_api.email}"
}

locals {
  # Firebase Hosting URLs for CORS
  firebase_primary_url   = "https://${var.project_id}.web.app"
  firebase_alternate_url = "https://${var.project_id}.firebaseapp.com"

  # WPPConnect-Server base URL - points to VM
  wppconnect_base_url = "http://${google_compute_address.wppconnect_vm.address}:21465"

  default_backend_env_vars = {
    STORAGE_DRIVER = "gcs"
    GCS_BUCKET     = google_storage_bucket.uploads.name
    GCS_PROJECT_ID = var.project_id
    # Backend Firebase initialization depends on GCP_PROJECT_ID/FIREBASE_PROJECT_ID.
    GCP_PROJECT_ID      = var.project_id
    FIREBASE_PROJECT_ID = var.project_id
    # WhatsApp uses WPPConnect-Server VM
    WHATSAPP_DRIVER           = "server"
    WPPCONNECT_BASE_URL       = local.wppconnect_base_url
    WPPCONNECT_SESSION        = var.wppconnect_session
    WPPCONNECT_SECRET_KEY     = var.wppconnect_secret_key
    WPPCONNECT_WEBHOOK_SECRET = var.wppconnect_webhook_secret
    # Support both Firebase domains (backend accepts CORS_ORIGINS as CSV)
    CORS_ORIGINS = "${local.firebase_primary_url},${local.firebase_alternate_url}"
  }

  # Redis configuration for WPPConnect session storage
  redis_env_vars = var.redis_enabled ? {
    WHATSAPP_TOKEN_STORE = "redis"
  } : {}

  effective_backend_env_vars = merge(local.default_backend_env_vars, local.redis_env_vars, var.backend_env_vars)
}

resource "google_project_iam_member" "runtime_whatsapp_roles" {
  for_each = toset([
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])

  project = var.project_id
  role    = each.value

  member = "serviceAccount:${google_service_account.runtime_whatsapp.email}"
}

resource "google_storage_bucket" "uploads" {
  name                        = local.uploads_bucket_name
  location                    = local.gcs_location
  uniform_bucket_level_access = true
  force_destroy               = false

  depends_on = [google_project_service.apis]
}

# =============================================================================
# GCS Bucket for WPPConnect-Server userDataDir (DISABLED - using /tmp instead)
# =============================================================================
# Note: We're using ephemeral /tmp storage instead of GCS FUSE for reliability.
# Sessions are lost on cold starts, but this avoids GCS FUSE issues with Chrome.
# To re-enable persistent storage, consider using a VM with local SSD instead.

# =============================================================================
# Firestore Database (Native Mode)
# =============================================================================
resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"

  # Enable delete protection in production
  delete_protection_state = var.environment_name == "prod" ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"

  depends_on = [google_project_service.apis]
}

# =============================================================================
# WPPConnect-Server is now deployed as a VM (see wppconnect-vm.tf)
# =============================================================================
# The Cloud Run deployment was removed due to Chrome/Puppeteer stability issues.
# VMs provide persistent storage and better Chrome compatibility.

# =============================================================================
# Backend Cloud Run Service
# =============================================================================
resource "google_cloud_run_v2_service" "backend" {
  name                = var.backend_service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.runtime_api.email
    timeout         = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.backend_image
      ports {
        container_port = var.backend_container_port
      }

      startup_probe {
        timeout_seconds   = 10
        period_seconds    = 10
        failure_threshold = 30
        tcp_socket {
          port = var.backend_container_port
        }
      }

      dynamic "env" {
        for_each = local.effective_backend_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Redis URL from Secret Manager (for WPPConnect session storage)
      dynamic "env" {
        for_each = var.redis_enabled ? [1] : []
        content {
          name = "REDIS_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.redis_url[0].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    # We deploy the image and some runtime env vars via scripts (Cloud Build + gcloud run services update).
    # If Terraform keeps managing env blocks, it can clobber script-updated vars (e.g. PUBLIC_BASE_URL).
    ignore_changes = [
      template[0].containers[0].image,
      template[0].containers[0].env,
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_compute_address.wppconnect_vm, # Backend needs wppconnect VM IP (address, not instance)
  ]
}

resource "google_cloud_run_v2_service_iam_member" "backend_invoker" {
  count    = var.backend_allow_unauthenticated ? 1 : 0
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# =============================================================================
# Sync WPPConnect VM IP to Backend (automated)
# =============================================================================
# This ensures the backend always has the correct WPPCONNECT_BASE_URL
# even though env vars are in ignore_changes (for deploy script compatibility).
# Triggers whenever the VM IP changes.
resource "null_resource" "sync_wppconnect_url_to_backend" {
  triggers = {
    wppconnect_ip   = google_compute_address.wppconnect_vm.address
    backend_service = google_cloud_run_v2_service.backend.name
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Syncing WPPCONNECT_BASE_URL to backend..."
      gcloud run services update ${google_cloud_run_v2_service.backend.name} \
        --region=${var.region} \
        --project=${var.project_id} \
        --update-env-vars="WPPCONNECT_BASE_URL=http://${google_compute_address.wppconnect_vm.address}:21465"
      echo "✅ Backend updated with WPPCONNECT_BASE_URL=http://${google_compute_address.wppconnect_vm.address}:21465"
    EOT
  }

  depends_on = [
    google_cloud_run_v2_service.backend,
    google_compute_instance.wppconnect,
  ]
}
