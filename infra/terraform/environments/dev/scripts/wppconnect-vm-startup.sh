#!/bin/bash
# =============================================================================
# WPPConnect-Server VM Startup Script (Docker-based)
# =============================================================================
# Uses the official wppconnect/server-cli Docker image
# Based on: https://hub.docker.com/r/wppconnect/server-cli
# =============================================================================

set -e

# Logging
exec > >(tee -a /var/log/wppconnect-startup.log) 2>&1
echo "=========================================="
echo "WPPConnect Startup Script - $(date)"
echo "=========================================="

# =============================================================================
# Configuration from instance metadata
# =============================================================================
METADATA_URL="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
METADATA_HEADER="Metadata-Flavor: Google"

SECRET_KEY=$(curl -s -H "$METADATA_HEADER" "$METADATA_URL/wppconnect-secret-key" || echo "THISISMYSECURETOKEN")
SESSION_NAME=$(curl -s -H "$METADATA_HEADER" "$METADATA_URL/wppconnect-session" || echo "txai-whatsapp")
WEBHOOK_URL=$(curl -s -H "$METADATA_HEADER" "$METADATA_URL/wppconnect-webhook-url" || echo "")
WEBHOOK_TOKEN=$(curl -s -H "$METADATA_HEADER" "$METADATA_URL/wppconnect-webhook-token" || echo "")

DATA_DIR="/mnt/wppconnect-data"
USER_DATA_DIR="${DATA_DIR}/userDataDir"
CONFIG_DIR="${DATA_DIR}/config"

echo "SECRET_KEY: ${SECRET_KEY:0:10}..."
echo "SESSION_NAME: $SESSION_NAME"
echo "WEBHOOK_URL: $WEBHOOK_URL"

# =============================================================================
# Mount persistent data disk (if not already mounted)
# =============================================================================
echo "Setting up persistent data disk..."

if ! mountpoint -q "$DATA_DIR"; then
    DISK_DEVICE="/dev/disk/by-id/google-wppconnect-data"
    
    if [ -e "$DISK_DEVICE" ]; then
        # Check if disk has a filesystem
        if ! blkid "$DISK_DEVICE" | grep -q "TYPE="; then
            echo "Formatting data disk..."
            mkfs.ext4 -F "$DISK_DEVICE"
        fi
        
        # Create mount point and mount
        mkdir -p "$DATA_DIR"
        mount "$DISK_DEVICE" "$DATA_DIR"
        
        # Add to fstab for persistence across reboots
        if ! grep -q "wppconnect-data" /etc/fstab; then
            echo "$DISK_DEVICE $DATA_DIR ext4 defaults,nofail 0 2" >> /etc/fstab
        fi
        
        echo "Data disk mounted at $DATA_DIR"
    else
        echo "WARNING: Data disk not found at $DISK_DEVICE"
        mkdir -p "$DATA_DIR"
    fi
else
    echo "Data disk already mounted at $DATA_DIR"
fi

# Ensure directories exist
mkdir -p "$USER_DATA_DIR"
mkdir -p "$CONFIG_DIR"
chmod -R 777 "$DATA_DIR"

# =============================================================================
# Install Docker (if not already installed)
# =============================================================================
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Add the repository to Apt sources
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start Docker
    systemctl enable docker
    systemctl start docker
    
    echo "Docker installed: $(docker --version)"
fi

# =============================================================================
# Generate WPPConnect config.json
# =============================================================================
echo "Generating config.json..."

# Build webhook URL with token
FULL_WEBHOOK_URL=""
if [ -n "$WEBHOOK_URL" ] && [ -n "$WEBHOOK_TOKEN" ]; then
    FULL_WEBHOOK_URL="${WEBHOOK_URL}?token=${WEBHOOK_TOKEN}"
fi

cat > "$CONFIG_DIR/config.json" << EOF
{
  "secretKey": "${SECRET_KEY}",
  "host": "0.0.0.0",
  "port": "21465",
  "deviceName": "WPPConnect-VM",
  "poweredBy": "WPPConnect-Server",
  "startAllSession": true,
  "tokenStoreType": "file",
  "maxListeners": 15,
  "customUserDataDir": "/data/userDataDir/",
  "webhook": {
    "url": "${FULL_WEBHOOK_URL}",
    "autoDownload": true,
    "uploadS3": false,
    "readMessage": true,
    "allUnreadOnStart": false,
    "listenAcks": true,
    "onPresenceChanged": true,
    "onParticipantsChanged": true,
    "onReactionMessage": true,
    "onPollResponse": true,
    "onRevokedMessage": true,
    "onLabelUpdated": true,
    "onSelfMessage": true,
    "ignore": []
  },
  "websocket": {
    "autoDownload": false,
    "uploadS3": false
  },
  "chatwoot": {
    "sendQrCode": true,
    "sendStatus": true
  },
  "archive": {
    "enable": false,
    "waitTime": 10,
    "daysToArchive": 45
  },
  "log": {
    "level": "info",
    "logger": ["console", "file"]
  },
  "createOptions": {
    "autoClose": 60000,
    "browserArgs": [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu"
    ]
  },
  "mapper": {
    "enable": false,
    "prefix": "tagone-"
  },
  "db": {
    "mongodbDatabase": "",
    "mongodbCollection": "",
    "mongodbUser": "",
    "mongodbPassword": "",
    "mongodbHost": "",
    "mongoIsRemote": true,
    "mongoURLRemote": "",
    "mongodbPort": 27017,
    "redisDb": 0,
    "redisPrefix": "docker"
  }
}
EOF

echo "Config generated at $CONFIG_DIR/config.json"

# =============================================================================
# Run WPPConnect-Server with Docker
# =============================================================================
echo "Starting WPPConnect-Server container..."

# Stop and remove existing container if any
docker stop wppconnect-server 2>/dev/null || true
docker rm wppconnect-server 2>/dev/null || true

# Pull latest image
docker pull wppconnect/server-cli:latest

# Run the container
docker run -d \
  --name wppconnect-server \
  --restart=unless-stopped \
  -p 21465:21465 \
  -v "$CONFIG_DIR/config.json:/home/node/app/config.json" \
  -v "$USER_DATA_DIR:/data/userDataDir" \
  -e TZ=America/Sao_Paulo \
  wppconnect/server-cli:latest

echo "WPPConnect container started"

# Wait for startup
sleep 10

# Check if container is running
if docker ps | grep -q wppconnect-server; then
    echo "✅ WPPConnect-Server is running"
else
    echo "❌ WPPConnect-Server failed to start"
    docker logs wppconnect-server
fi

# =============================================================================
# Create systemd service for Docker container management
# =============================================================================
echo "Setting up systemd service..."

cat > /etc/systemd/system/wppconnect-docker.service << EOF
[Unit]
Description=WPPConnect-Server Docker Container
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start wppconnect-server
ExecStop=/usr/bin/docker stop wppconnect-server
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable wppconnect-docker

# =============================================================================
# Final status
# =============================================================================
EXTERNAL_IP=$(curl -s -H "$METADATA_HEADER" "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip")

echo "=========================================="
echo "WPPConnect Startup Complete!"
echo "=========================================="
echo "API URL: http://${EXTERNAL_IP}:21465"
echo "Data Dir: $USER_DATA_DIR"
echo "Config: $CONFIG_DIR/config.json"
echo ""
echo "Check status: docker logs wppconnect-server"
echo "Restart: docker restart wppconnect-server"
echo "=========================================="
