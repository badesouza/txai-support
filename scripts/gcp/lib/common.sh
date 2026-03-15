#!/usr/bin/env bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}==>${NC} $*"; }
log_success() { echo -e "${GREEN}==>${NC} $*"; }
log_warn() { echo -e "${YELLOW}==>${NC} $*"; }
log_error() { echo -e "${RED}==>${NC} $*"; }
log_danger() { echo -e "${MAGENTA}❌${NC} $*"; }

resolve_repo_root() {
  local script_dir="$1"
  cd "${script_dir}/../.." && pwd
}

load_repo_env_files() {
  local repo_root="$1"

  if [ -f "${repo_root}/.env.local" ]; then
    log_info "Loading root environment from .env.local..."
    set -a
    # shellcheck disable=SC1090
    source "${repo_root}/.env.local"
    set +a
  fi

  if [ -f "${repo_root}/infra/.env.local" ]; then
    log_info "Loading infra environment from infra/.env.local..."
    set -a
    # shellcheck disable=SC1090
    source "${repo_root}/infra/.env.local"
    set +a
  fi
}

require_command() {
  local command_name="$1"
  local install_hint="$2"
  if ! command -v "${command_name}" &> /dev/null; then
    log_error "${command_name} not found. ${install_hint}"
    exit 1
  fi
}

require_gcloud_auth() {
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    log_error "Not authenticated. Run: gcloud auth login"
    exit 1
  fi

  gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1
}

set_gcloud_project() {
  local project_id="$1"
  log_info "Setting active project..."
  if ! gcloud config set project "${project_id}" &> /dev/null; then
    log_error "Failed to set project to ${project_id}"
    exit 1
  fi
}
