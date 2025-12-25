#!/usr/bin/env bash
#
# Firebase Hosting Setup Script
# Initializes Firebase Hosting in the existing GCP project
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
FIREBASE_TOKEN="${FIREBASE_TOKEN:-}"

# Validate required variables
if [ -z "${PROJECT_ID}" ]; then
  log_error "PROJECT_ID is required"
  echo "Usage: PROJECT_ID=your-project-id $0"
  exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo ""
echo "========================================"
echo "  Firebase Hosting Setup"
echo "========================================"
echo ""
log_info "Project ID: ${PROJECT_ID}"
log_info "Region: ${REGION}"
echo ""

# Step 1: Enable Firebase APIs
log_info "Enabling Firebase APIs..."
gcloud services enable firebase.googleapis.com --project="${PROJECT_ID}"
gcloud services enable firebasehosting.googleapis.com --project="${PROJECT_ID}"
log_success "Firebase APIs enabled"

# Step 2: Check/install firebase-tools
log_info "Checking Firebase CLI..."
if ! command -v firebase &> /dev/null; then
  log_warn "firebase-tools not found. Installing globally..."
  npm install -g firebase-tools
  log_success "firebase-tools installed"
else
  FIREBASE_VERSION=$(firebase --version)
  log_success "firebase-tools already installed (${FIREBASE_VERSION})"
fi

# Step 3: Create .firebaserc
log_info "Creating .firebaserc..."
cd "${REPO_ROOT}"

if [ -f ".firebaserc" ]; then
  log_warn ".firebaserc already exists, backing up to .firebaserc.bak"
  cp .firebaserc .firebaserc.bak
fi

cat > .firebaserc << EOF
{
  "projects": {
    "default": "${PROJECT_ID}"
  }
}
EOF

log_success ".firebaserc created"

# Step 4: Create firebase.json
log_info "Creating firebase.json..."

if [ -f "firebase.json" ]; then
  log_warn "firebase.json already exists, backing up to firebase.json.bak"
  cp firebase.json firebase.json.bak
fi

cat > firebase.json << 'EOF'
{
  "hosting": {
    "public": "frontend/build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      }
    ]
  }
}
EOF

log_success "firebase.json created"

# Step 5: Authenticate Firebase CLI
log_info "Authenticating Firebase CLI..."

# Check if token is provided (for CI/CD)
if [ -n "${FIREBASE_TOKEN}" ]; then
  log_info "Using provided FIREBASE_TOKEN for authentication (CI mode)"
  
  # Verify token works by trying to list projects
  if firebase projects:list --project="${PROJECT_ID}" --token="${FIREBASE_TOKEN}" &> /dev/null; then
    log_success "Successfully authenticated with Firebase using token"
  else
    log_error "Failed to authenticate with provided FIREBASE_TOKEN"
    log_error "Get a new token with: firebase login:ci"
    exit 1
  fi
else
  # Interactive authentication
  # Check if already logged in
  if firebase projects:list --project="${PROJECT_ID}" &> /dev/null; then
    log_success "Already authenticated with Firebase"
  else
    log_info "Please authenticate with Firebase..."
    log_warn "Running in interactive mode - for CI/CD, set FIREBASE_TOKEN environment variable"
    echo "  Get token with: firebase login:ci"
    firebase login --reauth
  fi
fi

# Verify project access
log_info "Verifying project access..."
TOKEN_ARG=""
if [ -n "${FIREBASE_TOKEN}" ]; then
  TOKEN_ARG="--token=${FIREBASE_TOKEN}"
fi

if firebase projects:list --project="${PROJECT_ID}" ${TOKEN_ARG} 2>/dev/null | grep -q "${PROJECT_ID}"; then
  log_success "Successfully connected to Firebase project: ${PROJECT_ID}"
else
  log_error "Could not access Firebase project: ${PROJECT_ID}"
  log_error "Make sure the project exists and you have access"
  if [ -z "${FIREBASE_TOKEN}" ]; then
    log_info "For CI/CD deployments, set FIREBASE_TOKEN environment variable"
    echo "  Get token with: firebase login:ci"
  fi
  exit 1
fi

# Summary
echo ""
echo "========================================"
echo "  Firebase Setup Complete!"
echo "========================================"
echo ""
log_success "Configuration files created:"
echo "  - .firebaserc (project mapping)"
echo "  - firebase.json (hosting config)"
echo ""
log_success "Firebase URLs:"
echo "  - Primary: https://${PROJECT_ID}.web.app"
echo "  - Alternate: https://${PROJECT_ID}.firebaseapp.com"
echo ""
log_info "Next steps:"
echo "  1. Commit .firebaserc and firebase.json to git"
echo "  2. Deploy frontend: ./scripts/gcp/deploy-frontend-firebase.sh"
echo ""
