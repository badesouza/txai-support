#!/usr/bin/env bash
#
# Destroy Complete GCP Infrastructure
# WARNING: This will destroy all cloud resources including:
#  - Cloud Run services
#  - Compute Engine VMs
#  - Firestore database
#  - GCS buckets (with manual cleanup)
#  - Service accounts and secrets
#
# State bucket and protected buckets require manual deletion
#

set -euo pipefail

# Get script and repo root directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"
REPO_ROOT="$(resolve_repo_root "${SCRIPT_DIR}")"

load_repo_env_files "${REPO_ROOT}"

# Configuration
PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
TF_STATE_BUCKET="${TF_STATE_BUCKET:-}"
TF_STATE_PREFIX="${TF_STATE_PREFIX:-txai-support/${ENVIRONMENT_NAME}}"
UPLOADS_BUCKET="${UPLOADS_BUCKET:-${PROJECT_ID}-uploads}"
DESTROY_STATE_BUCKET="${DESTROY_STATE_BUCKET:-false}"

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
  exit 1
fi

echo ""
log_danger "⚠️  INFRASTRUCTURE DESTRUCTION INITIATED"
echo ""
log_warn "This will DESTROY:"
echo "  ✗ Cloud Run backend service"
echo "  ✗ Compute Engine VM (wppconnect-server)"
echo "  ✗ Firestore database (${ENVIRONMENT_NAME})"
echo "  ✗ GCS uploads bucket"
echo "  ✗ Service accounts and secrets"
echo "  ✗ Artifact Registry"
echo ""
echo "Configuration:"
echo "  Project ID:       ${PROJECT_ID}"
echo "  Environment:      ${ENVIRONMENT_NAME}"
echo "  Region:           ${REGION}"
echo "  State Bucket:     ${TF_STATE_BUCKET}"
echo "  Uploads Bucket:   ${UPLOADS_BUCKET}"
echo ""

# Confirmation prompt
read -p "$(echo -e ${RED}Type 'destroy' to continue: ${NC})" -r
echo ""
if [[ ! $REPLY =~ ^destroy$ ]]; then
  log_warn "Destruction cancelled"
  exit 0
fi

# Additional confirmation for non-dev environments
if [ "${ENVIRONMENT_NAME}" != "dev" ]; then
  log_danger "⚠️  You are destroying the ${ENVIRONMENT_NAME} environment!"
  read -p "$(echo -e ${RED}Type 'destroy-${ENVIRONMENT_NAME}' to confirm: ${NC})" -r
  echo ""
  if [[ ! $REPLY =~ ^destroy-${ENVIRONMENT_NAME}$ ]]; then
    log_warn "Destruction cancelled"
    exit 0
  fi
fi

# Check prerequisites
log_info "Checking prerequisites..."

require_command "gcloud" "Install: https://cloud.google.com/sdk/docs/install"
require_command "tofu" "Install: brew install opentofu"
require_command "gsutil" "Install: gcloud components install gsutil"

ACTIVE_ACCOUNT=$(require_gcloud_auth)
log_success "Authenticated as: ${ACTIVE_ACCOUNT}"

set_gcloud_project "${PROJECT_ID}"
log_success "Project set to ${PROJECT_ID}"

# Step 1: Destroy dev environment resources
log_info "Step 1: Destroying infrastructure in ${ENVIRONMENT_NAME} environment..."

TERRAFORM_DIR="${REPO_ROOT}/infra/terraform/environments/dev"
if [ ! -d "${TERRAFORM_DIR}" ]; then
  log_error "Terraform directory not found: ${TERRAFORM_DIR}"
  exit 1
fi

cd "${TERRAFORM_DIR}"
log_info "Changed to: ${TERRAFORM_DIR}"

# Initialize Terraform with remote backend
log_info "Initializing Terraform backend..."
tofu init \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="prefix=${TF_STATE_PREFIX}" \
  -upgrade \
  -reconfigure || {
  log_error "Terraform initialization failed"
  exit 1
}

# Show what will be destroyed
log_info "Showing destruction plan..."
tofu plan -destroy -out=destroy.tfplan || {
  log_error "Terraform plan failed"
  exit 1
}

# Confirm before destruction
log_danger "Review the plan above carefully. This action is IRREVERSIBLE."
read -p "$(echo -e ${RED}Type 'yes' to destroy resources: ${NC})" -r
echo ""
if [[ ! $REPLY =~ ^yes$ ]]; then
  log_warn "Destruction cancelled"
  rm -f destroy.tfplan
  exit 0
fi

# Execute destruction
log_danger "Destroying Terraform-managed resources..."
tofu apply destroy.tfplan || {
  log_error "Terraform destruction failed"
  log_warn "State may be inconsistent. Check GCP console for remaining resources."
  exit 1
}

rm -f destroy.tfplan
log_success "Terraform-managed resources destroyed"

# Step 2: Handle protected GCS buckets
log_info "Step 2: Handling protected GCS buckets..."

# Empty uploads bucket
if gsutil -q ls "gs://${UPLOADS_BUCKET}" &> /dev/null 2>&1; then
  log_warn "Uploads bucket exists: gs://${UPLOADS_BUCKET}"
  log_info "Emptying bucket (this may take a while)..."
  gsutil -m rm -r "gs://${UPLOADS_BUCKET}/*" 2>/dev/null || {
    log_warn "Some objects may not have been deleted, proceeding..."
  }
  
  # Attempt deletion
  log_info "Deleting bucket..."
  gcloud storage buckets delete "gs://${UPLOADS_BUCKET}" --quiet 2>/dev/null || {
    log_warn "Could not delete uploads bucket. It may have retention policies or other protections."
    log_info "Delete manually if needed: gcloud storage buckets delete gs://${UPLOADS_BUCKET}"
  }
else
  log_success "Uploads bucket already gone"
fi

# Step 3: Optional state bucket destruction
if [ "${DESTROY_STATE_BUCKET}" = "true" ]; then
  log_info "Step 3: Destroying state bucket (DESTROY_STATE_BUCKET=true)..."
  
  if gsutil -q ls "gs://${TF_STATE_BUCKET}" &> /dev/null 2>&1; then
    log_warn "State bucket exists: gs://${TF_STATE_BUCKET}"
    log_info "Emptying bucket (this may take a while)..."
    gsutil -m rm -r "gs://${TF_STATE_BUCKET}/*" 2>/dev/null || {
      log_warn "Some objects may not have been deleted, proceeding..."
    }
    
    log_info "Deleting state bucket..."
    gcloud storage buckets delete "gs://${TF_STATE_BUCKET}" --quiet 2>/dev/null || {
      log_error "Could not delete state bucket."
      log_info "Delete manually: gcloud storage buckets delete gs://${TF_STATE_BUCKET}"
    }
  fi
else
  log_warn "State bucket NOT deleted (DESTROY_STATE_BUCKET=false)"
  log_info "To destroy state bucket later, run:"
  echo "  gsutil -m rm -r gs://${TF_STATE_BUCKET}/*"
  echo "  gcloud storage buckets delete gs://${TF_STATE_BUCKET}"
  echo ""
  echo "Or set DESTROY_STATE_BUCKET=true before running this script"
fi

# Step 4: Optional bootstrap destruction
log_info "Step 4: Bootstrap destruction..."
read -p "$(echo -e ${YELLOW}Destroy bootstrap infrastructure too? (y/n): ${NC})" -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  BOOTSTRAP_DIR="${REPO_ROOT}/infra/terraform/bootstrap"
  
  if [ ! -d "${BOOTSTRAP_DIR}" ]; then
    log_error "Bootstrap directory not found: ${BOOTSTRAP_DIR}"
  else
    cd "${BOOTSTRAP_DIR}"
    log_info "Changed to: ${BOOTSTRAP_DIR}"
    
    log_info "Initializing Bootstrap Terraform..."
    tofu init -upgrade || {
      log_error "Bootstrap terraform initialization failed"
      exit 1
    }
    
    log_info "Showing bootstrap destruction plan..."
    tofu plan -destroy -out=destroy-bootstrap.tfplan || {
      log_error "Bootstrap terraform plan failed"
      exit 1
    }
    
    log_danger "Review bootstrap destruction plan above."
    read -p "$(echo -e ${RED}Type 'yes' to destroy bootstrap: ${NC})" -r
    echo ""
    
    if [[ $REPLY =~ ^yes$ ]]; then
      log_danger "Destroying bootstrap infrastructure..."
      tofu apply destroy-bootstrap.tfplan || {
        log_error "Bootstrap destruction failed"
        exit 1
      }
      rm -f destroy-bootstrap.tfplan
      log_success "Bootstrap infrastructure destroyed"
    else
      log_warn "Bootstrap destruction cancelled"
      rm -f destroy-bootstrap.tfplan
    fi
  fi
else
  log_info "Bootstrap destruction skipped"
fi

# Summary
echo ""
log_success "Destruction complete!"
echo ""
log_info "Summary of destroyed resources:"
echo "  ✓ Cloud Run services"
echo "  ✓ Compute Engine VM and disks"
echo "  ✓ Firestore database"
echo "  ✓ Service accounts and secrets"
echo "  ✓ Artifact Registry"
echo ""

log_warn "Manual cleanup may be required:"
echo ""
log_info "Check GCP Console for remaining resources:"
log_info "  - Static IP addresses"
log_info "  - Firewall rules"
log_info "  - Any orphaned disks"
echo ""

if [ "${DESTROY_STATE_BUCKET}" != "true" ]; then
  log_warn "State bucket still exists (for recovery): gs://${TF_STATE_BUCKET}"
  echo "  To clean up completely, run:"
  echo "  gsutil -m rm -r gs://${TF_STATE_BUCKET}/*"
  echo "  gcloud storage buckets delete gs://${TF_STATE_BUCKET}"
fi

echo ""
log_success "Infrastructure destruction finished successfully!"
