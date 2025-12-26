# Local Development Guide

This guide explains how to set up and run TXAI Support in **development mode** with hot reload for rapid prototyping.

## Architecture Overview

In dev mode, infrastructure services run in Docker containers while your application code runs natively:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Local Machine                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Native Processes (Hot Reload)         Docker Services              │
│  ┌─────────────────────────────┐       ┌────────────────────────┐   │
│  │  Frontend (npm start)       │       │  Firebase Emulator     │   │
│  │  :3000                      │───────│  :4000 UI              │   │
│  └─────────────────────────────┘       │  :8082 Firestore       │   │
│                │                       │  :9099 Auth            │   │
│                │                       └────────────────────────┘   │
│                ▼                       ┌────────────────────────┐   │
│  ┌─────────────────────────────┐       │  WPPConnect Server     │   │
│  │  Backend (npm run dev)      │───────│  :21465                │   │
│  │  :3001                      │       └────────────────────────┘   │
│  └─────────────────────────────┘       ┌────────────────────────┐   │
│                │                       │  Redis                 │   │
│                └───────────────────────│  :6379                 │   │
│                                        └────────────────────────┘   │
│                                        ┌────────────────────────┐   │
│                                        │  Fake GCS Server       │   │
│                                        │  :4443                 │   │
│                                        └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js** v18+ (LTS recommended)
- **npm** v9+
- **Docker** and **Docker Compose** v2+

Verify your setup:

```bash
node --version    # Should be v18+
npm --version     # Should be v9+
docker --version  # Should have Docker Compose v2
```

## Quick Start

### Option 1: Automated Startup (Recommended)

Simply run from the repository root:

```bash
npm run dev
```

This will:
1. Check and display all `.env.local` files (creating from templates if missing)
2. Validate critical environment variables
3. Spawn 3 terminal windows:
   - **Terminal 1:** Docker services (Firebase, WPPConnect, Redis, GCS)
   - **Terminal 2:** Backend with hot reload (http://localhost:3001)
   - **Terminal 3:** Frontend with hot reload (http://localhost:3000)

### Option 2: Manual Startup

If you prefer to start services manually:

#### 1. Start Infrastructure Services

```bash
# From the repository root
npm run dev:services
```

This starts Firebase Emulator, WPPConnect Server, Redis, and Fake GCS in Docker containers.

#### 2. Start Backend (Terminal 1)

```bash
cd backend
cp .env.local.example .env.local  # First time only
npm install                        # First time only
npm run dev
```

The backend will start at http://localhost:3001 with hot reload enabled.

#### 3. Start Frontend (Terminal 2)

```bash
cd frontend
cp .env.local.example .env.local  # First time only
npm install                        # First time only
npm start
```

The frontend will start at http://localhost:3000 with hot reload enabled.

## First-Time Setup

### 1. Clone and Install Dependencies

```bash
git clone <repo-url>
cd txai-support

# Install root dependencies (for npm scripts)
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment Files

```bash
# Root level (for Docker services)
cp .env.local.example .env.local

# Backend
cp backend/.env.local.example backend/.env.local

# Frontend
cp frontend/.env.local.example frontend/.env.local
```

### 3. Create GCS Bucket Directory

The fake-gcs-server requires a pre-created bucket directory:

```bash
mkdir -p data/gcs/txai-uploads
```

### 4. Start Everything

```bash
# Terminal 1: Start Docker services
npm run dev:services

# Wait for services to be healthy (check with)
npm run dev:services:status

# Terminal 2: Start backend
cd backend && npm run dev

# Terminal 3: Start frontend
cd frontend && npm start
```

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React app with hot reload |
| Backend API | http://localhost:3001/api | Express API with hot reload |
| Swagger Docs | http://localhost:3001/api-docs | API documentation |
| Health Check | http://localhost:3001/api/health | Backend health endpoint |
| Firebase UI | http://localhost:4000 | Emulator Suite dashboard |
| Firestore | localhost:8082 | Firestore emulator |
| Auth | localhost:9099 | Firebase Auth emulator |
| WPPConnect | http://localhost:21465 | WhatsApp API server |
| Redis | localhost:6379 | Session storage |
| Fake GCS | http://localhost:4443 | GCS emulator for file uploads |

## NPM Scripts Reference

Run these from the repository root:

| Command | Description |
|---------|-------------|
| `npm run dev` | **Start everything** - Checks env files, spawns 3 terminals (Docker, Backend, Frontend) |
| `npm run dev:services` | Start all Docker services (non-detached) |
| `npm run dev:services:detached` | Start all Docker services in background |
| `npm run dev:services:logs` | Stream logs from all services |
| `npm run dev:services:stop` | Stop all Docker services |
| `npm run dev:services:restart` | Restart all Docker services |
| `npm run dev:services:status` | Show status of Docker services |

## Seeding Development Data

After starting the services and backend, seed the database with test data:

```bash
cd backend
npm run seed
```

This creates:
- Default admin user (credentials in `.env.local`)
- Sample call records
- Test data for development

## Debugging

### VS Code Launch Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Backend",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

To enable debugging, start the backend with:

```bash
cd backend
npm run dev -- --inspect=9229
```

### Viewing Service Logs

```bash
# All services
npm run dev:services:logs

# Specific service
docker compose -f docker-compose.dev.yml logs -f firebase-emulator
docker compose -f docker-compose.dev.yml logs -f wppconnect-server
docker compose -f docker-compose.dev.yml logs -f redis
docker compose -f docker-compose.dev.yml logs -f fake-gcs
```

## Troubleshooting

### Docker Services Won't Start

1. **Check if ports are in use:**
   ```bash
   lsof -i :4000   # Firebase UI
   lsof -i :8082   # Firestore
   lsof -i :21465  # WPPConnect
   lsof -i :6379   # Redis
   lsof -i :4443   # Fake GCS
   ```

2. **Clean up and restart:**
   ```bash
   npm run dev:services:stop
   docker compose -f docker-compose.dev.yml down -v  # Remove volumes
   npm run dev:services
   ```

### Backend Can't Connect to Services

1. **Verify services are running:**
   ```bash
   npm run dev:services:status
   ```

2. **Check environment variables:**
   ```bash
   cat backend/.env.local | grep -E "(FIRESTORE|REDIS|GCS|WPPCONNECT)"
   ```

3. **Test connectivity:**
   ```bash
   # Firestore
   curl http://localhost:8082/
   
   # Redis
   redis-cli ping
   
   # WPPConnect
   curl http://localhost:21465/healthz
   
   # Fake GCS
   curl http://localhost:4443/storage/v1/b
   ```

### WPPConnect Issues on Apple Silicon (M1/M2/M3)

The WPPConnect image is amd64-only. Docker will use Rosetta 2 emulation which may be slow. Options:

1. **Use emulation (default):** Works but slower
2. **Build native image:** See WPPConnect documentation for arm64 builds

### Firebase Emulator Slow to Start

The Firebase emulator can take 30-60 seconds to fully initialize. Wait for the health check to pass:

```bash
# Watch the status
watch -n 2 'docker compose -f docker-compose.dev.yml ps'
```

### Hot Reload Not Working

**Backend:**
- Ensure `ts-node-dev` is installed: `npm install`
- Check for syntax errors in your TypeScript

**Frontend:**
- Clear React cache: `rm -rf node_modules/.cache`
- Restart: `npm start`

## Switching Between Dev and Production

### Dev Mode (this guide)
- Services in Docker, app runs natively
- Hot reload enabled
- Uses `.env.local` files

### Full Docker Mode (production-like)
```bash
# Uses docker-compose.yml (not docker-compose.dev.yml)
docker compose up -d
```

### Cloud Deployment
See [deployment-firebase.md](deployment-firebase.md) for GCP deployment.

## Clean Up

```bash
# Stop services
npm run dev:services:stop

# Remove Docker volumes (clears all data)
docker compose -f docker-compose.dev.yml down -v

# Remove node_modules
rm -rf node_modules backend/node_modules frontend/node_modules
```

