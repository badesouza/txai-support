locals {
  required_apis = [
    "run.googleapis.com",
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

  cloudsql_enabled      = var.cloudsql_enabled
  database_instance_name = var.database_instance_name != "" ? var.database_instance_name : lower("${var.project_id}-${var.environment_name}-txai-postgres")
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
    "roles/cloudsql.client",
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

resource "random_password" "database" {
  count   = var.cloudsql_enabled && var.database_password == "" ? 1 : 0
  length  = 24
  special = true
}

locals {
  database_password = var.database_password != "" ? var.database_password : (
    var.cloudsql_enabled ? random_password.database[0].result : ""
  )
}

resource "google_sql_database_instance" "main" {
  count            = var.cloudsql_enabled ? 1 : 0
  name             = local.database_instance_name
  project          = var.project_id
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier              = var.database_tier
    disk_size         = var.database_disk_size_gb
    availability_type = var.database_availability_type

    backup_configuration {
      enabled = var.database_backup_enabled
    }

    ip_configuration {
      ipv4_enabled = true
    }
  }

  deletion_protection = false

  depends_on = [google_project_service.apis]
}

resource "google_sql_database" "app" {
  count    = var.cloudsql_enabled ? 1 : 0
  name     = var.database_name
  instance = google_sql_database_instance.main[0].name
}

resource "google_sql_user" "app" {
  count    = var.cloudsql_enabled ? 1 : 0
  name     = var.database_user
  instance = google_sql_database_instance.main[0].name
  password = local.database_password
}

locals {
  cloudsql_connection_name = var.cloudsql_enabled ? google_sql_database_instance.main[0].connection_name : ""
  # URL-encode the database password to handle special characters in connection string
  encoded_database_password = var.cloudsql_enabled ? urlencode(local.database_password) : ""

  # Firebase Hosting URLs for CORS
  firebase_primary_url   = "https://${var.project_id}.web.app"
  firebase_alternate_url = "https://${var.project_id}.firebaseapp.com"

  default_backend_env_vars = var.cloudsql_enabled ? {
    DATABASE_URL   = "postgresql://${var.database_user}:${local.encoded_database_password}@localhost/${var.database_name}?host=/cloudsql/${local.cloudsql_connection_name}"
    STORAGE_DRIVER = "gcs"
    GCS_BUCKET     = google_storage_bucket.uploads.name
    GCS_PROJECT_ID = var.project_id
    # Support both Firebase domains (backend accepts CORS_ORIGINS as CSV)
    CORS_ORIGINS   = "${local.firebase_primary_url},${local.firebase_alternate_url}"
  } : {}
  effective_backend_env_vars = merge(local.default_backend_env_vars, var.backend_env_vars)
}

resource "google_project_iam_member" "runtime_whatsapp_roles" {
  for_each = toset([
    "roles/secretmanager.secretAccessor",
    "roles/cloudsql.client",
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
        timeout_seconds   = 10
        period_seconds    = 10
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

      dynamic "volume_mounts" {
        for_each = var.cloudsql_enabled ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }
    }

    dynamic "volumes" {
      for_each = var.cloudsql_enabled ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [local.cloudsql_connection_name]
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
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
