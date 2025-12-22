variable "project_id" {
  type        = string
  description = "GCP project id"
}

variable "region" {
  type        = string
  description = "Default region"
  default     = "us-central1"
}

variable "environment_name" {
  type        = string
  description = "Environment name used for naming resources"
  default     = "dev"
}

variable "artifact_repo_id" {
  type        = string
  description = "Artifact Registry repository id"
  default     = "txai-support"
}

variable "gcs_uploads_bucket_name" {
  type        = string
  description = "Optional explicit bucket name for private uploads"
  default     = ""
}

variable "gcs_bucket_location" {
  type        = string
  description = "GCS bucket location (defaults to region)"
  default     = ""
}

variable "backend_service_name" {
  type        = string
  description = "Cloud Run service name for backend API"
  default     = "txai-backend"
}

variable "backend_container_port" {
  type        = number
  description = "Container port for backend API"
  default     = 3001
}

variable "backend_image" {
  type        = string
  description = "Container image for initial Cloud Run service"
  default     = "gcr.io/cloudrun/hello"
}

variable "backend_allow_unauthenticated" {
  type        = bool
  description = "Allow unauthenticated invocations on the backend service"
  default     = true
}

variable "backend_env_vars" {
  type        = map(string)
  description = "Environment variables injected into the backend service"
  default     = {}
}

variable "cloudsql_enabled" {
  type        = bool
  description = "Whether to provision Cloud SQL (Postgres)"
  default     = true
}

variable "database_instance_name" {
  type        = string
  description = "Cloud SQL instance name"
  default     = ""
}

variable "database_name" {
  type        = string
  description = "Postgres database name"
  default     = "txai_support"
}

variable "database_user" {
  type        = string
  description = "Postgres username"
  default     = "txai"
}

variable "database_password" {
  type        = string
  description = "Postgres password (leave empty to auto-generate)"
  default     = ""
  sensitive   = true
}

variable "database_tier" {
  type        = string
  description = "Cloud SQL machine tier"
  default     = "db-f1-micro"
}

variable "database_disk_size_gb" {
  type        = number
  description = "Cloud SQL disk size in GB"
  default     = 10
}

variable "database_availability_type" {
  type        = string
  description = "Cloud SQL availability type (ZONAL or REGIONAL)"
  default     = "ZONAL"
}

variable "database_backup_enabled" {
  type        = bool
  description = "Enable automated backups"
  default     = true
}

variable "service_accounts" {
  type = object({
    ci_deployer      = string
    runtime_api      = string
    runtime_whatsapp = string
  })

  description = "Service account ids (account_id, not email)"
  default = {
    ci_deployer      = "ci-deployer"
    runtime_api      = "runtime-api"
    runtime_whatsapp = "runtime-whatsapp"
  }
}
