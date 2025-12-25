# Local vs Cloud Architecture

TXAI Support is designed with **environment parity** - the same code runs locally and in the cloud through abstraction layers that auto-detect the environment.

## Quick Comparison

| Component | Local (Docker) | Cloud (GCP) | Parity Method |
|-----------|----------------|-------------|---------------|
| **Database** | Firebase Emulator | Cloud Firestore | Firebase Admin SDK |
| **Storage** | fake-gcs-server | Cloud Storage | `STORAGE_EMULATOR_HOST` env var |
| **Redis** | Redis container | Redis Cloud | `REDIS_URL` (redis:// vs rediss://) |
| **Backend** | Node.js container | Cloud Run | Same Docker image |
| **Frontend** | Nginx container | Firebase Hosting | Same build artifacts |
| **Cost** | $0 | ~$5-10/month | — |

## How It Works

### Firestore Detection

```typescript
// backend/src/lib/firebase.ts
if (process.env.FIRESTORE_EMULATOR_HOST) {
  // Local: Connect to Firebase Emulator
  firestore.settings({ host: process.env.FIRESTORE_EMULATOR_HOST, ssl: false });
} else {
  // Cloud: Use production Firestore
}
```

### Storage Detection

```typescript
// backend/src/storage/storage.ts
const isEmulator = !!process.env.STORAGE_EMULATOR_HOST;
// Local: Routes to fake-gcs-server
// Cloud: Routes to storage.googleapis.com
```

### Redis Detection

```bash
# Local (no TLS)
REDIS_URL=redis://redis:6379

# Cloud (TLS enabled - note the double 's')
REDIS_URL=rediss://:PASSWORD@host:port
```

## Environment Variables

### Local Development (docker-compose.yml)

```yaml
FIRESTORE_EMULATOR_HOST: firebase-emulator:8080
STORAGE_EMULATOR_HOST: http://fake-gcs:4443
REDIS_URL: redis://redis:6379
GCS_BUCKET: txai-uploads
```

### Cloud Production

```yaml
# No FIRESTORE_EMULATOR_HOST = real Firestore
# No STORAGE_EMULATOR_HOST = real GCS
REDIS_URL: rediss://:PASSWORD@redis-cloud-host:16379
GCS_BUCKET: project-id-uploads
GCP_PROJECT_ID: your-project-id
```

## Architecture Diagrams

### Local Development

```
┌────────────────────────────────────────────────────────────────┐
│                Local (Docker Compose)                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  :8081           :3001            :4443           :4000        │
│  Frontend        Backend          fake-gcs        Firebase     │
│  (Nginx)  ────▶  (Node.js) ────▶  (GCS Emu)      Emulator UI  │
│                     │                                          │
│              ┌──────┴──────┐                                   │
│              ▼             ▼                                   │
│         Firebase       Redis                                   │
│         Emulator       :6379                                   │
│         (Firestore)                                            │
│                                                                │
│  All containers share txai-network                             │
│  Data persists in Docker volumes                               │
│  No internet required                                          │
└────────────────────────────────────────────────────────────────┘
```

### Cloud Production

```
┌────────────────────────────────────────────────────────────────┐
│                Cloud (GCP + Redis Cloud)                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Firebase         Cloud Run       Cloud Storage                │
│  Hosting   ────▶  Backend  ────▶  (GCS Bucket)                │
│  (CDN)            (Serverless)                                 │
│                      │                                         │
│              ┌───────┴───────┐                                 │
│              ▼               ▼                                 │
│         Cloud             Redis                                │
│         Firestore         Cloud                                │
│         (NoSQL)           (TLS)                                │
│                                                                │
│  Auto-scaling, global CDN, managed services                    │
│  Automatic backups and 11-nines durability                     │
└────────────────────────────────────────────────────────────────┘
```

## Quick Commands

### Local

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f backend

# Reset data
docker-compose down -v && docker-compose up -d

# Access Firebase Emulator UI
open http://localhost:4000
```

### Cloud

```bash
# Deploy infrastructure
cd infra/terraform/environments/dev
terraform apply

# Deploy backend
./scripts/gcp/deploy-backend.sh

# View logs
gcloud run logs read txai-backend
```

## Cost Breakdown (Cloud)

| Service | Monthly Cost |
|---------|--------------|
| Cloud Firestore | ~$0-2 (pay per operation) |
| Cloud Run | ~$0-5 (pay per request) |
| Cloud Storage | ~$0.02 |
| Redis Cloud | $0 (free tier) |
| Firebase Hosting | $0 (free tier) |
| **Total** | **~$5-10** |

## See Also

- [Storage & Redis Setup](../STORAGE_AND_REDIS_SETUP.md)
- [Deployment Guide](../infra/deployment-guide.md)
