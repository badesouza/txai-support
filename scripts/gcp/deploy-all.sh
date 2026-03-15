#!/usr/bin/env bash
#
# Deploy Complete Application to GCP
# Requires: Bootstrap already completed
# Config loaded from .env.local files or environment variables
#

set -euo pipefail

# Get script and repo root directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"
REPO_ROOT="$(resolve_repo_root "${SCRIPT_DIR}")"

load_repo_env_files "${REPO_ROOT}"

# Configuration (env files loaded above, fallback to defaults)
PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
TF_STATE_BUCKET="${TF_STATE_BUCKET:-}"
TF_STATE_PREFIX="${TF_STATE_PREFIX:-txai-support/${ENVIRONMENT_NAME}}"
DEPLOY_WPPCONNECT="${DEPLOY_WPPCONNECT:-false}"
WPPCONNECT_VM_NAME="${WPPCONNECT_VM_NAME:-wppconnect-server}"
WPPCONNECT_VM_ZONE="${WPPCONNECT_VM_ZONE:-us-central1-a}"
WPPCONNECT_IMAGE="${WPPCONNECT_IMAGE:-}"

is_true() {
  case "${1,,}" in
    true|1|yes|y|on) return 0 ;;
    *) return 1 ;;
  esac
}

# Validate required variables
if [ -z "${PROJECT_ID}" ]; then
  log_error "PROJECT_ID is required"
  echo "Usage: PROJECT_ID=your-project TF_STATE_BUCKET=your-tfstate-bucket $0"
  echo "Or create .env.local and infra/.env.local with the required values"
  exit 1
fi

if [ -z "${TF_STATE_BUCKET}" ]; then
  log_error "TF_STATE_BUCKET is required (created during bootstrap)"
  echo "Usage: PROJECT_ID=your-project TF_STATE_BUCKET=your-tfstate-bucket $0"
  echo "Or create infra/.env.local with TF_STATE_BUCKET"
  echo ""
  echo "If you haven't run bootstrap yet, run: ./scripts/gcp/bootstrap.sh"
  exit 1
fi

log_info "Deployment Configuration:"
echo "  Project ID:     ${PROJECT_ID}"
echo "  Region:         ${REGION}"
echo "  Environment:    ${ENVIRONMENT_NAME}"
echo "  State Bucket:   ${TF_STATE_BUCKET}"
echo "  Deploy WPP:     ${DEPLOY_WPPCONNECT}"
echo ""

# Check prerequisites
log_info "Checking prerequisites..."

require_command "gcloud" "Install: https://cloud.google.com/sdk/docs/install"
require_command "tofu" "Install: brew install opentofu"
require_command "jq" "Install: brew install jq"

ACTIVE_ACCOUNT=$(require_gcloud_auth)
log_success "Authenticated as: ${ACTIVE_ACCOUNT}"

set_gcloud_project "${PROJECT_ID}"

if [ -z "${WPPCONNECT_IMAGE}" ]; then
  CURRENT_WPPCONNECT_IMAGE="$(
    gcloud compute instances describe "${WPPCONNECT_VM_NAME}" \
      --zone "${WPPCONNECT_VM_ZONE}" \
      --project "${PROJECT_ID}" \
      --format=json 2>/dev/null \
      | jq -r '.metadata.items[]? | select(.key == "wppconnect-image") | .value' 2>/dev/null || true
  )"

  if [ -n "${CURRENT_WPPCONNECT_IMAGE}" ]; then
    WPPCONNECT_IMAGE="${CURRENT_WPPCONNECT_IMAGE}"
    log_info "Preserving pinned WPPConnect image: ${WPPCONNECT_IMAGE}"
  fi
fi

# Verify state bucket exists
log_info "Verifying state bucket exists..."
if ! gcloud storage buckets describe "gs://${TF_STATE_BUCKET}" &> /dev/null; then
  log_error "State bucket gs://${TF_STATE_BUCKET} not found"
  log_error "Run bootstrap first: ./scripts/gcp/bootstrap.sh"
  exit 1
fi
log_success "State bucket verified"

# Verify .dockerignore exists
BACKEND_DOCKERIGNORE="${REPO_ROOT}/backend/.dockerignore"

if [ ! -f "${BACKEND_DOCKERIGNORE}" ]; then
  log_warn ".dockerignore not found at ${BACKEND_DOCKERIGNORE}"
  log_warn "Docker builds may be slow. Creating one now..."

  cat > "${BACKEND_DOCKERIGNORE}" << 'EOF'
node_modules
npm-debug.log
.env
.env.*
!.env.local.example
dist
coverage
*.log
.vscode
.idea
.DS_Store
.git
.gitignore
README.md
whatsapp-sessions
uploads
logs
jest-backend-report.json
EOF
  log_success "Created .dockerignore"
fi

# Navigate to terraform directory
TERRAFORM_DIR="${REPO_ROOT}/infra/terraform/environments/dev"
if [ ! -d "${TERRAFORM_DIR}" ]; then
  log_error "Terraform directory not found: ${TERRAFORM_DIR}"
  exit 1
fi

cd "${TERRAFORM_DIR}"

# Terraform Init
log_info "Initializing Terraform (project=${PROJECT_ID}, region=${REGION}, env=${ENVIRONMENT_NAME})..."
tofu init \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="prefix=${TF_STATE_PREFIX}" \
  -reconfigure

# ---------------------------------------------------------------------------
# Firestore default database is a singleton per project. If it already exists
# (common when re-running deploys), Terraform must import it or create will fail
# with 409 "Database already exists".
# ---------------------------------------------------------------------------
log_info "Ensuring Firestore database is managed (import if it already exists)..."
if ! tofu state list 2>/dev/null | grep -q "^google_firestore_database\.main$"; then
  if gcloud firestore databases describe --database="(default)" --project="${PROJECT_ID}" --format="value(name)" >/dev/null 2>&1; then
    log_warn "Firestore '(default)' database already exists in GCP but not in state. Importing..."
    tofu import "google_firestore_database.main" "projects/${PROJECT_ID}/databases/(default)" || true
    log_success "Firestore database import step completed"
  else
    log_info "Firestore '(default)' database not found (or not accessible yet); Terraform will attempt to create it."
  fi
else
  log_success "Firestore database already present in Terraform state"
fi

# Terraform Plan
log_info "Planning infrastructure..."
PLAN_CMD=(
  tofu plan
  -var="project_id=${PROJECT_ID}"
  -var="region=${REGION}"
  -var="environment_name=${ENVIRONMENT_NAME}"
  -out=tfplan
)

if [ -n "${WPPCONNECT_IMAGE}" ]; then
  PLAN_CMD+=(-var="wppconnect_image=${WPPCONNECT_IMAGE}")
fi

"${PLAN_CMD[@]}"

# Terraform Apply
log_info "Applying infrastructure..."
tofu apply -lock-timeout=30m tfplan

# Extract outputs
log_info "Extracting Terraform outputs..."
BACKEND_URL=$(tofu output -raw backend_cloud_run_url)
BACKEND_PUBLIC_URL=$(tofu output -raw backend_public_url)
BACKEND_SERVICE_NAME=$(tofu output -raw backend_service_name)
SERVICE_ACCOUNT=$(tofu output -raw runtime_api_email)
ARTIFACT_REPO_URL=$(tofu output -raw artifact_repo_url)
WPPCONNECT_ARTIFACT_REPO_URL=$(tofu output -raw wppconnect_artifact_repo_url)
WPPCONNECT_URL=$(tofu output -raw wppconnect_base_url)
WPPCONNECT_FQDN=$(tofu output -raw wppconnect_fqdn)
BACKEND_FQDN=$(tofu output -raw backend_fqdn)
WPPCONNECT_VM_NAME=$(tofu output -raw wppconnect_vm_name)
WPPCONNECT_VM_ZONE=$(tofu output -raw wppconnect_vm_zone)
BACKEND_DOMAIN_MAPPING_RECORDS_JSON=$(tofu output -json backend_domain_mapping_records 2>/dev/null || echo "[]")
DNS_RECORDS_MANAGED=$(tofu output -raw dns_records_managed_by_terraform 2>/dev/null || echo "false")

# Extract artifact registry details
AR_REPO=$(echo "${ARTIFACT_REPO_URL}" | awk -F'/' '{print $3}')
WPPCONNECT_AR_REPO=$(echo "${WPPCONNECT_ARTIFACT_REPO_URL}" | awk -F'/' '{print $3}')

log_success "Infrastructure deployed successfully"
echo "  Backend Service:     ${BACKEND_SERVICE_NAME}"
echo "  Backend URL:         ${BACKEND_URL}"
echo "  Backend Public URL:  ${BACKEND_PUBLIC_URL}"
echo "  WPPConnect URL:      ${WPPCONNECT_URL}"
echo ""

if [ "${DNS_RECORDS_MANAGED}" != "true" ]; then
  log_warn "DNS records are not managed by Terraform in this environment."
  log_warn "Ensure these records exist before validation:"
  echo "  - ${WPPCONNECT_FQDN} -> ${WPPCONNECT_VM_NAME} public IP"
  echo "  - ${BACKEND_FQDN} -> Cloud Run custom domain target"
  if [ "${BACKEND_DOMAIN_MAPPING_RECORDS_JSON}" != "[]" ]; then
    echo "  Cloud Run suggested records: ${BACKEND_DOMAIN_MAPPING_RECORDS_JSON}"
  fi
fi

# Deploy custom WPPConnect image only when explicitly requested.
if is_true "${DEPLOY_WPPCONNECT}"; then
  log_info "Building and deploying custom WPPConnect image..."
  cd "${REPO_ROOT}"
  export PROJECT_ID="${PROJECT_ID}"
  export REGION="${REGION}"
  export WPPCONNECT_AR_REPO="${WPPCONNECT_AR_REPO}"
  export WPPCONNECT_VM_NAME="${WPPCONNECT_VM_NAME}"
  export WPPCONNECT_VM_ZONE="${WPPCONNECT_VM_ZONE}"
  export WPPCONNECT_FQDN="${WPPCONNECT_FQDN}"
  "${SCRIPT_DIR}/deploy-wppconnect.sh"
else
  log_info "Skipping WPPConnect build/deploy. Set DEPLOY_WPPCONNECT=true to rebuild it explicitly."
fi

# Derive Firebase/CORS inputs for backend with clear precedence:
# - FIREBASE_PROJECT_ID: caller env > .firebaserc > PROJECT_ID
# - CORS_ORIGINS: caller env > derived from FIREBASE_PROJECT_ID
log_info "Configuring CORS inputs for backend..."

if [ -z "${FIREBASE_PROJECT_ID:-}" ]; then
  if [ -f "${REPO_ROOT}/.firebaserc" ]; then
    FIREBASE_PROJECT_ID=$(jq -r '.projects.default // empty' "${REPO_ROOT}/.firebaserc" 2>/dev/null || echo "")
  else
    FIREBASE_PROJECT_ID=""
  fi
fi

if [ -z "${FIREBASE_PROJECT_ID}" ] || [ "${FIREBASE_PROJECT_ID}" = "your-project-id" ] || [ "${FIREBASE_PROJECT_ID}" = "YOUR_PROJECT_ID" ]; then
  FIREBASE_PROJECT_ID="${PROJECT_ID}"
fi

if [ -z "${CORS_ORIGINS:-}" ]; then
  CORS_ORIGINS="https://${FIREBASE_PROJECT_ID}.web.app,https://${FIREBASE_PROJECT_ID}.firebaseapp.com"
fi

log_info "FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID}"
log_info "CORS_ORIGINS: ${CORS_ORIGINS}"

# Deploy Backend
log_info "Deploying backend container..."
cd "${REPO_ROOT}"

export SERVICE_ACCOUNT="${SERVICE_ACCOUNT}"
export REGION="${REGION}"
export IMAGE_NAME="txai-backend"
export SERVICE_NAME="${BACKEND_SERVICE_NAME}"
export AR_REPO="${AR_REPO}"
export PROJECT_ID="${PROJECT_ID}"
export CORS_ORIGINS="${CORS_ORIGINS}"
export FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID}"
export WPPCONNECT_BASE_URL="${WPPCONNECT_URL}"
export PUBLIC_BASE_URL_OVERRIDE="${BACKEND_PUBLIC_URL}"

"${SCRIPT_DIR}/deploy-backend.sh"

# Wait for backend to be ready
log_info "Waiting for backend to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -sf "${BACKEND_PUBLIC_URL}/api/health" > /dev/null 2>&1 || curl -sf "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
    log_success "Backend is healthy"
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
    log_info "Waiting for backend... (${ATTEMPT}/${MAX_ATTEMPTS})"
    sleep 10
  else
    log_warn "Backend health check timed out, but continuing deployment"
    log_warn "Check manually: curl ${BACKEND_PUBLIC_URL}/api/health"
    log_warn "Fallback check: curl ${BACKEND_URL}/api/health"
  fi
done

# Deploy Frontend to Firebase Hosting
log_info "Deploying frontend to Firebase Hosting..."
export API_URL="${BACKEND_PUBLIC_URL}/api"

"${SCRIPT_DIR}/deploy-frontend-firebase.sh"

# Final summary
log_success "Deployment completed successfully!"
echo ""

# Get Firebase URL from .firebaserc
FIREBASE_PROJECT_ID=$(jq -r '.projects.default // empty' "${REPO_ROOT}/.firebaserc" 2>/dev/null || echo "")
if [ -n "${FIREBASE_PROJECT_ID}" ]; then
  FIREBASE_URL="https://${FIREBASE_PROJECT_ID}.web.app"
else
  FIREBASE_URL=""
fi

echo "========================================"
echo "Application URLs"
echo "========================================"
echo ""
if [ -n "${FIREBASE_URL}" ]; then
  echo "Frontend:   ${FIREBASE_URL}"
else
  echo "Frontend:   (missing .firebaserc, run setup-firebase.sh)"
fi
echo "Backend:    ${BACKEND_URL}"
echo "Backend API Domain: ${BACKEND_PUBLIC_URL}"
echo "Health:     ${BACKEND_URL}/api/health"
echo "WPPConnect: ${WPPCONNECT_URL}"
echo "WPPConnect Hostname: ${WPPCONNECT_FQDN}"
echo "Backend Hostname: ${BACKEND_FQDN}"
echo ""
echo "========================================"
echo "Next Steps"
echo "========================================"
echo ""
echo "1. Configure additional environment variables:"
echo "   gcloud run services update ${BACKEND_SERVICE_NAME} \\"
echo "     --region ${REGION} \\"
echo "     --update-env-vars JWT_SECRET=your-secret-here"
echo ""
echo "2. Test the application:"
echo "   curl ${BACKEND_PUBLIC_URL}/api/health"
echo "   curl https://${WPPCONNECT_FQDN}/api-docs"
echo ""
echo "3. Monitor logs:"
echo "   gcloud run services logs read ${BACKEND_SERVICE_NAME} --region ${REGION}"
echo "   gcloud compute ssh wppconnect-server --zone=us-central1-a --command='sudo docker logs -f wppconnect-server'"
echo ""
