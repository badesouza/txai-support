output "artifact_repo" {
  value       = google_artifact_registry_repository.docker.name
  description = "Artifact Registry repo resource name"
}

output "artifact_repo_url" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
  description = "Base repo URL for docker images"
}

output "firebase_hosting_url" {
  value       = "https://${var.project_id}.web.app"
  description = "Firebase Hosting primary URL"
}

output "firebase_alternate_url" {
  value       = "https://${var.project_id}.firebaseapp.com"
  description = "Firebase Hosting alternate URL"
}

output "uploads_bucket_name" {
  value       = google_storage_bucket.uploads.name
  description = "Private GCS bucket for uploads"
}

output "uploads_bucket_uri" {
  value       = "gs://${google_storage_bucket.uploads.name}"
  description = "GCS URI for uploads bucket"
}

output "backend_cloud_run_url" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "Cloud Run URL for backend API"
}

output "backend_service_name" {
  value       = google_cloud_run_v2_service.backend.name
  description = "Cloud Run service name for backend API"
}

output "wppconnect_static_ip" {
  value       = google_compute_address.wppconnect_ip.address
  description = "Static external IP for WPPConnect-Server VM"
}

output "wppconnect_base_url" {
  value       = "http://${google_compute_address.wppconnect_ip.address}:${var.wppconnect_container_port}"
  description = "Base URL for WPPConnect-Server VM"
}

output "ci_deployer_email" {
  value = google_service_account.ci_deployer.email
}

output "runtime_api_email" {
  value = google_service_account.runtime_api.email
}

output "runtime_whatsapp_email" {
  value = google_service_account.runtime_whatsapp.email
}

# =============================================================================
# Redis Cloud Outputs
# =============================================================================

output "redis_enabled" {
  value       = var.redis_enabled
  description = "Whether Redis Cloud is enabled"
}

output "redis_subscription_id" {
  value       = var.redis_enabled ? rediscloud_essentials_subscription.main[0].id : ""
  description = "Redis Cloud Essentials subscription ID"
}

output "redis_database_id" {
  value       = var.redis_enabled ? rediscloud_essentials_database.sessions[0].id : ""
  description = "Redis Cloud Essentials database ID"
}

output "redis_secret_id" {
  value       = var.redis_enabled ? google_secret_manager_secret.redis_url[0].secret_id : ""
  description = "Secret Manager secret ID for Redis URL"
}

output "wppconnect_config_secret_id" {
  value       = google_secret_manager_secret.wppconnect_config.secret_id
  description = "Secret Manager secret ID for WPPConnect-Server config"
}
