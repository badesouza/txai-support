#!/usr/bin/env bash
#
# Firebase Hosting Deployment Script
# Builds and deploys frontend to Firebase Hosting
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
API_URL="${API_URL:-}"
PREVIEW="${PREVIEW:-false}"
FIREBASE_TOKEN="${FIREBASE_TOKEN:-}"

# Validate API_URL
if [ -z "${API_URL}" ]; then
  log_error "API_URL environment variable is required"
  echo ""
  echo "Usage:"
  echo "  export API_URL=https://your-backend-url.run.app/api"
  echo "  $0"
  echo ""
  echo "For preview deployment:"
  echo "  export PREVIEW=true"
  echo "  $0"
  exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Verify Firebase configuration exists
if [ ! -f "${REPO_ROOT}/.firebaserc" ]; then
  log_error "Firebase not initialized. Run setup-firebase.sh first:"
  echo "  export PROJECT_ID=your-project-id"
  echo "  ./scripts/gcp/setup-firebase.sh"
  exit 1
fi

FIREBASE_PROJECT_ID=$(jq -r '.projects.default // empty' "${REPO_ROOT}/.firebaserc" 2>/dev/null || echo "")
if [ -z "${FIREBASE_PROJECT_ID}" ] || [ "${FIREBASE_PROJECT_ID}" = "your-project-id" ] || [ "${FIREBASE_PROJECT_ID}" = "YOUR_PROJECT_ID" ]; then
  log_error "Firebase project ID is not set in .firebaserc"
  echo "  export PROJECT_ID=your-project-id"
  echo "  ./scripts/gcp/setup-firebase.sh"
  exit 1
fi

echo ""
echo "========================================"
echo "  Firebase Hosting Deployment"
echo "========================================"
echo ""
log_info "API URL: ${API_URL}"
log_info "Preview: ${PREVIEW}"
echo ""

# Step 1: Build frontend
log_info "Building frontend with REACT_APP_API_URL=${API_URL}"
cd "${REPO_ROOT}/frontend"

# Install dependencies
npm ci

# Build with API URL
REACT_APP_API_URL="${API_URL}" npm run build

cd "${REPO_ROOT}"
log_success "Frontend built successfully"

# Step 2: Deploy to Firebase
DEPLOY_CMD="npx firebase"

# Add token if available
TOKEN_ARGS=""
if [ -n "${FIREBASE_TOKEN}" ]; then
  TOKEN_ARGS="--token ${FIREBASE_TOKEN}"
  log_info "Using Firebase CI token for authentication"
fi

if [ "${PREVIEW}" = "true" ]; then
  log_info "Deploying to Firebase preview channel..."

  # Generate unique channel ID
  CHANNEL_ID="preview-$(date +%s)"

  # Deploy to preview channel (expires in 7 days)
  ${DEPLOY_CMD} hosting:channel:deploy "${CHANNEL_ID}" --expires 7d ${TOKEN_ARGS}
  
  DEPLOY_STATUS=$?
  if [ ${DEPLOY_STATUS} -ne 0 ]; then
    log_error "Firebase preview deployment failed!"
    if [ -z "${FIREBASE_TOKEN}" ]; then
      echo ""
      log_info "For non-interactive deployments, set FIREBASE_TOKEN:"
      echo "  1. Run: firebase login:ci"
      echo "  2. Copy the token"
      echo "  3. Export: export FIREBASE_TOKEN='your-token'"
      echo "  4. Re-run this script"
    fi
    exit 1
  fi

  log_success "Preview deployment complete!"
  echo ""
  log_info "Preview URL printed above (look for 'Channel URL')"

else
  log_info "Deploying to Firebase Hosting (production)..."

  # Deploy to production
  ${DEPLOY_CMD} deploy --only hosting ${TOKEN_ARGS}
  
  DEPLOY_STATUS=$?
  if [ ${DEPLOY_STATUS} -ne 0 ]; then
    log_error "Firebase deployment failed!"
    if [ -z "${FIREBASE_TOKEN}" ]; then
      echo ""
      log_info "For non-interactive deployments, set FIREBASE_TOKEN:"
      echo "  1. Run: firebase login:ci"
      echo "  2. Copy the token"
      echo "  3. Export: export FIREBASE_TOKEN='your-token'"
      echo "  4. Re-run this script"
    fi
    exit 1
  fi

  # Get project ID from .firebaserc
  PROJECT_ID="${FIREBASE_PROJECT_ID}"

  log_success "Production deployment complete!"
  echo ""
  log_success "Your app is live at:"
  echo "  Primary:   https://${PROJECT_ID}.web.app"
  echo "  Alternate: https://${PROJECT_ID}.firebaseapp.com"
fi

echo ""
log_success "Deployment finished!"
echo ""
