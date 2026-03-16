locals {
  state_bucket = length(var.state_bucket_name) > 0 ? var.state_bucket_name : "${var.project_id}-tfstate"

  wif_pool_id     = "github"
  wif_provider_id = "github"

  tf_admin_sa_id = "tf-admin"
  tf_admin_sa    = "${local.tf_admin_sa_id}@${var.project_id}.iam.gserviceaccount.com"

  github_repo_full = "${var.github_owner}/${var.github_repo}"
}

resource "google_storage_bucket" "tf_state" {
  name                        = local.state_bucket
  location                    = "US"
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }
}

resource "google_service_account" "tf_admin" {
  account_id   = local.tf_admin_sa_id
  display_name = "Terraform Admin (GitHub Actions)"
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = local.wif_pool_id
  display_name              = "GitHub Actions"
  description               = "OIDC trust for GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = local.wif_provider_id
  display_name                       = "GitHub OIDC"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository == '${local.github_repo_full}'"
}

resource "google_service_account_iam_member" "tf_admin_wif" {
  service_account_id = google_service_account.tf_admin.name
  role               = "roles/iam.workloadIdentityUser"

  member = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${local.github_repo_full}"
}

# Keep this broad early to move fast; tighten once the baseline is stable.
resource "google_project_iam_member" "tf_admin_roles" {
  for_each = toset([
    "roles/serviceusage.serviceUsageAdmin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/iam.serviceAccountAdmin",
    "roles/artifactregistry.admin",
    "roles/run.admin",
    "roles/secretmanager.admin",
    "roles/cloudsql.admin",
    "roles/storage.admin",
    "roles/logging.admin",
    "roles/compute.admin",
    "roles/dns.admin",
    "roles/datastore.owner",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.tf_admin.email}"
}
