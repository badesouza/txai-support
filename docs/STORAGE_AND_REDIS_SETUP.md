# Storage & Redis Setup

## Overview

TXAI Support uses:
- **Google Cloud Storage** for file uploads (images)
- **Redis** for WhatsApp session management
- **Firestore** for database (see [Local vs Cloud](architecture/LOCAL_VS_CLOUD.md))

All services have local emulators for development parity.

## Storage (GCS)

### Local Setup

The `fake-gcs-server` emulator runs automatically via Docker Compose.

```yaml
# docker-compose.yml
fake-gcs:
  image: fsouza/fake-gcs-server:latest
  ports:
    - "4443:4443"
  volumes:
    - ./data/gcs:/data  # Bucket auto-created from directory structure
```

**Environment variables for local:**
```bash
STORAGE_DRIVER=gcs
STORAGE_EMULATOR_HOST=http://fake-gcs:4443
GCS_BUCKET=txai-uploads
GCS_PUBLIC_HOST=http://localhost:4443
```

### Cloud Setup

For production, create a GCS bucket and service account:

```bash
# Create bucket
gsutil mb -l us-central1 gs://your-project-uploads

# Set CORS for frontend access
gsutil cors set cors.json gs://your-project-uploads
```

**Environment variables for cloud:**
```bash
STORAGE_DRIVER=gcs
GCS_BUCKET=your-project-uploads
GCS_PROJECT_ID=your-project-id
# No STORAGE_EMULATOR_HOST = uses real GCS
```

### How Storage Abstraction Works

```typescript
// backend/src/storage/storage.ts
// Emulator detection - @google-cloud/storage SDK natively supports STORAGE_EMULATOR_HOST.
// The provider uses signed URLs in production, and direct public URLs in the emulator.
const isEmulator = !!process.env.STORAGE_EMULATOR_HOST;
```

## Redis

### Local Setup

Redis runs automatically via Docker Compose.

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

**Environment variable:**
```bash
REDIS_URL=redis://redis:6379
```

### Cloud Setup (Redis Cloud)

We use Redis Cloud free tier (30MB) instead of Google Memorystore for cost savings.

1. Create account at [Redis Cloud](https://redis.io/try-free/)
2. Create a free database
3. Get connection string with TLS

**Environment variable:**
```bash
# Note the 'rediss://' (double s) for TLS
REDIS_URL=rediss://default:PASSWORD@HOST:PORT
```

### WhatsApp Session Storage

WPPConnect stores WhatsApp sessions in Redis:

```typescript
// backend/src/services/wppconnect-direct.service.ts
// When WHATSAPP_TOKEN_STORE=redis, the direct driver configures WPPConnect to
// persist tokens/sessions in Redis instead of the filesystem.
const tokenStore = process.env.WHATSAPP_TOKEN_STORE || 'file';
if (tokenStore === 'redis') {
  createOptions.tokenStore = 'redis';
  createOptions.redis = parseRedisUrl(process.env.REDIS_URL);
}
```

## Testing

### Verify Local Storage

```bash
# Upload test file
curl -X POST http://localhost:4443/upload/b/txai-uploads/o?name=test.txt \
  -d "Hello World"

# List bucket contents  
curl http://localhost:4443/storage/v1/b/txai-uploads/o
```

### Verify Redis

```bash
# Connect to local Redis
docker-compose exec redis redis-cli ping
# Should return: PONG

# Check WhatsApp sessions
docker-compose exec redis redis-cli keys "*"
```

## Troubleshooting

### Storage emulator not working

```bash
# Check emulator is running
curl http://localhost:4443/storage/v1/b

# Restart emulator
docker-compose restart fake-gcs
```

### Redis connection failed

```bash
# Local
docker-compose exec redis redis-cli ping

# Cloud (requires redis-cli with TLS)
redis-cli -h HOST -p PORT -a PASSWORD --tls ping
```

### WhatsApp session lost

Sessions persist in Redis. If lost:
1. Scan QR code again in the frontend
2. Check Redis has data: `docker-compose exec redis redis-cli dbsize`
