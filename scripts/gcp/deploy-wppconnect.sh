#!/usr/bin/env bash
#
# Build and deploy custom WPPConnect image from upstream repository.
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}==>${NC} $*"; }
log_success() { echo -e "${GREEN}==>${NC} $*"; }
log_warn() { echo -e "${YELLOW}==>${NC} $*"; }
log_error() { echo -e "${RED}==>${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
WPPCONNECT_AR_REPO="${WPPCONNECT_AR_REPO:-wppconnect-images}"
WPPCONNECT_IMAGE_NAME="${WPPCONNECT_IMAGE_NAME:-wppconnect-server}"
WPPCONNECT_VM_NAME="${WPPCONNECT_VM_NAME:-wppconnect-server}"
WPPCONNECT_VM_ZONE="${WPPCONNECT_VM_ZONE:-us-central1-a}"
WPPCONNECT_FQDN="${WPPCONNECT_FQDN:-bizybox-dev.tazco-platform.com}"
WPPCONNECT_DEPLOY_MODE="${WPPCONNECT_DEPLOY_MODE:-auto}"
WPPCONNECT_UPSTREAM_REPO_URL="${WPPCONNECT_UPSTREAM_REPO_URL:-https://github.com/wppconnect-team/wppconnect-server.git}"
WPPCONNECT_UPSTREAM_REF="${WPPCONNECT_UPSTREAM_REF:-87ae61d4e6f8a849e3f10c60704dfc1b00878805}"
FORCE_WPPCONNECT_REBUILD="${FORCE_WPPCONNECT_REBUILD:-false}"

if [ -z "${PROJECT_ID}" ]; then
  log_error "PROJECT_ID is required."
  exit 1
fi

for cmd in gcloud git jq awk; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    log_error "Missing required command: ${cmd}"
    exit 1
  fi
done

is_true() {
  case "${1,,}" in
    true|1|yes|y|on) return 0 ;;
    *) return 1 ;;
  esac
}

case "${WPPCONNECT_DEPLOY_MODE}" in
  auto|latest-no-build|rebuild) ;;
  *)
    log_error "Invalid WPPCONNECT_DEPLOY_MODE: ${WPPCONNECT_DEPLOY_MODE}"
    log_error "Supported values: auto, latest-no-build, rebuild"
    exit 1
    ;;
esac

lookup_image_version_by_tag() {
  local image_base="$1"
  local tag="$2"

  gcloud artifacts docker images list "${image_base}" --include-tags --format=json 2>/dev/null \
    | jq -r --arg TAG "${tag}" '.[] | select((.tags // []) | index($TAG)) | .version' \
    | head -1
}

resolve_ref_sha() {
  local repo_url="$1"
  local ref="$2"
  local sha=""

  if [[ "${ref}" =~ ^[0-9a-fA-F]{40}$ ]]; then
    sha="${ref}"
  elif [ "${ref}" = "main" ]; then
    sha="$(git ls-remote "${repo_url}" "refs/heads/main" | awk '{print $1}')"
  else
    sha="$(git ls-remote "${repo_url}" "refs/tags/${ref}^{}" | awk '{print $1}')"
    if [ -z "${sha}" ]; then
      sha="$(git ls-remote "${repo_url}" "refs/tags/${ref}" | awk '{print $1}')"
    fi
    if [ -z "${sha}" ]; then
      sha="$(git ls-remote "${repo_url}" "refs/heads/${ref}" | awk '{print $1}')"
    fi
  fi

  echo "${sha}"
}

DATE_TAG="$(date +%F)"

IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${WPPCONNECT_AR_REPO}/${WPPCONNECT_IMAGE_NAME}"
IMAGE_VERSION=""
RESOLVED_SHA=""
SHORT_SHA=""
IMAGE_URI_SHA="${IMAGE_BASE}:git-${SHORT_SHA}"
IMAGE_URI_DATE="${IMAGE_BASE}:${DATE_TAG}"
IMAGE_URI_LATEST="${IMAGE_BASE}:latest"

if [ "${WPPCONNECT_DEPLOY_MODE}" = "latest-no-build" ]; then
  log_info "Reusing latest WPPConnect image from Artifact Registry without rebuilding..."
  IMAGE_VERSION="$(lookup_image_version_by_tag "${IMAGE_BASE}" "latest")"
  if [ -z "${IMAGE_VERSION}" ]; then
    log_error "Could not resolve a 'latest' image for ${IMAGE_BASE}"
    exit 1
  fi
else
  log_info "Resolving upstream ref '${WPPCONNECT_UPSTREAM_REF}'..."
  RESOLVED_SHA="$(resolve_ref_sha "${WPPCONNECT_UPSTREAM_REPO_URL}" "${WPPCONNECT_UPSTREAM_REF}")"
  if [ -z "${RESOLVED_SHA}" ]; then
    log_error "Failed to resolve upstream ref '${WPPCONNECT_UPSTREAM_REF}' in ${WPPCONNECT_UPSTREAM_REPO_URL}"
    exit 1
  fi
  SHORT_SHA="${RESOLVED_SHA:0:12}"
  IMAGE_URI_SHA="${IMAGE_BASE}:git-${SHORT_SHA}"

  log_info "Preparing custom WPPConnect image..."
  log_info "Upstream: ${WPPCONNECT_UPSTREAM_REPO_URL}@${RESOLVED_SHA}"
  log_info "Image:    ${IMAGE_URI_SHA}"
  IMAGE_VERSION="$(lookup_image_version_by_tag "${IMAGE_BASE}" "git-${SHORT_SHA}")"

  if [ -n "${IMAGE_VERSION}" ] && ! is_true "${FORCE_WPPCONNECT_REBUILD}" && [ "${WPPCONNECT_DEPLOY_MODE}" != "rebuild" ]; then
    log_info "Reusing existing WPPConnect image for git-${SHORT_SHA}."
  else
    TMP_CLOUDBUILD="$(mktemp)"
    cat > "${TMP_CLOUDBUILD}" << 'EOF'
steps:
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -t
      - ${_IMAGE_URI}
      - --build-arg
      - WPPCONNECT_REF=${_WPPCONNECT_REF}
      - .
images:
  - ${_IMAGE_URI}
EOF

    gcloud builds submit "${REPO_ROOT}/wppconnect" \
      --project "${PROJECT_ID}" \
      --config "${TMP_CLOUDBUILD}" \
      --substitutions "_IMAGE_URI=${IMAGE_URI_SHA},_WPPCONNECT_REF=${RESOLVED_SHA}"

    rm -f "${TMP_CLOUDBUILD}"
    IMAGE_VERSION="$(lookup_image_version_by_tag "${IMAGE_BASE}" "git-${SHORT_SHA}")"
  fi

  log_info "Tagging image for release and latest..."
  gcloud artifacts docker tags add "${IMAGE_URI_SHA}" "${IMAGE_URI_DATE}" --quiet
  gcloud artifacts docker tags add "${IMAGE_URI_SHA}" "${IMAGE_URI_LATEST}" --quiet
fi

if [ -z "${IMAGE_VERSION}" ]; then
  log_error "Could not resolve image digest for the selected WPPConnect deployment mode"
  exit 1
fi

IMAGE_DIGEST="${IMAGE_VERSION##*@}"
IMAGE_URI_IMMUTABLE="${IMAGE_BASE}@${IMAGE_DIGEST}"

METADATA_DIR="${REPO_ROOT}/infra/deploy-metadata"
mkdir -p "${METADATA_DIR}"
METADATA_FILE="${METADATA_DIR}/wppconnect-image-${DATE_TAG}-${SHORT_SHA}.json"

cat > "${METADATA_FILE}" <<EOF
{
  "deployment_mode": "${WPPCONNECT_DEPLOY_MODE}",
  "upstream_repo_url": "${WPPCONNECT_UPSTREAM_REPO_URL}",
  "upstream_ref_requested": "${WPPCONNECT_UPSTREAM_REF}",
  "upstream_ref_resolved_sha": "${RESOLVED_SHA}",
  "project_id": "${PROJECT_ID}",
  "region": "${REGION}",
  "artifact_repository": "${WPPCONNECT_AR_REPO}",
  "image_uri_sha_tag": "${IMAGE_URI_SHA}",
  "image_uri_date_tag": "${IMAGE_URI_DATE}",
  "image_uri_latest_tag": "${IMAGE_URI_LATEST}",
  "image_uri_immutable": "${IMAGE_URI_IMMUTABLE}",
  "image_digest": "${IMAGE_DIGEST}",
  "built_at_utc": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "initiated_by": "$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -1)"
}
EOF

log_success "Build metadata saved: ${METADATA_FILE}"

log_info "Updating VM metadata with immutable image..."
gcloud compute instances add-metadata "${WPPCONNECT_VM_NAME}" \
  --zone "${WPPCONNECT_VM_ZONE}" \
  --project "${PROJECT_ID}" \
  --metadata "wppconnect-image=${IMAGE_URI_IMMUTABLE}"

log_info "Re-running startup script on VM to apply runtime changes..."
gcloud compute ssh "${WPPCONNECT_VM_NAME}" \
  --zone "${WPPCONNECT_VM_ZONE}" \
  --project "${PROJECT_ID}" \
  --command 'set -euo pipefail; H="Metadata-Flavor: Google"; curl -fsS -H "$H" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/startup-script" | sudo bash'

log_info "Validating WPPConnect HTTPS endpoint..."
if curl -fsS "https://${WPPCONNECT_FQDN}/api-docs" >/dev/null 2>&1; then
  log_success "WPPConnect endpoint is reachable at https://${WPPCONNECT_FQDN}"
else
  log_warn "WPPConnect endpoint is not reachable yet (DNS/TLS propagation may still be in progress)."
  log_warn "Check manually: https://${WPPCONNECT_FQDN}"
fi

log_success "WPPConnect custom image deployment complete"
echo "  Deploy mode:   ${WPPCONNECT_DEPLOY_MODE}"
echo "  Requested ref: ${WPPCONNECT_UPSTREAM_REF}"
echo "  Resolved SHA:  ${RESOLVED_SHA}"
echo "  Image:         ${IMAGE_URI_IMMUTABLE}"
