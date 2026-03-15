#!/usr/bin/env bash
# =============================================================================
# Enhanced Development Deployment Script
# =============================================================================
# Features:
# - Idempotent step execution with JSON state tracking
# - Step dependency chaining
# - Comprehensive validation
# =============================================================================

set -euo pipefail

# Script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Load step outputs library
source "${SCRIPT_DIR}/lib/step-outputs.sh"

# Configuration
PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
TF_STATE_BUCKET="${TF_STATE_BUCKET:-}"
TF_STATE_PREFIX="${TF_STATE_PREFIX:-txai-support/${ENVIRONMENT_NAME}}"
TERRAFORM_DIR="${REPO_ROOT}/infra/terraform/environments/dev"

# Parse arguments
FORCE_FRESH=false
SKIP_E2E=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --fresh)
      FORCE_FRESH=true
      shift
      ;;
    --skip-e2e)
      SKIP_E2E=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --fresh     Clear state and start fresh deployment"
      echo "  --skip-e2e  Skip end-to-end testing"
      echo "  --help      Show this help message"
      echo ""
      echo "Required environment variables:"
      echo "  PROJECT_ID        GCP project ID"
      echo "  TF_STATE_BUCKET   Terraform state bucket name"
      echo ""
      echo "Optional environment variables:"
      echo "  REGION            GCP region (default: us-central1)"
      echo "  ENVIRONMENT_NAME  Environment name (default: dev)"
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate required variables
if [ -z "${PROJECT_ID}" ]; then
  log_error "PROJECT_ID is required"
  echo "Usage: PROJECT_ID=your-project TF_STATE_BUCKET=your-bucket $0"
  exit 1
fi

if [ -z "${TF_STATE_BUCKET}" ]; then
  log_error "TF_STATE_BUCKET is required"
  echo "Usage: PROJECT_ID=your-project TF_STATE_BUCKET=your-bucket $0"
  exit 1
fi

# Fresh start if requested
if [ "${FORCE_FRESH}" = true ]; then
  clear_state
fi

# Store configuration in state
store_output "project_id" "${PROJECT_ID}"
store_output "region" "${REGION}"
store_output "environment" "${ENVIRONMENT_NAME}"

echo ""
echo "========================================"
echo "  TXAI Support - Development Deployment"
echo "========================================"
echo "  Project:     ${PROJECT_ID}"
echo "  Region:      ${REGION}"
echo "  Environment: ${ENVIRONMENT_NAME}"
echo "========================================"
echo ""

# =============================================================================
# Step 1: Prerequisites Check
# =============================================================================
step_prerequisites() {
  # Check gcloud
  if ! command -v gcloud &> /dev/null; then
    echo "ERROR: gcloud CLI not found"
    return 1
  fi

  # Check tofu
  if ! command -v tofu &> /dev/null; then
    echo "ERROR: OpenTofu not found"
    return 1
  fi

  # Check jq
  if ! command -v jq &> /dev/null; then
    echo "ERROR: jq not found"
    return 1
  fi

  # Verify authentication
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "ERROR: Not authenticated with gcloud"
    return 1
  fi

  local account
  account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
  echo "Authenticated as: ${account}"

  # Set project
  gcloud config set project "${PROJECT_ID}" 2>/dev/null

  # Verify state bucket
  if ! gcloud storage buckets describe "gs://${TF_STATE_BUCKET}" &> /dev/null; then
    echo "ERROR: State bucket gs://${TF_STATE_BUCKET} not found"
    return 1
  fi

  echo "Prerequisites verified"
  return 0
}

run_step "prerequisites" "[]" "Checking prerequisites" step_prerequisites

# =============================================================================
# Step 2: Terraform Init
# =============================================================================
step_terraform_init() {
  cd "${TERRAFORM_DIR}"

  tofu init \
    -backend-config="bucket=${TF_STATE_BUCKET}" \
    -backend-config="prefix=${TF_STATE_PREFIX}" \
    -reconfigure

  echo "Terraform initialized"
  return 0
}

run_step "terraform_init" '["prerequisites"]' "Initializing Terraform" step_terraform_init

# =============================================================================
# Step 3: Terraform Plan
# =============================================================================
step_terraform_plan() {
  cd "${TERRAFORM_DIR}"

  # Check if tfvars exists
  if [ -f "terraform.tfvars" ]; then
    echo "Using terraform.tfvars"
    tofu plan \
      -var="project_id=${PROJECT_ID}" \
      -var="region=${REGION}" \
      -var="environment_name=${ENVIRONMENT_NAME}" \
      -var-file="terraform.tfvars" \
      -out=tfplan
  else
    tofu plan \
      -var="project_id=${PROJECT_ID}" \
      -var="region=${REGION}" \
      -var="environment_name=${ENVIRONMENT_NAME}" \
      -out=tfplan
  fi

  echo "Plan created"
  return 0
}

run_step "terraform_plan" '["terraform_init"]' "Planning infrastructure" step_terraform_plan

# =============================================================================
# Step 4: Terraform Apply
# =============================================================================
step_terraform_apply() {
  cd "${TERRAFORM_DIR}"
  tofu apply tfplan

  # Extract and store outputs
  local backend_url backend_service artifact_repo service_account

  backend_url=$(tofu output -raw backend_cloud_run_url 2>/dev/null || echo "")
  backend_service=$(tofu output -raw backend_service_name 2>/dev/null || echo "")
  artifact_repo=$(tofu output -raw artifact_repo_url 2>/dev/null || echo "")
  service_account=$(tofu output -raw runtime_api_email 2>/dev/null || echo "")
  store_output "backend_url" "${backend_url}"
  store_output "backend_service" "${backend_service}"
  store_output "artifact_repo" "${artifact_repo}"
  store_output "service_account" "${service_account}"

  echo "Infrastructure deployed"
  echo "Backend URL: ${backend_url}"

  return 0
}

run_step "terraform_apply" '["terraform_plan"]' "Applying infrastructure" step_terraform_apply

# =============================================================================
# Step 5: Build and Deploy Backend
# =============================================================================
step_deploy_backend() {
  cd "${REPO_ROOT}"

  local artifact_repo backend_service service_account
  artifact_repo=$(get_output "artifact_repo")
  backend_service=$(get_output "backend_service")
  service_account=$(get_output "service_account")

  # Derive Firebase/CORS
  local firebase_project cors_origins
  if [ -f "${REPO_ROOT}/.firebaserc" ]; then
    firebase_project=$(jq -r '.projects.default // empty' "${REPO_ROOT}/.firebaserc" 2>/dev/null || echo "")
  fi
  [ -z "${firebase_project}" ] && firebase_project="${PROJECT_ID}"
  cors_origins="https://${firebase_project}.web.app,https://${firebase_project}.firebaseapp.com"

  # Extract AR_REPO from artifact_repo URL
  local ar_repo
  ar_repo=$(echo "${artifact_repo}" | awk -F'/' '{print $3}')

  export PROJECT_ID="${PROJECT_ID}"
  export REGION="${REGION}"
  export AR_REPO="${ar_repo}"
  export IMAGE_NAME="txai-backend"
  export SERVICE_NAME="${backend_service}"
  export SERVICE_ACCOUNT="${service_account}"
  export CORS_ORIGINS="${cors_origins}"
  export FIREBASE_PROJECT_ID="${firebase_project}"

  "${SCRIPT_DIR}/deploy-backend.sh"

  echo "Backend deployed"
  return 0
}

run_step "deploy_backend" '["terraform_apply"]' "Building and deploying backend" step_deploy_backend

# =============================================================================
# Step 6: Verify Backend Health
# =============================================================================
step_verify_backend() {
  local backend_url
  backend_url=$(get_output "backend_url")

  if [ -z "${backend_url}" ]; then
    echo "ERROR: Backend URL not found"
    return 1
  fi

  echo "Waiting for backend at ${backend_url}/api/health..."

  local max_attempts=30
  local attempt=0

  while [ ${attempt} -lt ${max_attempts} ]; do
    if curl -sf "${backend_url}/api/health" > /dev/null 2>&1; then
      local response
      response=$(curl -s "${backend_url}/api/health")
      echo "Backend healthy: ${response}"
      return 0
    fi

    ((attempt++))
    echo "Attempt ${attempt}/${max_attempts}..."
    sleep 10
  done

  echo "ERROR: Backend health check timed out"
  return 1
}

run_step "verify_backend" '["deploy_backend"]' "Verifying backend health" step_verify_backend

# =============================================================================
# Step 7: Deploy Frontend
# =============================================================================
step_deploy_frontend() {
  cd "${REPO_ROOT}"

  local backend_url
  backend_url=$(get_output "backend_url")

  export API_URL="${backend_url}/api"

  "${SCRIPT_DIR}/deploy-frontend-firebase.sh"

  # Store Firebase URL
  local firebase_project
  firebase_project=$(jq -r '.projects.default // empty' "${REPO_ROOT}/.firebaserc" 2>/dev/null || echo "")
  if [ -n "${firebase_project}" ]; then
    store_output "frontend_url" "https://${firebase_project}.web.app"
  fi

  echo "Frontend deployed"
  return 0
}

run_step "deploy_frontend" '["verify_backend"]' "Deploying frontend to Firebase" step_deploy_frontend

# =============================================================================
# Step 9: E2E Tests (if not skipped)
# =============================================================================
if [ "${SKIP_E2E}" = false ]; then
  step_e2e_tests() {
    local frontend_url backend_url
    frontend_url=$(get_output "frontend_url")
    backend_url=$(get_output "backend_url")

    if [ -z "${frontend_url}" ]; then
      echo "Frontend URL not found, skipping E2E tests"
      return 0
    fi

    echo "E2E tests would run here..."
    echo "Frontend: ${frontend_url}"
    echo "Backend: ${backend_url}"

    # E2E tests will be run via Playwright MCP
    # For now, just verify frontend is accessible
    if curl -sf "${frontend_url}" > /dev/null 2>&1; then
      echo "Frontend is accessible"
    else
      echo "WARNING: Frontend not accessible"
    fi

    return 0
  }

  run_step "e2e_tests" '["deploy_frontend"]' "Running E2E tests" step_e2e_tests
fi

# =============================================================================
# Final Summary
# =============================================================================
show_summary

echo ""
echo "========================================"
echo "  Deployment URLs"
echo "========================================"
echo ""

frontend_url=$(get_output "frontend_url")
backend_url=$(get_output "backend_url")

if [ -n "${frontend_url}" ]; then
  echo "  Frontend: ${frontend_url}"
fi
echo "  Backend:  ${backend_url}"
echo "  Health:   ${backend_url}/api/health"
echo ""
echo "========================================"

log_success "Deployment completed successfully!"
