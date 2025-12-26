# Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TXAI Support                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   LOCAL (Docker Compose)              CLOUD (GCP)                           │
│   ════════════════════                ═════════════                         │
│                                                                             │
│   ┌─────────┐  ┌─────────┐           ┌─────────┐  ┌─────────┐              │
│   │Frontend │  │ Backend │           │Firebase │  │Cloud Run│              │
│   │ :8081   │─▶│ :3001   │           │Hosting  │─▶│ Backend │              │
│   └─────────┘  └────┬────┘           └─────────┘  └────┬────┘              │
│                     │                                   │                   │
│                     ▼                                   ▼                   │
│   ┌─────────────────────────┐       ┌─────────────────────────┐            │
│   │     WPPConnect-Server   │       │    WPPConnect VM        │            │
│   │     Docker :21465       │       │    GCE (Static IP)      │            │
│   └─────────────────────────┘       └─────────────────────────┘            │
│                                                                             │
│   Storage: fake-gcs :4443            Storage: Cloud Storage                 │
│   Database: Firebase Emulator        Database: Cloud Firestore              │
│   Redis: Docker :6379                Redis: Redis Cloud (TLS)               │
│                                                                             │
│   Cost: $0                           Cost: ~$10-15/month                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Comparison

| Component | Local (Docker) | Cloud (GCP) |
|-----------|----------------|-------------|
| **Frontend** | Nginx :8081 | Firebase Hosting |
| **Backend** | Node.js :3001 | Cloud Run |
| **WhatsApp** | WPPConnect Docker :21465 | **WPPConnect GCE VM** |
| **Database** | Firebase Emulator | Cloud Firestore |
| **Storage** | fake-gcs-server | Cloud Storage |
| **Redis** | Redis container | Redis Cloud |

## Quick Links

| Guide | Description |
|-------|-------------|
| [Local vs Cloud](architecture/LOCAL_VS_CLOUD.md) | Environment differences |
| [Docker Setup](docker.md) | Local development |
| [Deployment Guide](infra/deployment-guide.md) | Full GCP deploy |
| [Terraform](infra/terraform.md) | Infrastructure as Code |
| [Troubleshooting](troubleshooting.md) | Common issues |

## Environment Files

```
txai-support/
├── .env.local              # Shared (PROJECT_ID, REGION)
├── backend/.env.local      # Backend secrets (JWT, WPPConnect)
├── frontend/.env.local     # Frontend config (API URL)
└── infra/.env.local        # Terraform secrets (Redis Cloud API keys)
```

## Service URLs

### Local
| Service | URL |
|---------|-----|
| Frontend | http://localhost:8081 |
| Backend API | http://localhost:3001/api |
| WPPConnect | http://localhost:21465 |
| Firebase UI | http://localhost:4000 |

### Cloud
| Service | URL |
|---------|-----|
| Frontend | https://`<project>`.web.app |
| Backend | https://`<service>`.run.app |
| WPPConnect | http://`<VM-IP>`:21465 |

## Deploy Commands

```bash
# First-time setup
./scripts/gcp/first-time-deploy.sh

# Day-to-day
./scripts/gcp/deploy-all.sh        # Full deploy
./scripts/gcp/deploy-backend.sh    # Backend only
./scripts/gcp/deploy-frontend-firebase.sh  # Frontend only
```
