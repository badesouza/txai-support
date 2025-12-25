#!/usr/bin/env bash
# =============================================================================
# Step Outputs Library
# =============================================================================
# Provides idempotent step execution with:
# - JSON state tracking
# - Step dependency chaining
# - Output capture and retrieval
# =============================================================================

set -euo pipefail

# Configuration
STATE_DIR="${STATE_DIR:-${SCRIPT_DIR}/.deploy-state}"
STATE_FILE="${STATE_FILE:-${STATE_DIR}/state.json}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging
log_step() { echo -e "${CYAN}[STEP]${NC} $*"; }
log_info() { echo -e "${BLUE}==>${NC} $*"; }
log_success() { echo -e "${GREEN}==>${NC} $*"; }
log_warn() { echo -e "${YELLOW}==>${NC} $*"; }
log_error() { echo -e "${RED}==>${NC} $*"; }

# =============================================================================
# State Management
# =============================================================================

init_state() {
  mkdir -p "${STATE_DIR}"
  if [ ! -f "${STATE_FILE}" ]; then
    echo '{"version":1,"steps":{},"outputs":{},"timestamp":""}' > "${STATE_FILE}"
  fi
  chmod 600 "${STATE_FILE}" 2>/dev/null || true
}

get_state() {
  local key="$1"
  jq -r ".${key} // empty" "${STATE_FILE}" 2>/dev/null || echo ""
}

set_state() {
  local key="$1"
  local value="$2"
  local tmp_file="${STATE_FILE}.tmp"
  jq ".${key} = ${value}" "${STATE_FILE}" > "${tmp_file}" && mv "${tmp_file}" "${STATE_FILE}"
}

# =============================================================================
# Step Execution
# =============================================================================

# Check if a step was completed successfully
step_completed() {
  local step_name="$1"
  local status
  status=$(get_state "steps.\"${step_name}\".status")
  [ "${status}" = "completed" ]
}

# Check if a step's dependencies are met
dependencies_met() {
  local deps_json="$1"

  if [ -z "${deps_json}" ] || [ "${deps_json}" = "null" ] || [ "${deps_json}" = "[]" ]; then
    return 0
  fi

  local deps
  deps=$(echo "${deps_json}" | jq -r '.[]' 2>/dev/null)

  for dep in ${deps}; do
    if ! step_completed "${dep}"; then
      log_error "Dependency not met: ${dep}"
      return 1
    fi
  done

  return 0
}

# Execute a step with dependency checking and output capture
# Usage: run_step "step_name" '["dep1","dep2"]' "Description" command args...
run_step() {
  local step_name="$1"
  local deps="$2"
  local description="$3"
  shift 3

  # Check if already completed
  if step_completed "${step_name}"; then
    log_step "${description} [SKIPPED - already completed]"
    return 0
  fi

  # Check dependencies
  if ! dependencies_met "${deps}"; then
    log_error "Step '${step_name}' has unmet dependencies"
    return 1
  fi

  log_step "${description}"

  # Mark as running
  set_state "steps.\"${step_name}\"" "{\"status\":\"running\",\"started\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

  # Execute command and capture output
  local output_file="${STATE_DIR}/${step_name}.output"
  local exit_code=0

  if "$@" > "${output_file}" 2>&1; then
    exit_code=0
  else
    exit_code=$?
  fi

  # Show output
  if [ -f "${output_file}" ] && [ -s "${output_file}" ]; then
    cat "${output_file}" | sed 's/^/   /'
  fi

  if [ ${exit_code} -eq 0 ]; then
    set_state "steps.\"${step_name}\"" "{\"status\":\"completed\",\"completed\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
    log_success "Step '${step_name}' completed"
    return 0
  else
    set_state "steps.\"${step_name}\"" "{\"status\":\"failed\",\"failed\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"exit_code\":${exit_code}}"
    log_error "Step '${step_name}' failed with exit code ${exit_code}"
    return ${exit_code}
  fi
}

# Store an output value from a step
store_output() {
  local key="$1"
  local value="$2"
  set_state "outputs.\"${key}\"" "\"${value}\""
}

# Retrieve an output value
get_output() {
  local key="$1"
  get_state "outputs.\"${key}\""
}

# Clear state for fresh deployment
clear_state() {
  rm -f "${STATE_FILE}"
  rm -f "${STATE_DIR}"/*.output
  init_state
  log_info "State cleared"
}

# Show deployment summary
show_summary() {
  echo ""
  echo "========================================"
  echo "  Deployment State Summary"
  echo "========================================"

  local steps
  steps=$(jq -r '.steps | to_entries[] | "\(.key):\(.value.status)"' "${STATE_FILE}" 2>/dev/null)

  local completed=0
  local failed=0
  local running=0

  for step in ${steps}; do
    local name="${step%%:*}"
    local status="${step##*:}"

    case "${status}" in
      completed)
        echo -e "  ${GREEN}[DONE]${NC} ${name}"
        ((completed++))
        ;;
      failed)
        echo -e "  ${RED}[FAIL]${NC} ${name}"
        ((failed++))
        ;;
      running)
        echo -e "  ${YELLOW}[RUN]${NC}  ${name}"
        ((running++))
        ;;
    esac
  done

  echo ""
  echo "  Completed: ${completed}, Failed: ${failed}, Running: ${running}"
  echo "========================================"
}

# Initialize on source
init_state
