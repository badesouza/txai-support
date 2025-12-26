locals {
  required_apis = [
    "run.googleapis.com",
    "compute.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "sqladmin.googleapis.com",
    "iam.googleapis.com",
    "serviceusage.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "apigateway.googleapis.com",
    "cloudfunctions.googleapis.com",
    "storage.googleapis.com",
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

  # WPPConnect-Server config (mirrors repo's wppconnect/config.json defaults,
  # with browserArgs needed for running Chromium inside Cloud Run).
  wppconnect_config_json = jsonencode({
    secretKey          = var.wppconnect_secret_key
    host               = "http://localhost"
    port               = tostring(var.wppconnect_container_port)
    customUserDataDir  = "./userDataDir/"
    startAllSession    = true
    maxListeners       = 15
    webhook            = {
      url             = null
      autoDownload    = false
      readMessage     = false
      allUnreadOnStart = true
    }
    archive            = {
      enable        = false
      waitTime      = 10
      diasToArchive = 45
    }
    log                = {
      level  = "error"
      logger = ["console"]
    }
    createOptions       = {
      autoClose   = 120000
      browserArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    }
  })

  # WPPConnect-Server base URL (now hosted on a persistent VM with a static IP).
  wppconnect_base_url = "http://${google_compute_address.wppconnect_ip.address}:${var.wppconnect_container_port}"

  default_backend_env_vars = {
    STORAGE_DRIVER = "gcs"
    GCS_BUCKET     = google_storage_bucket.uploads.name
    GCS_PROJECT_ID = var.project_id
    # Backend Firebase initialization depends on GCP_PROJECT_ID/FIREBASE_PROJECT_ID.
    # If missing it falls back to "local-dev" and fails in Cloud Run.
    GCP_PROJECT_ID      = var.project_id
    FIREBASE_PROJECT_ID = var.project_id
    # WhatsApp uses WPPConnect-Server in Cloud Run (no Puppeteer/Chromium in backend).
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

resource "google_secret_manager_secret" "wppconnect_config" {
  project   = var.project_id
  secret_id = "wppconnect-config-${var.environment_name}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "wppconnect_config" {
  secret      = google_secret_manager_secret.wppconnect_config.id
  secret_data = local.wppconnect_config_json
}

resource "google_cloud_run_v2_service" "backend" {
  name     = var.backend_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.runtime_api.email
    timeout         = "300s"

    scaling {
      max_instance_count = 10
    }

    containers {
      image = var.backend_image
      ports {
        container_port = var.backend_container_port
      }

      startup_probe {
        timeout_seconds = 10
        period_seconds  = 10
        # Allow up to ~5 minutes for cold start + migrations + seed before failing startup
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

  depends_on = [google_project_service.apis]
}

resource "google_cloud_run_v2_service_iam_member" "backend_invoker" {
  count    = var.backend_allow_unauthenticated ? 1 : 0
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
