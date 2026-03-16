variable "project_id" {
  type        = string
  description = "GCP project id (dev)"
}

variable "region" {
  type        = string
  description = "Default region"
  default     = "us-central1"
}

variable "github_owner" {
  type        = string
  description = "GitHub org/user that owns the repo"
}

variable "github_repo" {
  type        = string
  description = "GitHub repo name (no owner prefix)"
}

variable "state_bucket_name" {
  type        = string
  description = "Optional explicit Terraform state bucket name"
  default     = ""
}

variable "dns_project_id" {
  type        = string
  description = "Optional Cloud DNS host project id when DNS zones live outside the main project"
  default     = ""
}
