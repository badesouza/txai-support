#!/bin/bash
# =============================================================================
# WPPConnect VM Startup Script (Custom image + Caddy HTTPS)
# =============================================================================

set -euo pipefail

exec > >(tee -a /var/log/wppconnect-startup.log) 2>&1
echo "=========================================="
echo "WPPConnect Startup Script - $(date)"
echo "=========================================="

METADATA_URL="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
METADATA_HEADER="Metadata-Flavor: Google"

get_metadata() {
  local key="$1"
  curl -fsS -H "${METADATA_HEADER}" "${METADATA_URL}/${key}" 2>/dev/null || true
}

SECRET_KEY="$(get_metadata wppconnect-secret-key)"
SESSION_NAME="$(get_metadata wppconnect-session)"
WEBHOOK_URL="$(get_metadata wppconnect-webhook-url)"
WEBHOOK_TOKEN="$(get_metadata wppconnect-webhook-token)"
WPPCONNECT_IMAGE="$(get_metadata wppconnect-image)"
WPPCONNECT_FQDN="$(get_metadata wppconnect-fqdn)"

SECRET_KEY="${SECRET_KEY:-THISISMYSECURETOKEN}"
SESSION_NAME="${SESSION_NAME:-txai-whatsapp}"
WPPCONNECT_IMAGE="${WPPCONNECT_IMAGE:-wppconnect/server-cli:latest}"
WPPCONNECT_FQDN="${WPPCONNECT_FQDN:-}"

require_single_line() {
  local key="$1"
  local value="$2"

  if [[ "${value}" == *$'\n'* || "${value}" == *$'\r'* ]]; then
    echo "ERROR: ${key} must be a single line"
    exit 1
  fi
}

validate_session_name() {
  local value="$1"
  # Keep this strict because SESSION_NAME is used in filesystem paths.
  if [[ ! "${value}" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "ERROR: Invalid SESSION_NAME '${value}' (allowed: A-Za-z0-9._-)"
    exit 1
  fi
}

require_single_line "SECRET_KEY" "${SECRET_KEY}"
require_single_line "SESSION_NAME" "${SESSION_NAME}"
require_single_line "WEBHOOK_URL" "${WEBHOOK_URL}"
require_single_line "WEBHOOK_TOKEN" "${WEBHOOK_TOKEN}"
require_single_line "WPPCONNECT_IMAGE" "${WPPCONNECT_IMAGE}"
require_single_line "WPPCONNECT_FQDN" "${WPPCONNECT_FQDN}"

validate_session_name "${SESSION_NAME}"

if [[ "${WPPCONNECT_IMAGE}" =~ [[:space:]] ]]; then
  echo "ERROR: WPPCONNECT_IMAGE cannot contain whitespace"
  exit 1
fi

if [ -n "${WPPCONNECT_FQDN}" ] && [[ ! "${WPPCONNECT_FQDN}" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "ERROR: Invalid WPPCONNECT_FQDN '${WPPCONNECT_FQDN}'"
  exit 1
fi

DATA_DIR="/mnt/wppconnect-data"
STACK_DIR="/opt/wppconnect"

DISK_WPP_ROOT="${DATA_DIR}/wppconnect"
DISK_CADDY_ROOT="${DATA_DIR}/caddy"

HOST_WPP_ROOT="/var/lib/wppconnect"
HOST_CADDY_DATA="/var/lib/caddy"
HOST_CADDY_CONFIG="/var/lib/caddy-config"

TOKENS_DIR="${HOST_WPP_ROOT}/tokens"
USER_DATA_DIR="${HOST_WPP_ROOT}/userDataDir"
CONFIG_DIR="${HOST_WPP_ROOT}/config"

echo "WPPCONNECT_IMAGE: ${WPPCONNECT_IMAGE}"
echo "WPPCONNECT_FQDN: ${WPPCONNECT_FQDN}"
echo "SESSION_NAME: ${SESSION_NAME}"
echo "WEBHOOK_URL: ${WEBHOOK_URL}"

echo "Setting up persistent data disk..."
if ! mountpoint -q "${DATA_DIR}"; then
  DISK_DEVICE="/dev/disk/by-id/google-wppconnect-data"
  if [ -e "${DISK_DEVICE}" ]; then
    if ! blkid "${DISK_DEVICE}" | grep -q "TYPE="; then
      echo "Formatting data disk..."
      mkfs.ext4 -F "${DISK_DEVICE}"
    fi
    mkdir -p "${DATA_DIR}"
    mount "${DISK_DEVICE}" "${DATA_DIR}"
    if ! grep -q "wppconnect-data" /etc/fstab; then
      echo "${DISK_DEVICE} ${DATA_DIR} ext4 defaults,nofail 0 2" >> /etc/fstab
    fi
  else
    echo "WARNING: Data disk not found, using boot disk."
    mkdir -p "${DATA_DIR}"
  fi
fi

mkdir -p "${DISK_WPP_ROOT}/tokens" "${DISK_WPP_ROOT}/userDataDir" "${DISK_WPP_ROOT}/config"
mkdir -p "${DISK_CADDY_ROOT}/data" "${DISK_CADDY_ROOT}/config"
mkdir -p /var/lib

if [ -e "${HOST_WPP_ROOT}" ] && [ ! -L "${HOST_WPP_ROOT}" ]; then
  rm -rf "${HOST_WPP_ROOT}"
fi
if [ -e "${HOST_CADDY_DATA}" ] && [ ! -L "${HOST_CADDY_DATA}" ]; then
  rm -rf "${HOST_CADDY_DATA}"
fi
if [ -e "${HOST_CADDY_CONFIG}" ] && [ ! -L "${HOST_CADDY_CONFIG}" ]; then
  rm -rf "${HOST_CADDY_CONFIG}"
fi

ln -sfn "${DISK_WPP_ROOT}" "${HOST_WPP_ROOT}"
ln -sfn "${DISK_CADDY_ROOT}/data" "${HOST_CADDY_DATA}"
ln -sfn "${DISK_CADDY_ROOT}/config" "${HOST_CADDY_CONFIG}"

mkdir -p "${STACK_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  apt-get update
  apt-get install -y ca-certificates curl gnupg jq
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
    | tee /etc/apt/sources.list.d/docker.list >/dev/null
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin jq
  systemctl enable docker
  systemctl start docker
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Installing jq..."
  apt-get update
  apt-get install -y jq
fi

# Login to Artifact Registry if image is hosted there.
if echo "${WPPCONNECT_IMAGE}" | grep -q "docker.pkg.dev"; then
  echo "Authenticating Docker to Artifact Registry..."
  REGISTRY_HOST="$(echo "${WPPCONNECT_IMAGE}" | awk -F'/' '{print $1}')"
  ACCESS_TOKEN="$(curl -fsS -H "${METADATA_HEADER}" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" | jq -r '.access_token')"
  echo "${ACCESS_TOKEN}" | docker login -u oauth2accesstoken --password-stdin "https://${REGISTRY_HOST}"
fi

FULL_WEBHOOK_URL=""
if [ -n "${WEBHOOK_URL}" ] && [ -n "${WEBHOOK_TOKEN}" ]; then
  FULL_WEBHOOK_URL="${WEBHOOK_URL}?token=${WEBHOOK_TOKEN}"
fi

cat > "${CONFIG_DIR}/config.json" <<EOF
{
  "secretKey": "${SECRET_KEY}",
  "host": "0.0.0.0",
  "port": "21465",
  "deviceName": "WPPConnect-VM",
  "poweredBy": "WPPConnect-Server",
  "startAllSession": false,
  "tokenStoreType": "file",
  "maxListeners": 15,
  "customUserDataDir": "/usr/src/wpp-server/userDataDir/",
  "webhook": {
    "url": "${FULL_WEBHOOK_URL}",
    "autoDownload": true,
    "uploadS3": false,
    "readMessage": true,
    "allUnreadOnStart": false
  },
  "log": {
    "level": "info",
    "logger": ["console", "file"]
  }
}
EOF

if [ -n "${WPPCONNECT_FQDN}" ]; then
  cat > "${STACK_DIR}/Caddyfile" <<EOF
${WPPCONNECT_FQDN} {
    reverse_proxy wppconnect:21465
}
EOF
else
  cat > "${STACK_DIR}/Caddyfile" <<'EOF'
:80 {
    reverse_proxy wppconnect:21465
}
EOF
fi

cat > "${STACK_DIR}/docker-compose.yml" <<EOF
services:
  wppconnect:
    image: ${WPPCONNECT_IMAGE}
    container_name: wppconnect
    restart: unless-stopped
    expose:
      - "21465"
    environment:
      PORT: "21465"
      SECRET_KEY: "${SECRET_KEY}"
      TZ: "America/Sao_Paulo"
      WPPCONNECT_CONFIG_PATH: "/usr/src/wpp-server/config.json"
    volumes:
      - ${CONFIG_DIR}/config.json:/usr/src/wpp-server/config.json:ro
      - ${TOKENS_DIR}:/usr/src/wpp-server/tokens
      - ${USER_DATA_DIR}:/usr/src/wpp-server/userDataDir
    networks:
      - internal

  caddy:
    image: caddy:2
    container_name: caddy
    restart: unless-stopped
    depends_on:
      - wppconnect
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ${STACK_DIR}/Caddyfile:/etc/caddy/Caddyfile:ro
      - ${HOST_CADDY_DATA}:/data
      - ${HOST_CADDY_CONFIG}:/config
    networks:
      - internal

networks:
  internal:
    driver: bridge
EOF

cd "${STACK_DIR}"
# Let the backend own session startup so we do not race Chromium on boot.
SESSION_DIR="${USER_DATA_DIR}/${SESSION_NAME}"
SESSION_DIR_REAL="$(readlink -m "${SESSION_DIR}")"
USER_DATA_DIR_REAL="$(readlink -m "${USER_DATA_DIR}")"
case "${SESSION_DIR_REAL}" in
  "${USER_DATA_DIR_REAL}"/*) ;;
  *)
    echo "ERROR: SESSION_NAME resolved outside USER_DATA_DIR: ${SESSION_DIR_REAL}"
    exit 1
    ;;
esac

rm -f "${SESSION_DIR_REAL}/SingletonLock" \
      "${SESSION_DIR_REAL}/SingletonCookie" \
      "${SESSION_DIR_REAL}/SingletonSocket" \
      "${SESSION_DIR_REAL}/DevToolsActivePort"
docker compose up -d --remove-orphans

cat > /etc/systemd/system/wppconnect-stack.service <<EOF
[Unit]
Description=WPPConnect stack (WPPConnect + Caddy)
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${STACK_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable wppconnect-stack

EXTERNAL_IP="$(curl -fsS -H "${METADATA_HEADER}" "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip")"

echo "=========================================="
echo "WPPConnect startup complete"
echo "=========================================="
echo "External IP: ${EXTERNAL_IP}"
if [ -n "${WPPCONNECT_FQDN}" ]; then
  echo "Public URL: https://${WPPCONNECT_FQDN}"
fi
echo "Image: ${WPPCONNECT_IMAGE}"
echo "Config: ${CONFIG_DIR}/config.json"
echo "Stack dir: ${STACK_DIR}"
echo "Logs: docker logs wppconnect && docker logs caddy"
echo "=========================================="
