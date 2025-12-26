#!/usr/bin/env bash
#
# Bootstrap GCP Infrastructure (One-time setup)
# Creates: State bucket, WIF provider, Terraform admin service account
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

# Required variables
PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
GITHUB_OWNER="${GITHUB_OWNER:-}"
GITHUB_REPO="${GITHUB_REPO:-}"
STATE_BUCKET_NAME="${STATE_BUCKET_NAME:-}"

# Validate required inputs
if [ -z "${PROJECT_ID}" ]; then
  log_error "PROJECT_ID is required"
  echo "Usage: PROJECT_ID=your-project-id GITHUB_OWNER=your-username GITHUB_REPO=your-repo $0"
  exit 1
fi

if [ -z "${GITHUB_OWNER}" ]; then
  log_error "GITHUB_OWNER is required"
  echo "Usage: PROJECT_ID=your-project-id GITHUB_OWNER=your-username GITHUB_REPO=your-repo $0"
  exit 1
fi

if [ -z "${GITHUB_REPO}" ]; then
  log_error "GITHUB_REPO is required"
  echo "Usage: PROJECT_ID=your-project-id GITHUB_OWNER=your-username GITHUB_REPO=your-repo $0"
  exit 1
fi

log_info "Bootstrap Configuration:"
echo "  Project ID:    ${PROJECT_ID}"
echo "  Region:        ${REGION}"
echo "  GitHub Owner:  ${GITHUB_OWNER}"
echo "  GitHub Repo:   ${GITHUB_REPO}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  log_error "gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Check if tofu is installed
if ! command -v tofu &> /dev/null; then
  log_error "OpenTofu (tofu) not found. Please install: brew install opentofu"
  exit 1
fi

# Verify gcloud authentication
log_info "Verifying gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
  log_error "Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
log_success "Authenticated as: ${ACTIVE_ACCOUNT}"

# Set active project
log_info "Setting active project to ${PROJECT_ID}..."
if ! gcloud config set project "${PROJECT_ID}" &> /dev/null; then
  log_error "Failed to set project. Does the project exist?"
  exit 1
fi

# Check if project has billing enabled
log_info "Checking billing status..."
BILLING_ENABLED=$(gcloud beta billing projects describe "${PROJECT_ID}" --format="value(billingEnabled)" 2>/dev/null || echo "false")
if [ "${BILLING_ENABLED}" != "True" ]; then
  log_error "Billing is not enabled for project ${PROJECT_ID}"
  log_error "Enable billing: https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}"
  exit 1
fi
log_success "Billing is enabled"

# Enable required APIs for bootstrap
log_info "Enabling required APIs (this may take a few minutes)..."
BOOTSTRAP_APIS=(
  "cloudresourcemanager.googleapis.com"
  "iam.googleapis.com"
  "iamcredentials.googleapis.com"
  "storage.googleapis.com"
  "serviceusage.googleapis.com"
)

for api in "${BOOTSTRAP_APIS[@]}"; do
  log_info "  Enabling ${api}..."
  gcloud services enable "${api}" --project="${PROJECT_ID}" 2>&1 | grep -v "already enabled" || true
done
log_success "Required APIs enabled"

# Navigate to bootstrap directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BOOTSTRAP_DIR="${REPO_ROOT}/infra/terraform/bootstrap"

if [ ! -d "${BOOTSTRAP_DIR}" ]; then
  log_error "Bootstrap directory not found: ${BOOTSTRAP_DIR}"
  exit 1
fi

cd "${BOOTSTRAP_DIR}"
log_info "Working directory: ${BOOTSTRAP_DIR}"

# Initialize Terraform
log_info "Initializing Terraform..."
tofu init

# Plan
log_info "Planning bootstrap infrastructure..."
tofu plan \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="github_owner=${GITHUB_OWNER}" \
  -var="github_repo=${GITHUB_REPO}" \
  ${STATE_BUCKET_NAME:+-var="state_bucket_name=${STATE_BUCKET_NAME}"} \
  -out=tfplan

# Apply
log_warn "About to create bootstrap infrastructure. This is a ONE-TIME operation."
read -p "Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
  log_warn "Bootstrap cancelled"
  exit 0
fi

log_info "Applying bootstrap infrastructure..."
tofu apply -lock-timeout=30m tfplan

# Get outputs
log_info "Extracting outputs..."
TF_STATE_BUCKET=$(tofu output -raw tf_state_bucket)
WIF_PROVIDER=$(tofu output -raw wif_provider)
TF_SERVICE_ACCOUNT=$(tofu output -raw tf_service_account)

# Display summary
log_success "Bootstrap completed successfully!"
echo ""
echo "========================================"
echo "IMPORTANT: Save these values"
echo "========================================"
echo ""
echo "TF_STATE_BUCKET=${TF_STATE_BUCKET}"
echo "WIF_PROVIDER=${WIF_PROVIDER}"
echo "TF_SERVICE_ACCOUNT=${TF_SERVICE_ACCOUNT}"
echo ""
echo "========================================"
echo "Next Steps:"
echo "========================================"
echo ""
echo "1. Add these GitHub Secrets to your repository:"
echo "   - GCP_WIF_PROVIDER = ${WIF_PROVIDER}"
echo "   - GCP_TF_SERVICE_ACCOUNT = ${TF_SERVICE_ACCOUNT}"
echo "   - TF_STATE_BUCKET = ${TF_STATE_BUCKET}"
echo ""
echo "2. Run the deployment:"
echo "   PROJECT_ID=${PROJECT_ID} TF_STATE_BUCKET=${TF_STATE_BUCKET} ./scripts/gcp/deploy-all.sh"
echo ""
echo "   Or use the complete first-time deploy script:"
echo "   PROJECT_ID=${PROJECT_ID} TF_STATE_BUCKET=${TF_STATE_BUCKET} ./scripts/gcp/first-time-deploy.sh"
echo ""
