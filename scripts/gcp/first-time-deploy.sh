#!/usr/bin/env bash
#
# First-Time Complete Deployment to GCP
# Orchestrates: Bootstrap → Infrastructure → Backend → Frontend
# This is the "one command to rule them all" script
#

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}==>${NC} $*"; }
log_success() { echo -e "${GREEN}==>${NC} $*"; }
log_warn() { echo -e "${YELLOW}==>${NC} $*"; }
log_error() { echo -e "${RED}==>${NC} $*"; }
log_step() { echo -e "${CYAN}>>> $*${NC}"; }

# Banner
echo ""
echo "========================================"
echo "  TXAI Support - First-Time GCP Deploy"
echo "========================================"
echo ""

# Configuration
PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
GITHUB_OWNER="${GITHUB_OWNER:-}"
GITHUB_REPO="${GITHUB_REPO:-}"
TF_STATE_BUCKET="${TF_STATE_BUCKET:-}"
SKIP_BOOTSTRAP="${SKIP_BOOTSTRAP:-false}"

# Validate required inputs
MISSING_VARS=()
if [ -z "${PROJECT_ID}" ]; then MISSING_VARS+=("PROJECT_ID"); fi
if [ -z "${GITHUB_OWNER}" ]; then MISSING_VARS+=("GITHUB_OWNER"); fi
if [ -z "${GITHUB_REPO}" ]; then MISSING_VARS+=("GITHUB_REPO"); fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  log_error "Missing required variables: ${MISSING_VARS[*]}"
  echo ""
  echo "Usage:"
  echo "  PROJECT_ID=your-project-id \\"
  echo "  GITHUB_OWNER=your-username \\"
  echo "  GITHUB_REPO=your-repo \\"
  echo "  $0"
  echo ""
  echo "Optional:"
  echo "  REGION=us-central1 (default: us-central1)"
  echo "  SKIP_BOOTSTRAP=true (skip bootstrap if already done)"
  echo "  TF_STATE_BUCKET=your-bucket (if bootstrap already done)"
  echo ""
  exit 1
fi

log_info "Deployment Configuration:"
echo "  Project ID:    ${PROJECT_ID}"
echo "  Region:        ${REGION}"
echo "  GitHub Owner:  ${GITHUB_OWNER}"
echo "  GitHub Repo:   ${GITHUB_REPO}"
echo "  Skip Bootstrap: ${SKIP_BOOTSTRAP}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Check prerequisites
log_step "Step 0: Checking Prerequisites"
log_info "Checking required tools..."

MISSING_TOOLS=()
command -v gcloud &> /dev/null || MISSING_TOOLS+=("gcloud")
command -v tofu &> /dev/null || MISSING_TOOLS+=("tofu")
command -v npm &> /dev/null || MISSING_TOOLS+=("npm")
command -v node &> /dev/null || MISSING_TOOLS+=("node")
command -v curl &> /dev/null || MISSING_TOOLS+=("curl")
command -v jq &> /dev/null || MISSING_TOOLS+=("jq")

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
  log_error "Missing required tools: ${MISSING_TOOLS[*]}"
  echo ""
  echo "Install instructions:"
  echo "  gcloud: https://cloud.google.com/sdk/docs/install"
  echo "  tofu:   brew install opentofu"
  echo "  node:   https://nodejs.org/ or brew install node"
  echo ""
  exit 1
fi

log_success "All required tools are installed"

# Check and install gcloud beta components if needed
log_info "Checking gcloud beta components..."
if ! gcloud components list --filter="id:beta AND state.name:Installed" --format="value(id)" 2>/dev/null | grep -q "beta"; then
  log_warn "Beta components not installed. Installing automatically..."
  gcloud components install beta --quiet
  log_success "Beta components installed"
else
  log_success "Beta components already installed"
fi

# Check gcloud authentication
log_info "Checking gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
  log_error "Not authenticated with gcloud"
  echo ""
  echo "Run: gcloud auth login"
  echo "Then: gcloud auth application-default login"
  exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
log_success "Authenticated as: ${ACTIVE_ACCOUNT}"

# Set active project
log_info "Setting active project to ${PROJECT_ID}..."
gcloud config set project "${PROJECT_ID}" &> /dev/null

# Check billing
log_info "Verifying billing is enabled..."
BILLING_ENABLED=$(gcloud beta billing projects describe "${PROJECT_ID}" --format="value(billingEnabled)" 2>/dev/null || echo "false")
if [ "${BILLING_ENABLED}" != "True" ]; then
  log_error "Billing is not enabled for ${PROJECT_ID}"
  echo "Enable at: https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}"
  exit 1
fi
log_success "Billing is enabled"

# Step 1: Bootstrap (if needed)
if [ "${SKIP_BOOTSTRAP}" = "false" ]; then
  log_step "Step 1: Running Bootstrap (One-time setup)"

  # Check if state bucket already exists
  if [ -n "${TF_STATE_BUCKET}" ]; then
    log_info "Checking if state bucket ${TF_STATE_BUCKET} exists..."
    if gsutil ls "gs://${TF_STATE_BUCKET}" &> /dev/null; then
      log_warn "State bucket already exists, skipping bootstrap"
      SKIP_BOOTSTRAP=true
    fi
  fi

  if [ "${SKIP_BOOTSTRAP}" = "false" ]; then
    log_info "Running bootstrap to create state bucket and WIF..."

    export PROJECT_ID REGION GITHUB_OWNER GITHUB_REPO
    "${SCRIPT_DIR}/bootstrap.sh"

    # Extract state bucket from bootstrap outputs
    BOOTSTRAP_DIR="${REPO_ROOT}/infra/terraform/bootstrap"
    cd "${BOOTSTRAP_DIR}"
    TF_STATE_BUCKET=$(tofu output -raw tf_state_bucket 2>/dev/null || echo "")

    if [ -z "${TF_STATE_BUCKET}" ]; then
      log_error "Failed to get state bucket from bootstrap"
      exit 1
    fi

    log_success "Bootstrap completed. State bucket: ${TF_STATE_BUCKET}"
  fi
else
  log_step "Step 1: Skipping Bootstrap (SKIP_BOOTSTRAP=true)"

  if [ -z "${TF_STATE_BUCKET}" ]; then
    log_error "TF_STATE_BUCKET must be provided when SKIP_BOOTSTRAP=true"
    exit 1
  fi

  log_info "Using existing state bucket: ${TF_STATE_BUCKET}"
fi

# Step 1.5: Initialize Firebase (if not already done)
log_step "Step 1.5: Setting up Firebase Hosting"

FIREBASE_PROJECT_ID=""
if [ -f "${REPO_ROOT}/.firebaserc" ]; then
  FIREBASE_PROJECT_ID=$(jq -r '.projects.default // empty' "${REPO_ROOT}/.firebaserc" 2>/dev/null || echo "")
fi

if [ -z "${FIREBASE_PROJECT_ID}" ] || [ "${FIREBASE_PROJECT_ID}" = "your-project-id" ] || [ "${FIREBASE_PROJECT_ID}" = "YOUR_PROJECT_ID" ]; then
  log_info "Initializing Firebase for the first time..."
  export PROJECT_ID REGION
  "${SCRIPT_DIR}/setup-firebase.sh"
else
  log_info "Firebase already initialized for ${FIREBASE_PROJECT_ID}"
fi

# Step 2: Deploy Infrastructure + Application
log_step "Step 2: Deploying Infrastructure and Application"

export PROJECT_ID REGION TF_STATE_BUCKET
"${SCRIPT_DIR}/deploy-all.sh"

# Step 3: Verify Deployment
log_step "Step 3: Verifying Deployment"

# Get outputs from terraform
TERRAFORM_DIR="${REPO_ROOT}/infra/terraform/environments/dev"
cd "${TERRAFORM_DIR}"

BACKEND_URL=$(tofu output -raw backend_cloud_run_url 2>/dev/null || echo "")
WPPCONNECT_URL=$(tofu output -raw wppconnect_cloud_run_url 2>/dev/null || echo "")
WPPCONNECT_SERVICE=$(tofu output -raw wppconnect_service_name 2>/dev/null || echo "txai-wppconnect-server")

if [ -z "${BACKEND_URL}" ]; then
  log_error "Failed to get backend URL from Terraform outputs"
  exit 1
fi

# Get Firebase URL from .firebaserc
PROJECT_ID=$(cat "${REPO_ROOT}/.firebaserc" | jq -r '.projects.default')
FIREBASE_URL="https://${PROJECT_ID}.web.app"

# Test backend health
log_info "Testing backend health endpoint..."
if curl -sf "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
  log_success "Backend is responding"
else
  log_warn "Backend health check failed (this might be expected if env vars not set yet)"
fi

# Check frontend
log_info "Checking frontend deployment..."
if curl -sf "${FIREBASE_URL}" > /dev/null 2>&1; then
  log_success "Frontend is accessible"
else
  log_warn "Frontend check failed (might take a moment to propagate)"
fi

# Final Summary
echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETE! 🚀"
echo "========================================"
echo ""
log_success "Your application is deployed to GCP!"
echo ""
echo "Application URLs:"
echo "  Frontend:   ${FIREBASE_URL}"
echo "  Backend:    ${BACKEND_URL}"
echo "  Health:     ${BACKEND_URL}/api/health"
echo "  WPPConnect: ${WPPCONNECT_URL}"
echo ""
echo "--------------------------------------"
echo "Important Next Steps:"
echo "--------------------------------------"
echo ""
BACKEND_SERVICE=$(tofu output -raw backend_service_name 2>/dev/null || echo "txai-backend")
echo "1. Configure Environment Variables (REQUIRED):"
echo "   The backend needs additional env vars like JWT_SECRET, SMTP settings, etc."
echo ""
echo "   Quick setup (use strong secrets in production!):"
echo "   gcloud run services update ${BACKEND_SERVICE} \\"
echo "     --region ${REGION} \\"
echo "     --update-env-vars \\"
echo "       JWT_SECRET=\$(openssl rand -base64 32),\\"
echo "       NODE_ENV=production"
echo ""
echo "2. Set up GitHub Secrets (for CI/CD):"
echo "   Go to: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/settings/secrets/actions"
echo "   Add these secrets (get from bootstrap outputs):"
cd "${REPO_ROOT}/infra/terraform/bootstrap"
WIF_PROVIDER=$(tofu output -raw wif_provider 2>/dev/null || echo "N/A")
TF_SERVICE_ACCOUNT=$(tofu output -raw tf_service_account 2>/dev/null || echo "N/A")
echo "     - GCP_PROJECT_ID = ${PROJECT_ID}"
echo "     - GCP_REGION = ${REGION}"
echo "     - GCP_WIF_PROVIDER = ${WIF_PROVIDER}"
echo "     - GCP_TF_SERVICE_ACCOUNT = ${TF_SERVICE_ACCOUNT}"
echo "     - TF_STATE_BUCKET = ${TF_STATE_BUCKET}"
echo ""
echo "3. Test Your Application:"
echo "   curl ${BACKEND_URL}/api/health"
echo "   open ${FIREBASE_URL}"
echo ""
echo "4. Monitor Logs:"
echo "   gcloud run services logs read ${BACKEND_SERVICE} --region ${REGION} --limit 50"
echo "   gcloud run services logs read ${WPPCONNECT_SERVICE} --region ${REGION} --limit 50"
echo ""
echo "5. Manage Database Migrations:"
echo "   Cloud Run automatically runs 'prisma migrate deploy' on startup"
echo "   Check logs if you have migration issues"
echo ""
echo "--------------------------------------"
echo "Useful Commands:"
echo "--------------------------------------"
echo ""
echo "# Redeploy backend only:"
echo "  cd ${REPO_ROOT}"
echo "  ./scripts/gcp/deploy-backend.sh"
echo ""
echo "# Redeploy frontend only:"
echo "  ./scripts/gcp/deploy-frontend-firebase.sh"
echo ""
echo "# View Cloud Run services:"
echo "  gcloud run services list --region ${REGION}"
echo ""
echo "# View Firebase Hosting sites:"
echo "  npx firebase hosting:sites:list"
echo ""
echo "# Access Cloud SQL:"
echo "  gcloud sql connect \$(gcloud sql instances list --format='value(name)') --user=txai"
echo ""
echo "========================================"
echo ""
