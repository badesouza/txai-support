# =============================================================================
# Redis Cloud Configuration for WPPConnect Session Storage (Essentials Free Tier)
# =============================================================================
# Uses Redis Cloud Essentials free tier (30MB) for storing WPPConnect session tokens.
# Database 0: WPPConnect tokens and sessions
# Database 1: Rate limiting (future)
# Database 2: Cache (future)
# =============================================================================

# Get the free 30MB Essentials plan for AWS
data "rediscloud_essentials_plan" "free_plan" {
  count                 = var.redis_enabled ? 1 : 0
  cloud_provider        = "AWS"
  region                = "us-east-1"
  size                  = 30
  size_measurement_unit = "MB"
  availability          = "No replication"
}

# Create Essentials subscription (free tier)
# Note: Payment method not required for free tier
resource "rediscloud_essentials_subscription" "main" {
  count   = var.redis_enabled ? 1 : 0
  name    = var.redis_subscription_name
  plan_id = data.rediscloud_essentials_plan.free_plan[0].id
}

# Create the sessions database
resource "rediscloud_essentials_database" "sessions" {
  count            = var.redis_enabled ? 1 : 0
  subscription_id  = rediscloud_essentials_subscription.main[0].id
  name             = var.redis_database_name
  data_persistence = "none" # Sessions can be recreated
  replication      = false  # Free tier doesn't support replication

  # Note: Essentials free tier does not support custom alerts
  # Alerts are configured at the subscription level via Redis Cloud console
}

# Store Redis URL in Secret Manager (with database 0 suffix)
resource "google_secret_manager_secret" "redis_url" {
  count     = var.redis_enabled ? 1 : 0
  project   = var.project_id
  secret_id = "redis-url-${var.environment_name}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "redis_url" {
  count  = var.redis_enabled ? 1 : 0
  secret = google_secret_manager_secret.redis_url[0].id

  # Format: rediss://default:password@host:port/0
  # Using database 0 for WPPConnect sessions
  # Construct full Redis URL with TLS and authentication
  secret_data = "rediss://default:${rediscloud_essentials_database.sessions[0].password}@${rediscloud_essentials_database.sessions[0].public_endpoint}/0"
}

# Grant runtime service account access to the Redis secret
resource "google_secret_manager_secret_iam_member" "redis_url_accessor" {
  count     = var.redis_enabled ? 1 : 0
  project   = var.project_id
  secret_id = google_secret_manager_secret.redis_url[0].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime_api.email}"
}
