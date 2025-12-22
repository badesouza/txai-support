#!/usr/bin/env bash
#
# TXAI Support - Setup Verification Script (Docker Compose)
#

set -euo pipefail

echo "========================================="
echo "🔍 TXAI Support - Setup Verification"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

COMPOSE=""
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo -e "${RED}✗ Docker Compose not found${NC}"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo -e "${RED}✗ curl is required for verification${NC}"
  exit 1
fi

echo -e "${YELLOW}Checking Docker daemon...${NC}"
if docker info >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Docker daemon is running${NC}"
else
  echo -e "${RED}✗ Docker daemon not running${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Checking containers...${NC}"
${COMPOSE} ps
echo ""

echo -e "${YELLOW}Checking backend health...${NC}"
if curl -sf "http://localhost:3001/api/health" >/dev/null; then
  echo -e "${GREEN}✓ Backend is responding${NC}"
else
  echo -e "${RED}✗ Backend health check failed${NC}"
  echo "Logs: ${COMPOSE} logs -f backend"
  exit 1
fi

echo ""
echo -e "${YELLOW}Checking frontend...${NC}"
if curl -sf "http://localhost:8080" >/dev/null; then
  echo -e "${GREEN}✓ Frontend is responding${NC}"
else
  echo -e "${RED}✗ Frontend check failed${NC}"
  echo "Logs: ${COMPOSE} logs -f frontend"
  exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ All checks passed!${NC}"
echo "========================================="
echo ""
echo "Access points:"
echo "  Frontend:  http://localhost:8080"
echo "  API Docs:  http://localhost:3001/api-docs"
echo "  API:       http://localhost:3001/api"
echo ""

