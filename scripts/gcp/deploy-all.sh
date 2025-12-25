#!/usr/bin/env bash
#
# Deploy Complete Application to GCP
# Requires: Bootstrap already completed, PROJECT_ID and TF_STATE_BUCKET set
#

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}==>${NC} $*"; }
log_success() { echo -e "${GREEN}==>${NC} $*"; }
log_warn() { echo -e "${YELLOW}==>${NC} $*"; }
log_error() { echo -e "${RED}==>${NC} $*"; }

# Configuration
PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
TF_STATE_BUCKET="${TF_STATE_BUCKET:-}"
TF_STATE_PREFIX="${TF_STATE_PREFIX:-txai-support/${ENVIRONMENT_NAME}}"

# Validate required variables
if [ -z "${PROJECT_ID}" ]; then
  log_error "PROJECT_ID is required"
  echo "Usage: PROJECT_ID=your-project TF_STATE_BUCKET=your-tfstate-bucket $0"
  exit 1
fi

if [ -z "${TF_STATE_BUCKET}" ]; then
  log_error "TF_STATE_BUCKET is required (created during bootstrap)"
  echo "Usage: PROJECT_ID=your-project TF_STATE_BUCKET=your-tfstate-bucket $0"
  echo ""
  echo "If you haven't run bootstrap yet, run: ./scripts/gcp/bootstrap.sh"
  exit 1
fi

log_info "Deployment Configuration:"
echo "  Project ID:     ${PROJECT_ID}"
echo "  Region:         ${REGION}"
echo "  Environment:    ${ENVIRONMENT_NAME}"
echo "  State Bucket:   ${TF_STATE_BUCKET}"
echo ""

# Check prerequisites
log_info "Checking prerequisites..."

# Check gcloud
if ! command -v gcloud &> /dev/null; then
  log_error "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Check tofu
if ! command -v tofu &> /dev/null; then
  log_error "OpenTofu not found. Install: brew install opentofu"
  exit 1
fi

# Check jq
if ! command -v jq &> /dev/null; then
  log_error "jq not found. Install: brew install jq"
  exit 1
fi

# Verify gcloud authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
  log_error "Not authenticated. Run: gcloud auth login"
  exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
log_success "Authenticated as: ${ACTIVE_ACCOUNT}"

# Set active project
log_info "Setting active project..."
gcloud config set project "${PROJECT_ID}" &> /dev/null

# Verify state bucket exists
log_info "Verifying state bucket exists..."
if ! gcloud storage buckets describe "gs://${TF_STATE_BUCKET}" &> /dev/null; then
  log_error "State bucket gs://${TF_STATE_BUCKET} not found"
  log_error "Run bootstrap first: ./scripts/gcp/bootstrap.sh"
  exit 1
fi
log_success "State bucket verified"

# Verify .dockerignore exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DOCKERIGNORE="${REPO_ROOT}/backend/.dockerignore"

if [ ! -f "${BACKEND_DOCKERIGNORE}" ]; then
  log_warn ".dockerignore not found at ${BACKEND_DOCKERIGNORE}"
  log_warn "Docker builds may be slow. Creating one now..."

  cat > "${BACKEND_DOCKERIGNORE}" << 'EOF'
node_modules
npm-debug.log
.env
.env.*
!.env.example
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

# Terraform Plan
log_info "Planning infrastructure..."
tofu plan \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="environment_name=${ENVIRONMENT_NAME}" \
  -out=tfplan

# Terraform Apply
log_info "Applying infrastructure..."
tofu apply tfplan

# Extract outputs
log_info "Extracting Terraform outputs..."
BACKEND_URL=$(tofu output -raw backend_cloud_run_url)
BACKEND_SERVICE_NAME=$(tofu output -raw backend_service_name)
SERVICE_ACCOUNT=$(tofu output -raw runtime_api_email)
ARTIFACT_REPO_URL=$(tofu output -raw artifact_repo_url)

# Extract artifact registry details
AR_REPO=$(echo "${ARTIFACT_REPO_URL}" | awk -F'/' '{print $3}')

log_success "Infrastructure deployed successfully"
echo "  Backend Service:  ${BACKEND_SERVICE_NAME}"
echo "  Backend URL:      ${BACKEND_URL}"
echo ""

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

"${SCRIPT_DIR}/deploy-backend.sh"

# Wait for backend to be ready
log_info "Waiting for backend to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -sf "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
    log_success "Backend is healthy"
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
    log_info "Waiting for backend... (${ATTEMPT}/${MAX_ATTEMPTS})"
    sleep 10
  else
    log_warn "Backend health check timed out, but continuing deployment"
    log_warn "Check manually: curl ${BACKEND_URL}/api/health"
  fi
done

# Deploy Frontend to Firebase Hosting
log_info "Deploying frontend to Firebase Hosting..."
export API_URL="${BACKEND_URL}/api"

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
  echo "Frontend: ${FIREBASE_URL}"
else
  echo "Frontend: (missing .firebaserc, run setup-firebase.sh)"
fi
echo "Backend:  ${BACKEND_URL}"
echo "Health:   ${BACKEND_URL}/api/health"
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
echo "   curl ${BACKEND_URL}/api/health"
echo ""
echo "3. Monitor logs:"
echo "   gcloud run services logs read ${BACKEND_SERVICE_NAME} --region ${REGION}"
echo ""
