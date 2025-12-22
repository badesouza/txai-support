#!/usr/bin/env bash
#
# Verify GCP Deployment Health and Configuration
# Checks: Infrastructure, Backend, Frontend, Database, Permissions
#

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}==>${NC} $*"; }
log_success() { echo -e "${GREEN}✓${NC} $*"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $*"; }
log_error() { echo -e "${RED}✗${NC} $*"; }

# Configuration
PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"

if [ -z "${PROJECT_ID}" ]; then
  log_error "PROJECT_ID is required"
  echo "Usage: PROJECT_ID=your-project $0"
  exit 1
fi

echo ""
echo "========================================"
echo "  Deployment Verification"
echo "========================================"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "========================================"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${REPO_ROOT}/infra/terraform/environments/dev"

# Set project
gcloud config set project "${PROJECT_ID}" &> /dev/null

# Initialize counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper function to run checks
check() {
  local description=$1
  shift

  if "$@" &> /dev/null; then
    log_success "${description}"
    ((PASSED++))
    return 0
  else
    log_error "${description}"
    ((FAILED++))
    return 1
  fi
}

warn_check() {
  local description=$1
  shift

  if "$@" &> /dev/null; then
    log_success "${description}"
    ((PASSED++))
    return 0
  else
    log_warn "${description}"
    ((WARNINGS++))
    return 1
  fi
}

# Section 1: Infrastructure
log_info "Checking Infrastructure..."

# Check if terraform state exists
cd "${TERRAFORM_DIR}"
if check "Terraform state exists" tofu state list; then
  BACKEND_URL=$(tofu output -raw backend_cloud_run_url 2>/dev/null || echo "")
  FIREBASE_URL=$(tofu output -raw firebase_hosting_url 2>/dev/null || echo "")
  BACKEND_SERVICE_NAME=$(tofu output -raw backend_service_name 2>/dev/null || echo "")
  ARTIFACT_REPO_URL=$(tofu output -raw artifact_repo_url 2>/dev/null || echo "")
else
  log_error "Terraform not initialized. Run deployment first."
  exit 1
fi

check "Artifact Registry repository exists" gcloud artifacts repositories describe "${BACKEND_SERVICE_NAME%-backend*}-support" --location="${REGION}"
check "Cloud Run service exists" gcloud run services describe "${BACKEND_SERVICE_NAME}" --region="${REGION}"

# Section 2: Backend Health
echo ""
log_info "Checking Backend..."

if [ -n "${BACKEND_URL}" ]; then
  if check "Backend responds to health check" curl -sf "${BACKEND_URL}/api/health"; then
    HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/api/health" 2>/dev/null || echo "{}")
    echo "   Response: ${HEALTH_RESPONSE}"
  fi

  warn_check "Backend API root accessible" curl -sf "${BACKEND_URL}/api"

  # Check backend logs for errors
  log_info "Recent backend logs (last 10 lines):"
  gcloud run services logs read "${BACKEND_SERVICE_NAME}" \
    --region="${REGION}" \
    --limit=10 \
    --format="value(textPayload)" 2>/dev/null | sed 's/^/   /' || log_warn "Could not fetch logs"
else
  log_error "Backend URL not found in terraform outputs"
  ((FAILED++))
fi

# Section 3: Frontend
echo ""
log_info "Checking Frontend..."

if [ -z "${FIREBASE_URL}" ] && [ -f "${REPO_ROOT}/.firebaserc" ]; then
  FIREBASE_PROJECT_ID=$(jq -r '.projects.default // empty' "${REPO_ROOT}/.firebaserc" 2>/dev/null || echo "")
  if [ -n "${FIREBASE_PROJECT_ID}" ] && [ "${FIREBASE_PROJECT_ID}" != "your-project-id" ] && [ "${FIREBASE_PROJECT_ID}" != "YOUR_PROJECT_ID" ]; then
    FIREBASE_URL="https://${FIREBASE_PROJECT_ID}.web.app"
  fi
fi

if [ -n "${FIREBASE_URL}" ]; then
  check "Frontend is publicly accessible" curl -sf "${FIREBASE_URL}"
else
  log_warn "Firebase Hosting URL not found in terraform outputs or .firebaserc"
  ((WARNINGS++))
fi

# Section 4: Database
echo ""
log_info "Checking Database..."

SQL_INSTANCES=$(gcloud sql instances list --format="value(name)" 2>/dev/null || echo "")
if [ -n "${SQL_INSTANCES}" ]; then
  INSTANCE_NAME=$(echo "${SQL_INSTANCES}" | head -1)

  check "Cloud SQL instance exists" gcloud sql instances describe "${INSTANCE_NAME}"

  INSTANCE_STATE=$(gcloud sql instances describe "${INSTANCE_NAME}" --format="value(state)" 2>/dev/null || echo "UNKNOWN")
  if [ "${INSTANCE_STATE}" = "RUNNABLE" ]; then
    log_success "Database instance is RUNNABLE"
    ((PASSED++))
  else
    log_warn "Database instance state: ${INSTANCE_STATE}"
    ((WARNINGS++))
  fi

  # Check database connection from Cloud Run
  log_info "Database connection is configured via Cloud SQL Proxy in Cloud Run"
else
  log_warn "No Cloud SQL instances found (might be using external database)"
  ((WARNINGS++))
fi

# Section 5: Permissions & Service Accounts
echo ""
log_info "Checking Service Accounts..."

SERVICE_ACCOUNTS=$(gcloud iam service-accounts list --format="value(email)" 2>/dev/null || echo "")

check "Runtime API service account exists" echo "${SERVICE_ACCOUNTS}" | grep -q "runtime-api@"
check "CI Deployer service account exists" echo "${SERVICE_ACCOUNTS}" | grep -q "ci-deployer@"

# Section 6: Environment Variables
echo ""
log_info "Checking Backend Environment Variables..."

ENV_VARS=$(gcloud run services describe "${BACKEND_SERVICE_NAME}" \
  --region="${REGION}" \
  --format="value(spec.template.spec.containers[0].env)" 2>/dev/null || echo "")

if [ -n "${ENV_VARS}" ]; then
  log_info "Configured environment variables:"
  echo "${ENV_VARS}" | grep -oE '[A-Z_]+=' | sort | uniq | sed 's/^/   /' || log_warn "Could not parse env vars"

  # Check for important variables
  warn_check "DATABASE_URL is set" echo "${ENV_VARS}" | grep -q "DATABASE_URL"
  warn_check "JWT_SECRET is set" echo "${ENV_VARS}" | grep -q "JWT_SECRET"
  warn_check "CORS_ORIGINS is set" echo "${ENV_VARS}" | grep -q "CORS_ORIGINS"
else
  log_warn "No environment variables found (this might cause issues)"
  ((WARNINGS++))
fi

# Section 7: Security
echo ""
log_info "Checking Security Configuration..."

# Check if backend allows unauthenticated access
INVOKER_POLICY=$(gcloud run services get-iam-policy "${BACKEND_SERVICE_NAME}" \
  --region="${REGION}" \
  --format="value(bindings.members)" 2>/dev/null || echo "")

if echo "${INVOKER_POLICY}" | grep -q "allUsers"; then
  log_warn "Backend allows unauthenticated access (public API)"
  ((WARNINGS++))
else
  log_success "Backend requires authentication"
  ((PASSED++))
fi

# Final Summary
echo ""
echo "========================================"
echo "  Verification Summary"
echo "========================================"
echo ""
echo "  ${GREEN}Passed:${NC}   ${PASSED}"
echo "  ${YELLOW}Warnings:${NC} ${WARNINGS}"
echo "  ${RED}Failed:${NC}   ${FAILED}"
echo ""

if [ ${FAILED} -eq 0 ]; then
  if [ ${WARNINGS} -eq 0 ]; then
    log_success "All checks passed! Deployment is healthy."
    echo ""
    echo "Your application is ready at:"
    if [ -n "${FIREBASE_URL}" ]; then
      echo "  Frontend: ${FIREBASE_URL}"
    fi
    echo "  Backend:  ${BACKEND_URL}"
  else
    log_warn "Deployment is working but has ${WARNINGS} warning(s)."
    echo ""
    echo "Review warnings above and consider addressing them."
  fi
  echo ""
  exit 0
else
  log_error "Deployment has ${FAILED} critical issue(s)."
  echo ""
  echo "Please review the failed checks above and fix them."
  echo ""
  exit 1
fi
