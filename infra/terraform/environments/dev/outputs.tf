output "artifact_repo" {
  value       = google_artifact_registry_repository.docker.name
  description = "Artifact Registry repo resource name"
}

output "artifact_repo_url" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
  description = "Base repo URL for docker images"
}

output "wppconnect_artifact_repo_url" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.wppconnect_docker.repository_id}"
  description = "Base repo URL for WPPConnect custom docker images"
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

# =============================================================================
# Backend Cloud Run
# =============================================================================
output "backend_cloud_run_url" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "Cloud Run URL for backend API"
}

output "backend_public_url" {
  value       = local.backend_public_base_url
  description = "Backend public URL via custom domain"
}

output "backend_service_name" {
  value       = google_cloud_run_v2_service.backend.name
  description = "Cloud Run service name for backend API"
}

# =============================================================================
# WPPConnect-Server VM
# =============================================================================
# Note: wppconnect_vm_ip, wppconnect_vm_url, wppconnect_vm_ssh are in wppconnect-vm.tf

output "wppconnect_base_url" {
  value       = local.wppconnect_base_url
  description = "WPPConnect base URL through VM Caddy custom domain"
}

output "wppconnect_fqdn" {
  value       = local.wppconnect_fqdn
  description = "WPPConnect custom domain hostname"
}

output "backend_fqdn" {
  value       = local.backend_fqdn
  description = "Backend custom domain hostname"
}

output "backend_domain_mapping_records" {
  value       = try(google_cloud_run_domain_mapping.backend[0].status[0].resource_records, [])
  description = "DNS records required by Cloud Run domain mapping"
}

output "dns_records_managed_by_terraform" {
  value       = var.manage_dns_records
  description = "Whether Terraform manages DNS record sets"
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
