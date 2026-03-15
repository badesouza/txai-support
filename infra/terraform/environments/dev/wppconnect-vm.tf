# =============================================================================
# WPPConnect-Server GCE VM
# =============================================================================
# VM-based deployment for WPPConnect-Server with:
# - Persistent disk for userDataDir (WhatsApp session data)
# - 1 vCPU, 2GB RAM (e2-small)
# - Docker-based deployment using custom image + Caddy
# =============================================================================

# VM Configuration Variables
variable "wppconnect_vm_name" {
  type        = string
  description = "Name for the WPPConnect VM instance"
  default     = "wppconnect-server"
}

variable "wppconnect_vm_zone" {
  type        = string
  description = "GCP zone for the VM"
  default     = "us-central1-a"
}

variable "wppconnect_vm_machine_type" {
  type        = string
  description = "Machine type for the VM (1 vCPU, 2GB RAM)"
  default     = "e2-small"
}

variable "wppconnect_vm_disk_size_gb" {
  type        = number
  description = "Size of the persistent data disk in GB"
  default     = 20
}

variable "wppconnect_vm_admin_cidrs" {
  type        = list(string)
  description = "CIDR ranges allowed to SSH into WPPConnect VM"
  default     = ["0.0.0.0/0"]
}

# =============================================================================
# Static IP for the VM (PINNED - persists across VM recreations)
# =============================================================================
# This is a reserved static external IP address. It remains allocated even if
# the VM is destroyed and recreated. The backend is automatically updated
# via null_resource.sync_wppconnect_url_to_backend whenever this IP changes.
resource "google_compute_address" "wppconnect_vm" {
  name        = "${var.wppconnect_vm_name}-ip"
  region      = var.region
  description = "Static IP for WPPConnect-Server VM - do not delete"
}

# =============================================================================
# Persistent Disk for userDataDir (WhatsApp session data)
# =============================================================================
resource "google_compute_disk" "wppconnect_data" {
  name = "${var.wppconnect_vm_name}-data"
  type = "pd-ssd"
  zone = var.wppconnect_vm_zone
  size = var.wppconnect_vm_disk_size_gb

  labels = {
    environment = var.environment_name
    purpose     = "wppconnect-userdata"
  }
}

# =============================================================================
# Firewall Rule for public HTTPS/HTTP through Caddy (ports 80/443)
# =============================================================================
resource "google_compute_firewall" "wppconnect_web" {
  name    = "${var.wppconnect_vm_name}-allow-web"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["wppconnect-server"]
}

# =============================================================================
# Firewall Rule for SSH administration
# =============================================================================
resource "google_compute_firewall" "wppconnect_ssh" {
  name    = "${var.wppconnect_vm_name}-allow-ssh"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = var.wppconnect_vm_admin_cidrs
  target_tags   = ["wppconnect-server"]
}

# =============================================================================
# WPPConnect VM Instance
# =============================================================================
resource "google_compute_instance" "wppconnect" {
  name         = var.wppconnect_vm_name
  machine_type = var.wppconnect_vm_machine_type
  zone         = var.wppconnect_vm_zone

  tags = ["wppconnect-server", "http-server", "https-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 30
      type  = "pd-balanced"
    }
  }

  # Attach persistent data disk
  attached_disk {
    source      = google_compute_disk.wppconnect_data.self_link
    device_name = "wppconnect-data"
    mode        = "READ_WRITE"
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip = google_compute_address.wppconnect_vm.address
    }
  }

  service_account {
    email  = google_service_account.runtime_whatsapp.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    # Pass configuration to the startup script
    wppconnect-image         = local.effective_wppconnect_image
    wppconnect-fqdn          = local.wppconnect_fqdn
    wppconnect-secret-key    = var.wppconnect_secret_key
    wppconnect-session       = var.wppconnect_session
    wppconnect-webhook-url   = "${local.backend_public_base_url}/api/whatsapp/webhook"
    wppconnect-webhook-token = var.wppconnect_webhook_secret
  }

  metadata_startup_script = file("${path.module}/scripts/wppconnect-vm-startup.sh")

  labels = {
    environment = var.environment_name
    app         = "wppconnect"
  }

  # Allow stopping for updates
  allow_stopping_for_update = true

  depends_on = [
    google_project_service.apis,
    google_compute_disk.wppconnect_data,
    google_compute_firewall.wppconnect_web,
    google_compute_firewall.wppconnect_ssh,
  ]
}

# =============================================================================
# Outputs
# =============================================================================
output "wppconnect_vm_ip" {
  value       = google_compute_address.wppconnect_vm.address
  description = "External IP of the WPPConnect VM"
}

output "wppconnect_vm_url" {
  value       = local.wppconnect_base_url
  description = "Public WPPConnect API URL"
}

output "wppconnect_vm_ssh" {
  value       = "gcloud compute ssh ${var.wppconnect_vm_name} --zone=${var.wppconnect_vm_zone}"
  description = "SSH command to connect to the VM"
}

output "wppconnect_vm_name" {
  value       = var.wppconnect_vm_name
  description = "WPPConnect VM name"
}

output "wppconnect_vm_zone" {
  value       = var.wppconnect_vm_zone
  description = "WPPConnect VM zone"
}
