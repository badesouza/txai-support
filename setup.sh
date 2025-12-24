#!/usr/bin/env bash

# TXAI Support - Automated Setup Script
# This script will set up and run the entire application with Docker

set -euo pipefail

echo "========================================="
echo "🚀 TXAI Support - Automated Setup"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

COMPOSE=""
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo -e "${RED}❌ Docker Compose not found.${NC}"
  echo "Install Docker Desktop (recommended) or Docker Compose."
  echo "Docs: https://docs.docker.com/compose/"
  exit 1
fi

echo -e "${GREEN}✓ Docker and Compose are installed (${COMPOSE})${NC}"
echo ""

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker daemon is running${NC}"
echo ""

# Create repo-root .env (Compose automatically loads it)
echo -e "${YELLOW}📝 Setting up environment file (.env)...${NC}"
if [ ! -f ".env" ]; then
  cat > .env << 'EOF'
# =============================================================================
# TXAI Support - Local Development Environment
# =============================================================================
# This file is for Docker Compose local development only.
# For cloud deployment, see: docs/architecture/LOCAL_VS_CLOUD.md
# =============================================================================

# Database (PostgreSQL)
POSTGRES_USER=txai
POSTGRES_PASSWORD=txai123
POSTGRES_DB=txai_support

# Backend
JWT_SECRET=your-super-secret-jwt-key

# Redis (for WhatsApp sessions)
REDIS_URL=redis://redis:6379
WHATSAPP_TOKEN_STORE=redis

# Storage (GCS Emulator)
STORAGE_DRIVER=gcs
STORAGE_EMULATOR_HOST=http://fake-gcs:4443
GCS_BUCKET=txai-uploads
GCS_PROJECT_ID=local-dev
GCS_PUBLIC_HOST=http://localhost:4443

# Optional: override API URL baked into the frontend image build
# REACT_APP_API_URL=http://localhost:3001/api
EOF
  echo -e "${GREEN}✓ Created .env (repo root)${NC}"
else
  echo -e "${GREEN}✓ .env already exists (repo root)${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Environment Profiles Available:${NC}"
echo "   .env.local.template  - All services local (current)"
echo "   .env.dev.template    - All services in cloud"
echo "   .env.hybrid.example  - Mix local and cloud"
echo ""
echo "   See: docs/architecture/LOCAL_VS_CLOUD.md"

echo ""

# Stop and remove existing containers
echo -e "${YELLOW}🛑 Stopping any existing containers...${NC}"
${COMPOSE} down --remove-orphans 2>/dev/null || true
echo ""

# Build and start containers
echo -e "${YELLOW}🏗️  Building and starting containers...${NC}"
${COMPOSE} up -d --build
echo ""

if ! command -v curl >/dev/null 2>&1; then
  echo -e "${RED}❌ curl is required to verify health checks.${NC}"
  echo "Install curl and rerun, or verify manually:"
  echo "  Backend health: http://localhost:3001/api/health"
  exit 1
fi

# Wait for Backend to be ready (it also runs migrations + seed on startup)
echo -e "${YELLOW}⏳ Waiting for Backend healthcheck...${NC}"
MAX_SECONDS=300
START_TS=$(date +%s)
until curl -sf "http://localhost:3001/api/health" >/dev/null 2>&1; do
  NOW_TS=$(date +%s)
  ELAPSED=$((NOW_TS - START_TS))
  if [ "${ELAPSED}" -ge "${MAX_SECONDS}" ]; then
    echo -e "${RED}❌ Backend did not become healthy within ${MAX_SECONDS}s.${NC}"
    echo "Check logs:"
    echo "  ${COMPOSE} logs -f backend"
    exit 1
  fi
  sleep 5
done
echo -e "${GREEN}✓ Backend is healthy${NC}"
echo ""

# Check container status
echo -e "${YELLOW}📊 Checking container status...${NC}"
${COMPOSE} ps
echo ""

# Display success message
echo ""
echo "========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "========================================="
echo ""
echo -e "${GREEN}🎉 Your TXAI Support application is ready!${NC}"
echo ""
echo -e "${YELLOW}📍 Access the application at:${NC}"
echo -e "   Frontend:      ${GREEN}http://localhost:8080${NC}"
echo -e "   Backend API:   ${GREEN}http://localhost:3001/api${NC}"
echo -e "   API Docs:      ${GREEN}http://localhost:3001/api-docs${NC}"
echo -e "   GCS Emulator:  ${GREEN}http://localhost:4443${NC}"
echo ""
echo -e "${YELLOW}🔑 Default Admin Credentials:${NC}"
echo -e "   Email: ${GREEN}admin@txai.com${NC}"
echo -e "   Password: ${GREEN}admin123${NC}"
echo ""
echo -e "${YELLOW}📚 Useful commands:${NC}"
echo "   View logs:       ${COMPOSE} logs -f"
echo "   Backend logs:    ${COMPOSE} logs -f backend"
echo "   Stop:            ${COMPOSE} down"
echo "   Restart:         ${COMPOSE} restart"
echo "   Database CLI:    docker exec -it txai-postgres psql -U txai -d txai_support"
echo "   Redis CLI:       docker exec -it txai-redis redis-cli"
echo ""
echo -e "${YELLOW}📖 Documentation:${NC}"
echo "   Local vs Cloud:  docs/architecture/LOCAL_VS_CLOUD.md"
echo "   Storage & Redis: docs/STORAGE_AND_REDIS_SETUP.md"
echo ""
echo "========================================="
