locals {
  wppconnect_vm_tag = "wppconnect-server"
}

resource "google_compute_address" "wppconnect_ip" {
  name   = "${var.environment_name}-wppconnect-ip"
  region = var.region

  depends_on = [google_project_service.apis]
}

resource "google_compute_disk" "wppconnect_data" {
  name = "${var.environment_name}-wppconnect-data"
  type = "pd-balanced"
  zone = var.wppconnect_vm_zone
  size = var.wppconnect_disk_size_gb

  depends_on = [google_project_service.apis]
}

resource "google_compute_firewall" "wppconnect_ingress" {
  name    = "${var.environment_name}-allow-wppconnect"
  network = "default"

  target_tags = [local.wppconnect_vm_tag]
  direction   = "INGRESS"

  allow {
    protocol = "tcp"
    ports    = [tostring(var.wppconnect_container_port)]
  }

  # NOTE: Exposing this port publicly is a deliberate choice in this plan.
  # The WPPConnect server still requires token-based auth via secretKey.
  source_ranges = ["0.0.0.0/0"]

  depends_on = [google_project_service.apis]
}

resource "google_compute_instance" "wppconnect_vm" {
  name         = var.wppconnect_vm_name
  zone         = var.wppconnect_vm_zone
  machine_type = "e2-small" # 2 vCPU / 2Gi
  tags         = [local.wppconnect_vm_tag]

  boot_disk {
    initialize_params {
      image = "projects/cos-cloud/global/images/family/cos-stable"
      size  = 20
      type  = "pd-balanced"
    }
  }

  attached_disk {
    source      = google_compute_disk.wppconnect_data.id
    device_name = "wppconnect-data"
    mode        = "READ_WRITE"
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip = google_compute_address.wppconnect_ip.address
    }
  }

  service_account {
    email  = google_service_account.runtime_whatsapp.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata = {
    # Run wppconnect/server-cli as a "container VM" on COS.
    gce-container-declaration = <<-EOT
spec:
  containers:
    - name: wppconnect-server
      image: ${var.wppconnect_image}
      args:
        - --config
        - /config/config.json
      env:
        - name: PORT
          value: "${var.wppconnect_container_port}"
        - name: TZ
          value: "America/Sao_Paulo"
      volumeMounts:
        - name: wppconnect-config
          mountPath: /config
          readOnly: true
        - name: wppconnect-userdata
          mountPath: /usr/src/wpp-server/userDataDir
  volumes:
    - name: wppconnect-config
      hostPath:
        path: /var/lib/wppconnect
        type: DirectoryOrCreate
    - name: wppconnect-userdata
      hostPath:
        path: /mnt/disks/wppconnect-data/userDataDir
        type: DirectoryOrCreate
  restartPolicy: Always
EOT
  }

  metadata_startup_script = <<-EOT
#!/bin/bash
set -euo pipefail

MOUNT_DIR="/mnt/disks/wppconnect-data"
DEVICE="/dev/disk/by-id/google-wppconnect-data"

mkdir -p "$MOUNT_DIR"

if ! blkid "$DEVICE" >/dev/null 2>&1; then
  mkfs.ext4 -F "$DEVICE"
fi

if ! mountpoint -q "$MOUNT_DIR"; then
  mount -o discard,defaults "$DEVICE" "$MOUNT_DIR"
fi

if ! grep -q "$DEVICE" /etc/fstab 2>/dev/null; then
  echo "$DEVICE $MOUNT_DIR ext4 discard,defaults,nofail 0 2" >> /etc/fstab
fi

mkdir -p "$MOUNT_DIR/userDataDir"

mkdir -p /var/lib/wppconnect
touch /var/lib/wppconnect/config.json
chmod 600 /var/lib/wppconnect/config.json

TOKEN_JSON="$(curl -sf -H 'Metadata-Flavor: Google' 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token')"
ACCESS_TOKEN="$(echo "$TOKEN_JSON" | sed -n 's/.*\"access_token\":\"\\([^\"]*\\)\".*/\\1/p')"

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to obtain access token from metadata server" >&2
  exit 1
fi

SECRET_URL="https://secretmanager.googleapis.com/v1/projects/${var.project_id}/secrets/${google_secret_manager_secret.wppconnect_config.secret_id}/versions/latest:access"
SECRET_JSON="$(curl -sf -H "Authorization: Bearer $ACCESS_TOKEN" "$SECRET_URL")"
SECRET_B64="$(echo "$SECRET_JSON" | sed -n 's/.*\"data\":\"\\([^\"]*\\)\".*/\\1/p')"

if [ -z "$SECRET_B64" ]; then
  echo "Failed to read secret payload from Secret Manager" >&2
  exit 1
fi

echo "$SECRET_B64" | base64 -d > /var/lib/wppconnect/config.json
chmod 600 /var/lib/wppconnect/config.json
EOT

  depends_on = [google_project_service.apis]
}


