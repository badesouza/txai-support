# Storage and Redis Setup

This document describes the storage and Redis configuration for the TXAI Support application.

## Architecture Overview

### Local Development
- **Storage**: fake-gcs-server (GCS emulator)
- **Redis**: Redis container
- **Database**: PostgreSQL container

### Cloud Deployment
- **Storage**: Google Cloud Storage
- **Redis**: Redis Cloud (free tier)
- **Database**: Cloud SQL (PostgreSQL)

## Local Development Setup

### Services

All local services run in Docker containers via `docker-compose`:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5433 | Database |
| Redis | 6379 | WhatsApp sessions + cache |
| fake-gcs-server | 4443 | GCS emulator |
| Backend | 3001 | API |
| Frontend | 8080 | Web UI |

### Starting Services

```bash
# Using setup script
./setup.sh

# Or manually
docker-compose up -d
```

### Environment Configuration

Copy the template to create your local environment:

```bash
cp .env.local.template .env
```

Key environment variables:

```bash
# Storage - GCS Emulator
STORAGE_DRIVER=gcs
STORAGE_EMULATOR_HOST=http://fake-gcs:4443
GCS_BUCKET=txai-uploads
GCS_PROJECT_ID=local-dev
GCS_PUBLIC_HOST=http://localhost:4443
GCS_UPLOADS_PREFIX=uploads

# Redis
REDIS_URL=redis://redis:6379

# WhatsApp
WHATSAPP_TOKEN_STORE=redis
```

### Verifying Setup

```bash
# Check all services
docker-compose ps

# Test backend health
curl http://localhost:3001/api/health

# Test Redis
docker-compose exec redis redis-cli ping
# Expected: PONG

# Test fake-gcs-server
curl http://localhost:4443/storage/v1/b/txai-uploads
```

## Storage Abstraction

The application uses a clean storage abstraction layer (`backend/src/storage/storage.ts`):

### Providers

- **LocalStorageProvider**: File system storage
- **GcsStorageProvider**: Google Cloud Storage (works with both emulator and real GCS)

### Interface

```typescript
interface StorageProvider {
  saveBuffer(options: SaveBufferOptions): Promise<SaveResult>;
  deleteFile(relativePath: string): Promise<void>;
  getFileUrl(relativePath: string): Promise<string>;
}
```

### How It Works

1. **Emulator Detection**: SDK automatically detects `STORAGE_EMULATOR_HOST`
2. **Seamless Switching**: Same code works for local emulator and production
3. **Signed URLs**:
   - Emulator: Uses public URLs via `GCS_PUBLIC_HOST`
   - Production: Generates signed URLs with credentials

### fake-gcs-server Configuration

Per [official documentation](https://github.com/fsouza/fake-gcs-server):

- **No signature validation**: Emulator doesn't validate query params
- **Public host**: Set via `-public-host` flag
- **HTTP mode**: Running with `-scheme http` for simplicity

## WhatsApp Session Storage

WPPConnect uses Redis for session persistence:

```typescript
// Environment variable
WHATSAPP_TOKEN_STORE=redis  // or 'file' for local filesystem

// Redis configuration
REDIS_URL=redis://redis:6379           // Local
REDIS_URL=rediss://:password@host:port // Redis Cloud (TLS)
```

### Benefits of Redis Storage

- **Persistence**: Sessions survive container restarts
- **Scalability**: Can be shared across multiple backend instances
- **Cloud-ready**: Easy migration to Redis Cloud

## Cloud Deployment

### Google Cloud Storage

1. **Create bucket** (via Terraform or manually):
   ```bash
   gsutil mb -p PROJECT_ID gs://PROJECT_ID-uploads
   ```

2. **Configure environment**:
   ```bash
   STORAGE_DRIVER=gcs
   GCS_PROJECT_ID=your-project-id
   GCS_BUCKET=your-project-id-uploads
   ```

### Redis Cloud (Free Tier)

Terraform configuration is provided in `infra/terraform/environments/dev/redis-cloud.tf`.

**Features:**
- 30MB memory
- 1000 ops/sec
- TLS encryption
- No VPC required

**Setup:**

1. Get API credentials from [Redis Cloud Console](https://app.redislabs.com/#/account-settings/api-keys)

2. Configure Terraform:
   ```bash
   cd infra/terraform/environments/dev
   cp terraform.tfvars.example terraform.tfvars
   # Edit with your credentials
   ```

3. Apply:
   ```bash
   terraform init
   terraform apply
   ```

## Cost Estimates

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud Run | <100 requests/day | ~$0-5 |
| Cloud SQL | db-f1-micro, 10GB | ~$10 |
| Cloud Storage | <1GB, <1000 ops | ~$0.02 |
| Redis Cloud | Free tier | **$0** |
| **Total** | | **~$10-15/month** |

## Environment Profiles

| Profile | Use Case |
|---------|----------|
| `.env.local.template` | All services in Docker |
| `.env.dev.template` | All services in cloud |
| `.env.hybrid.example` | Mix local and cloud |

## Troubleshooting

### Storage Issues

**Problem**: Files not uploading to fake-gcs-server

**Solution**:
1. Check `STORAGE_EMULATOR_HOST` is set
2. Verify fake-gcs-server is running: `curl http://localhost:4443/storage/v1/b`
3. Check backend logs

### Redis Issues

**Problem**: WhatsApp sessions not persisting

**Solution**:
1. Verify `WHATSAPP_TOKEN_STORE=redis`
2. Check Redis: `docker-compose exec redis redis-cli ping`
3. Inspect keys: `docker-compose exec redis redis-cli keys "wppconnect:*"`

### Signed URL Issues

**Problem**: Signed URLs not working with emulator

**Solution**:
- Ensure `GCS_PUBLIC_HOST=http://localhost:4443`
- fake-gcs-server doesn't validate signatures (by design)

## References

- [fake-gcs-server Documentation](https://github.com/fsouza/fake-gcs-server)
- [Google Cloud Storage SDK](https://cloud.google.com/storage/docs/reference/libraries)
- [Redis Cloud Documentation](https://docs.redis.com/latest/rc/)
- [WPPConnect Documentation](https://wppconnect.io/)

