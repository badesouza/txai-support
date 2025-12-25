#!/usr/bin/env bash
# =============================================================================
# E2E Test Runner for TXAI Support
# =============================================================================
# This script provides environment setup for E2E tests.
# Actual tests are run via Playwright MCP in Claude Code.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}==>${NC} $*"; }
log_success() { echo -e "${GREEN}==>${NC} $*"; }
log_warn() { echo -e "${YELLOW}==>${NC} $*"; }
log_error() { echo -e "${RED}==>${NC} $*"; }

# Configuration
FRONTEND_URL="${FRONTEND_URL:-}"
BACKEND_URL="${BACKEND_URL:-}"
TEST_USER="${TEST_USER:-admin@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-admin123}"

# Try to get URLs from terraform outputs
if [ -z "${FRONTEND_URL}" ] || [ -z "${BACKEND_URL}" ]; then
  TERRAFORM_DIR="${REPO_ROOT}/infra/terraform/environments/dev"

  if [ -d "${TERRAFORM_DIR}" ]; then
    cd "${TERRAFORM_DIR}"

    if [ -z "${BACKEND_URL}" ]; then
      BACKEND_URL=$(tofu output -raw backend_cloud_run_url 2>/dev/null || echo "")
    fi

    if [ -z "${FRONTEND_URL}" ]; then
      FRONTEND_URL=$(tofu output -raw firebase_hosting_url 2>/dev/null || echo "")
    fi
  fi

  # Fallback to .firebaserc
  if [ -z "${FRONTEND_URL}" ] && [ -f "${REPO_ROOT}/.firebaserc" ]; then
    FIREBASE_PROJECT=$(jq -r '.projects.default // empty' "${REPO_ROOT}/.firebaserc" 2>/dev/null || echo "")
    if [ -n "${FIREBASE_PROJECT}" ]; then
      FRONTEND_URL="https://${FIREBASE_PROJECT}.web.app"
    fi
  fi
fi

# Validate URLs
if [ -z "${FRONTEND_URL}" ]; then
  log_error "FRONTEND_URL is required"
  echo "Set FRONTEND_URL environment variable or ensure terraform is initialized"
  exit 1
fi

if [ -z "${BACKEND_URL}" ]; then
  log_error "BACKEND_URL is required"
  echo "Set BACKEND_URL environment variable or ensure terraform is initialized"
  exit 1
fi

echo ""
echo "========================================"
echo "  TXAI Support E2E Test Environment"
echo "========================================"
echo ""
echo "  Frontend URL: ${FRONTEND_URL}"
echo "  Backend URL:  ${BACKEND_URL}"
echo "  Test User:    ${TEST_USER}"
echo ""
echo "========================================"
echo ""

# Check backend health first
log_info "Checking backend health..."
HEALTH_RESPONSE=$(curl -sf "${BACKEND_URL}/api/health" 2>/dev/null || echo "")

if [ -n "${HEALTH_RESPONSE}" ]; then
  log_success "Backend is healthy: ${HEALTH_RESPONSE}"
else
  log_error "Backend health check failed"
  exit 1
fi

# Check frontend is accessible
log_info "Checking frontend accessibility..."
if curl -sf "${FRONTEND_URL}" > /dev/null 2>&1; then
  log_success "Frontend is accessible"
else
  log_error "Frontend is not accessible"
  exit 1
fi

echo ""
log_success "Environment is ready for E2E tests"
echo ""
echo "To run E2E tests with Playwright MCP, use Claude Code with commands like:"
echo ""
echo "  1. Navigate to frontend:"
echo "     mcp__playwright__playwright_navigate url=\"${FRONTEND_URL}\""
echo ""
echo "  2. Take a screenshot:"
echo "     mcp__playwright__playwright_screenshot name=\"homepage\""
echo ""
echo "  3. Login flow:"
echo "     mcp__playwright__playwright_fill selector=\"input[name='email']\" value=\"${TEST_USER}\""
echo "     mcp__playwright__playwright_fill selector=\"input[name='password']\" value=\"${TEST_PASSWORD}\""
echo "     mcp__playwright__playwright_click selector=\"button[type='submit']\""
echo ""
echo "========================================"

# Export for use in other scripts
export FRONTEND_URL
export BACKEND_URL
export TEST_USER
export TEST_PASSWORD
