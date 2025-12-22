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

output "backend_database_url" {
  value       = var.cloudsql_enabled ? local.default_backend_env_vars.DATABASE_URL : ""
  description = "DATABASE_URL for Cloud Run (Cloud SQL socket)"
  sensitive   = true
}

output "cloudsql_instance_connection_name" {
  value       = var.cloudsql_enabled ? google_sql_database_instance.main[0].connection_name : ""
  description = "Cloud SQL instance connection name"
}

output "cloudsql_database_name" {
  value       = var.cloudsql_enabled ? google_sql_database.app[0].name : ""
  description = "Cloud SQL database name"
}

output "cloudsql_database_user" {
  value       = var.cloudsql_enabled ? google_sql_user.app[0].name : ""
  description = "Cloud SQL database user"
}

output "cloudsql_database_password" {
  value       = var.cloudsql_enabled ? local.database_password : ""
  description = "Cloud SQL database password"
  sensitive   = true
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
