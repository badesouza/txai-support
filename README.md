# TXAI Support

Technical support system running on Google Cloud Platform (GCP) with Firestore.

## Quick Start

### Prerequisites

Create a `.env` file with your secrets:

```bash
cp .env.example .env
# Edit .env and set:
# - JWT_SECRET (generate with: openssl rand -hex 32)
# - ADMIN_DEFAULT_PASSWORD (for initial admin user)
```

### Start Locally (Docker Compose)

```bash
docker-compose up -d
```

**Local URLs:**
| Service | URL |
|---------|-----|
| Frontend | http://localhost:8081 |
| Backend API | http://localhost:3001/api |
| Firebase Emulator UI | http://localhost:4000 |
| GCS Emulator | http://localhost:4443 |

**Default Admin:**
- Email: `admin@txai.com`
- Password: (from your `ADMIN_DEFAULT_PASSWORD` env var)

### Run Tests

```bash
ADMIN_PASSWORD=your-password ./scripts/test-firestore.sh
```

## Architecture

### Tech Stack

| Component | Local | Cloud |
|-----------|-------|-------|
| **Database** | Firebase Emulator (Firestore) | Cloud Firestore |
| **Storage** | fake-gcs-server | Cloud Storage |
| **Redis** | Redis container | Redis Cloud |
| **Backend** | Node.js container | Cloud Run |
| **Frontend** | Nginx container | Firebase Hosting |
| **Cost** | $0 | ~$5-10/month |

### Project Structure

```
├── backend/                 # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── repositories/    # Firestore data access
│   │   ├── lib/firebase.ts  # Firebase Admin SDK setup
│   │   └── storage/         # GCS storage abstraction
├── frontend/                # React + TypeScript + Ant Design
├── infra/terraform/         # Infrastructure as Code
├── scripts/                 # Deploy and test scripts
└── docs/                    # Documentation
```

## Cloud Deploy

### First-Time Setup

```bash
# 1. Login to GCP and Firebase
gcloud auth login && gcloud auth application-default login
firebase login

# 2. Set your project
gcloud config set project YOUR_PROJECT_ID

# 3. Run first-time deploy
./scripts/gcp/first-time-deploy.sh
```

### Day-to-Day Deploys

```bash
# Backend changes
PROJECT_ID=your-project ./scripts/gcp/deploy-backend.sh

# Frontend changes  
./scripts/gcp/deploy-frontend-firebase.sh

# Infrastructure changes
cd infra/terraform/environments/dev && terraform apply
```

## Documentation

- **[Local vs Cloud Guide](docs/architecture/LOCAL_VS_CLOUD.md)** - Environment parity details
- **[Storage & Redis Setup](docs/STORAGE_AND_REDIS_SETUP.md)** - Storage configuration
- **[Deployment Guide](docs/infra/deployment-guide.md)** - Full deploy instructions
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and fixes

## Troubleshooting

### 401 Unauthorized after restart

Browser has an old JWT token. Clear localStorage and login again:
1. DevTools → Application → Local Storage → Clear
2. Login again

### Database connection issues

```bash
# Check Firebase emulator is running
docker-compose logs firebase-emulator

# Reset everything
docker-compose down -v && docker-compose up -d
```

## License

[Add your license here]
