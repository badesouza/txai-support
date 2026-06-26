#!/usr/bin/env bash
# =============================================================================
# Development Startup Script
# =============================================================================
# This script:
# 1. Kills processes on required ports (3000, 3001, Docker services)
# 2. Checks and displays .env.local files
# 3. Spawns 3 terminal windows with default system shell
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory and repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TXAI Support - Dev Mode Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# =============================================================================
# Step 1: Kill processes on required ports
# =============================================================================
echo -e "${CYAN}Freeing required ports...${NC}"

# Kill processes on port 3000 (frontend)
if lsof -ti :3000 > /dev/null 2>&1; then
  echo -e "${YELLOW}  Killing process on port 3000...${NC}"
  lsof -ti :3000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Kill processes on port 3001 (backend)
if lsof -ti :3001 > /dev/null 2>&1; then
  echo -e "${YELLOW}  Killing process on port 3001...${NC}"
  lsof -ti :3001 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Stop Docker services
if docker compose -f "${REPO_ROOT}/docker-compose.dev.yml" ps -q > /dev/null 2>&1; then
  echo -e "${YELLOW}  Stopping Docker services...${NC}"
  cd "${REPO_ROOT}"
  docker compose -f docker-compose.dev.yml down > /dev/null 2>&1 || true
  sleep 1
fi

echo -e "${GREEN}✅ Ports freed${NC}"
echo ""

# =============================================================================
# Step 2: Check .env.local files and requirements
# =============================================================================
echo -e "${CYAN}Checking environment configuration...${NC}"
echo ""

MISSING_FILES=()

# Check root .env.local
if [ ! -f "${REPO_ROOT}/.env.local" ]; then
  MISSING_FILES+=("Root .env.local")
  echo -e "${YELLOW}⚠️  Root .env.local not found${NC}"
  if [ -f "${REPO_ROOT}/.env.local.example" ]; then
    echo -e "${CYAN}   Creating from template...${NC}"
    cp "${REPO_ROOT}/.env.local.example" "${REPO_ROOT}/.env.local"
  fi
else
  echo -e "${GREEN}✅ Root .env.local found${NC}"
fi

echo -e "${CYAN}   Contents:${NC}"
if [ -f "${REPO_ROOT}/.env.local" ]; then
  cat "${REPO_ROOT}/.env.local" | sed 's/^/   /'
else
  echo -e "${RED}   File not found${NC}"
fi
echo ""

# Check backend .env.local
if [ ! -f "${REPO_ROOT}/backend/.env.local" ]; then
  MISSING_FILES+=("Backend .env.local")
  echo -e "${YELLOW}⚠️  Backend .env.local not found${NC}"
  if [ -f "${REPO_ROOT}/backend/.env.local.example" ]; then
    echo -e "${CYAN}   Creating from template...${NC}"
    cp "${REPO_ROOT}/backend/.env.local.example" "${REPO_ROOT}/backend/.env.local"
  fi
else
  echo -e "${GREEN}✅ Backend .env.local found${NC}"
fi

echo -e "${CYAN}   Contents:${NC}"
if [ -f "${REPO_ROOT}/backend/.env.local" ]; then
  cat "${REPO_ROOT}/backend/.env.local" | sed 's/^/   /'
else
  echo -e "${RED}   File not found${NC}"
fi
echo ""

# Check frontend .env.local
if [ ! -f "${REPO_ROOT}/frontend/.env.local" ]; then
  MISSING_FILES+=("Frontend .env.local")
  echo -e "${YELLOW}⚠️  Frontend .env.local not found${NC}"
  if [ -f "${REPO_ROOT}/frontend/.env.local.example" ]; then
    echo -e "${CYAN}   Creating from template...${NC}"
    cp "${REPO_ROOT}/frontend/.env.local.example" "${REPO_ROOT}/frontend/.env.local"
  fi
else
  echo -e "${GREEN}✅ Frontend .env.local found${NC}"
fi

echo -e "${CYAN}   Contents:${NC}"
if [ -f "${REPO_ROOT}/frontend/.env.local" ]; then
  cat "${REPO_ROOT}/frontend/.env.local" | sed 's/^/   /'
else
  echo -e "${RED}   File not found${NC}"
fi
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker Desktop and try again.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# =============================================================================
# Step 3: Spawn terminals with default system shell
# =============================================================================
echo -e "${CYAN}Spawning development terminals...${NC}"
echo ""

# Detect OS and use appropriate method
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS - use osascript to open Terminal windows with default shell
  # Terminal 1: Docker Services
  osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '${REPO_ROOT}' && npm run dev:services"
  set custom title of front window to "TXAI - Docker Services"
end tell
EOF

  sleep 1

  # Terminal 2: Backend
  osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '${REPO_ROOT}/backend' && npm run dev"
  set custom title of front window to "TXAI - Backend"
end tell
EOF

  sleep 1

  # Terminal 3: Frontend
  osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '${REPO_ROOT}/frontend' && npm start"
  set custom title of front window to "TXAI - Frontend"
end tell
EOF

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux - detect default shell and use appropriate terminal
  DEFAULT_SHELL="${SHELL:-/bin/bash}"
  
  if command -v gnome-terminal &> /dev/null; then
    # Terminal 1: Docker Services
    gnome-terminal --title="TXAI - Docker Services" -- bash -c "cd '${REPO_ROOT}' && npm run dev:services; exec ${DEFAULT_SHELL}"
    
    # Terminal 2: Backend
    gnome-terminal --title="TXAI - Backend" -- bash -c "cd '${REPO_ROOT}/backend' && npm run dev; exec ${DEFAULT_SHELL}"
    
    # Terminal 3: Frontend
    gnome-terminal --title="TXAI - Frontend" -- bash -c "cd '${REPO_ROOT}/frontend' && npm start; exec ${DEFAULT_SHELL}"
  elif command -v xterm &> /dev/null; then
    # Fallback to xterm
    xterm -T "TXAI - Docker Services" -e "${DEFAULT_SHELL} -c \"cd '${REPO_ROOT}' && npm run dev:services\"" &
    xterm -T "TXAI - Backend" -e "${DEFAULT_SHELL} -c \"cd '${REPO_ROOT}/backend' && npm run dev\"" &
    xterm -T "TXAI - Frontend" -e "${DEFAULT_SHELL} -c \"cd '${REPO_ROOT}/frontend' && npm start\"" &
  else
    echo -e "${RED}❌ No suitable terminal emulator found. Please install gnome-terminal or xterm.${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ Unsupported OS: $OSTYPE${NC}"
  echo -e "${YELLOW}   Please run the services manually:${NC}"
  echo -e "   Terminal 1: cd '${REPO_ROOT}' && npm run dev:services"
  echo -e "   Terminal 2: cd '${REPO_ROOT}/backend' && npm run dev"
  echo -e "   Terminal 3: cd '${REPO_ROOT}/frontend' && npm start"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All terminals spawned successfully!${NC}"
echo ""
echo -e "${CYAN}Terminal windows opened:${NC}"
echo -e "   ${GREEN}1.${NC} Docker Services (PostgreSQL, WPPConnect, Redis)"
echo -e "   ${GREEN}2.${NC} Backend (http://localhost:3001)"
echo -e "   ${GREEN}3.${NC} Frontend (http://localhost:3000)"
echo ""
echo -e "${CYAN}Access URLs:${NC}"
echo -e "   Frontend:     ${GREEN}http://localhost:3000${NC}"
echo -e "   Backend API:  ${GREEN}http://localhost:3001/api${NC}"
echo -e "   Swagger:      ${GREEN}http://localhost:3001/api-docs${NC}"
echo ""
echo -e "${YELLOW}💡 Admin user is automatically created on backend startup${NC}"
echo -e "${YELLOW}   Email: admin@txai.com | Password: admin123${NC}"
echo ""
