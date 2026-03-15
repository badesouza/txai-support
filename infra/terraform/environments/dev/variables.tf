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

variable "wppconnect_artifact_repo_id" {
  type        = string
  description = "Artifact Registry repository id for custom WPPConnect images"
  default     = "wppconnect-images"
}

variable "domain_name" {
  type        = string
  description = "Root domain used for public endpoints"
  default     = "tazco-platform.com"
}

variable "wpp_subdomain" {
  type        = string
  description = "Subdomain used by WPPConnect (VM + Caddy)"
  default     = "bizybox-dev"
}

variable "backend_subdomain" {
  type        = string
  description = "Subdomain used by Cloud Run backend API"
  default     = "api.bizybox-dev"
}

variable "backend_custom_domain_enabled" {
  type        = bool
  description = "Whether to create Cloud Run backend custom domain mapping"
  default     = true
}

variable "manage_dns_records" {
  type        = bool
  description = "Whether Terraform should create Cloud DNS records"
  default     = true
}

variable "dns_project_id" {
  type        = string
  description = "Project that owns the Cloud DNS managed zone"
  default     = "tazco-platform-gcp-project-dev"
}

variable "cloud_dns_zone_name" {
  type        = string
  description = "Existing Cloud DNS managed zone name when manage_dns_records=true"
  default     = "tazco-platform-com"
}

variable "backend_custom_domain_dns_target" {
  type        = string
  description = "DNS target for backend custom domain (CNAME for subdomains)"
  default     = "ghs.googlehosted.com."
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
  # Cloud Run default port is 8080. The backend honors process.env.PORT, so
  # using 8080 avoids failures when the initial placeholder image is deployed.
  default = 8080
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

# =============================================================================
# WPPConnect-Server Cloud Run Configuration
# =============================================================================

variable "wppconnect_service_name" {
  type        = string
  description = "Cloud Run service name for WPPConnect-Server"
  default     = "txai-wppconnect-server"
}

variable "wppconnect_container_port" {
  type        = number
  description = "Container port for WPPConnect-Server"
  default     = 21465
}

variable "wppconnect_image" {
  type        = string
  description = "Container image for WPPConnect-Server VM runtime (override for pinned digests)"
  default     = ""
}

variable "wppconnect_allow_unauthenticated" {
  type        = bool
  description = "Allow unauthenticated invocations on the WPPConnect-Server service"
  default     = true
}

variable "wppconnect_session" {
  type        = string
  description = "WPPConnect-Server session name"
  default     = "txai-whatsapp"
}

variable "wppconnect_secret_key" {
  type        = string
  description = "WPPConnect-Server secret key used to generate tokens"
  default     = "THISISMYSECURETOKEN"
  sensitive   = true
}

variable "wppconnect_webhook_secret" {
  type        = string
  description = "Shared secret for backend webhook receiver (query token / header)"
  default     = "txai-webhook-secret"
  sensitive   = true
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

