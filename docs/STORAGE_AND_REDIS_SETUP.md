# Storage & Redis Setup

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Services                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      LOCAL                                │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  fake-gcs:4443    Redis:6379    Firebase Emulator:4000   │  │
│  │  (Storage)        (Sessions)    (Firestore)              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      CLOUD                                │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Cloud Storage    Redis Cloud   Cloud Firestore          │  │
│  │  (Private)        (TLS)         (Native mode)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Storage (GCS)

### Local

The `fake-gcs-server` emulator runs via Docker Compose:

```yaml
fake-gcs:
  image: fsouza/fake-gcs-server:latest
  ports:
    - "4443:4443"
  volumes:
    - ./data/gcs:/data
```

Environment:
```bash
STORAGE_EMULATOR_HOST=http://fake-gcs:4443
GCS_BUCKET=txai-uploads
GCS_PUBLIC_HOST=http://localhost:4443
```

### Cloud

Create bucket and configure:

```bash
# Create bucket
gsutil mb -l us-central1 gs://your-project-uploads

# Set CORS
gsutil cors set cors.json gs://your-project-uploads
```

Environment:
```bash
# No STORAGE_EMULATOR_HOST = real GCS
GCS_BUCKET=your-project-uploads
GCS_PROJECT_ID=your-project-id
```

## Redis

### Local

Redis container via Docker Compose:

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

Environment:
```bash
REDIS_URL=redis://redis:6379
```

### Cloud (Redis Cloud)

1. Create account at [Redis Cloud](https://redis.io/try-free/)
2. Create free database (30MB tier)
3. Get TLS connection string

Environment:
```bash
# Note: rediss:// (double s) for TLS
REDIS_URL=rediss://default:PASSWORD@HOST:PORT
```

### WhatsApp Token Storage

Backend uses Redis for WPPConnect token persistence:

```bash
WHATSAPP_TOKEN_STORE=redis  # Use Redis for tokens
REDIS_URL=redis://...       # Connection string
```

## Testing

### Storage
```bash
# List local bucket
curl http://localhost:4443/storage/v1/b/txai-uploads/o

# Upload test file
curl -X POST "http://localhost:4443/upload/b/txai-uploads/o?name=test.txt" \
  -d "Hello World"
```

### Redis
```bash
# Local
docker-compose exec redis redis-cli ping
# Returns: PONG

# Check keys
docker-compose exec redis redis-cli keys "*"
```

## Troubleshooting

### Storage emulator issues
```bash
curl http://localhost:4443/storage/v1/b  # Check emulator
docker-compose restart fake-gcs          # Restart
```

### Redis connection failed
```bash
# Local
docker-compose exec redis redis-cli ping

# Cloud (with TLS)
redis-cli -h HOST -p PORT -a PASSWORD --tls ping
```

### WhatsApp session lost
Sessions are stored in Redis. If lost:
1. Scan QR code again in frontend
2. Check Redis: `docker-compose exec redis redis-cli dbsize`
