output "tf_state_bucket" {
  value       = google_storage_bucket.tf_state.name
  description = "GCS bucket name for Terraform remote state"
}

output "wif_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Workload Identity Provider resource name (use in GitHub Actions auth)"
}

output "tf_service_account" {
  value       = google_service_account.tf_admin.email
  description = "Service account email that GitHub Actions will impersonate via WIF"
}
