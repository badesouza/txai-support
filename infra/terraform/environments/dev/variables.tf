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

# =============================================================================
# Firestore Configuration
# =============================================================================

variable "firestore_location" {
  type        = string
  description = "Firestore database location (should match region for latency)"
  default     = "nam5" # US multi-region - use "us-central" for single region
}

# =============================================================================
# Redis Cloud Configuration (for WPPConnect session storage)
# =============================================================================

variable "redis_cloud_api_key" {
  type        = string
  description = "Redis Cloud API key"
  sensitive   = true
}

variable "redis_cloud_secret_key" {
  type        = string
  description = "Redis Cloud secret key"
  sensitive   = true
}

variable "redis_enabled" {
  type        = bool
  description = "Whether to provision Redis Cloud for session storage"
  default     = true
}

variable "redis_subscription_name" {
  type        = string
  description = "Redis Cloud subscription name"
  default     = "txai-support-dev"
}

variable "redis_database_name" {
  type        = string
  description = "Redis Cloud database name"
  default     = "sessions"
}

variable "redis_memory_mb" {
  type        = number
  description = "Redis database memory limit in MB (free tier: 30MB)"
  default     = 30
}

# Note: Redis Cloud free tier only supports AWS us-east-1
# This is hardcoded in redis-cloud.tf for simplicity
