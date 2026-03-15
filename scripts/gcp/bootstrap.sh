#!/usr/bin/env bash
#
# Bootstrap GCP Infrastructure (One-time setup)
# Creates: State bucket, WIF provider, Terraform admin service account
#

set -euo pipefail

# Shared helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

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

require_command "gcloud" "Please install: https://cloud.google.com/sdk/docs/install"
require_command "tofu" "Please install: brew install opentofu"

log_info "Verifying gcloud authentication..."
ACTIVE_ACCOUNT=$(require_gcloud_auth)
log_success "Authenticated as: ${ACTIVE_ACCOUNT}"

set_gcloud_project "${PROJECT_ID}"

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
REPO_ROOT="$(resolve_repo_root "${SCRIPT_DIR}")"
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
