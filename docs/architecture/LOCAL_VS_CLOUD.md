# Local vs Cloud Architecture

Same code, different infrastructure through environment auto-detection.

## Component Comparison

| Component | Local (Docker) | Cloud (GCP) | Detection |
|-----------|----------------|-------------|-----------|
| **Frontend** | Nginx :8081 | Firebase Hosting | Build config |
| **Backend** | Node.js :3001 | Cloud Run | Same image |
| **WhatsApp** | WPPConnect Docker | **GCE VM** ⚡ | `WPPCONNECT_BASE_URL` |
| **Database** | Firebase Emulator | Cloud Firestore | `FIRESTORE_EMULATOR_HOST` |
| **Storage** | fake-gcs-server | Cloud Storage | `STORAGE_EMULATOR_HOST` |
| **Cost** | $0 | ~$10-15/month | — |

> ⚡ **Key difference**: WPPConnect runs in Docker locally but on a **dedicated VM** in cloud for Chrome/Puppeteer stability.

## Architecture Diagrams

### Local Development

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LOCAL (Docker Compose)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Browser                                                            │
│     │                                                               │
│     ▼                                                               │
│  ┌──────────┐      ┌──────────┐      ┌──────────────────┐          │
│  │ Frontend │ ───▶ │ Backend  │ ───▶ │ WPPConnect-Server│          │
│  │  :8081   │      │  :3001   │      │     :21465       │          │
│  │ (Nginx)  │      │ (Node.js)│      │    (Docker)      │          │
│  └──────────┘      └────┬─────┘      └────────┬─────────┘          │
│                         │                      │                    │
│                    ┌────┴────┐                 │                    │
│                    ▼         ▼                 ▼                    │
│              ┌──────────┐                ┌───────────┐              │
│              │ Firebase │                │  Chrome   │              │
│              │ Emulator │                │ (headless)│              │
│              │  :4000   │                └───────────┘              │
│              └────┬─────┘                                           │
│                   │                                                 │
│                   ▼                                                 │
│              ┌──────────┐                                           │
│              │ fake-gcs │                                           │
│              │  :4443   │                                           │
│              └──────────┘                                           │
│                                                                     │
│  ✅ Everything in Docker    ✅ No internet required    ✅ $0 cost   │
└─────────────────────────────────────────────────────────────────────┘
```

### Cloud Production

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CLOUD (GCP)                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Browser                                                            │
│     │                                                               │
│     ▼                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   Firebase   │───▶│  Cloud Run   │───▶│   WPPConnect VM      │  │
│  │   Hosting    │    │   Backend    │    │   (GCE e2-small)     │  │
│  │   (CDN)      │    │ (Serverless) │    │   Static IP: x.x.x.x │  │
│  └──────────────┘    └──────┬───────┘    └──────────┬───────────┘  │
│                             │                       │               │
│                        ┌────┴────┐                  │               │
│                        ▼                            ▼               │
│                  ┌──────────┐                ┌───────────────┐      │
│                  │ Cloud    │                │    Chrome     │      │
│                  │Firestore │                │  (persistent) │      │
│                  │          │                │   sessions    │      │
│                  └────┬─────┘                └───────────────┘      │
│                       │                                             │
│                       ▼                                             │
│                  ┌──────────┐                                       │
│                  │  Cloud   │                                       │
│                  │ Storage  │                                       │
│                  └──────────┘                                       │
│                                                                     │
│  ✅ Auto-scaling    ✅ Global CDN    ✅ Persistent WhatsApp session │
└─────────────────────────────────────────────────────────────────────┘
```

## WPPConnect: Docker vs VM

| Aspect | Local (Docker) | Cloud (VM) |
|--------|----------------|------------|
| **Runtime** | Docker container | GCE VM (e2-small) |
| **Storage** | Docker volume | Persistent SSD |
| **IP** | localhost:21465 | Static external IP |
| **Sessions** | Lost on restart | **Persistent** |
| **Chrome** | Container Chrome | Native Chrome |

**Why VM in cloud?** Chrome/Puppeteer has issues with Cloud Run's ephemeral filesystem. A dedicated VM provides stable, persistent WhatsApp sessions.

## Environment Variables

### Local (docker-compose.yml)
```yaml
FIRESTORE_EMULATOR_HOST: firebase-emulator:8080
STORAGE_EMULATOR_HOST: http://fake-gcs:4443
WPPCONNECT_BASE_URL: http://wppconnect-server:21465
```

### Cloud (Terraform-managed)
```bash
# No emulator vars = real services
WPPCONNECT_BASE_URL: http://<VM-IP>:21465  # Auto-synced by Terraform
```

## Cost Breakdown (Cloud)

| Service | Monthly Cost |
|---------|--------------|
| Cloud Run (Backend) | ~$0-5 |
| GCE VM (WPPConnect) | ~$5-7 |
| Cloud Firestore | ~$0-2 |
| Cloud Storage | ~$0.02 |
| Firebase Hosting | $0 (free tier) |
| **Total** | **~$10-15** |

## Quick Commands

### Local
```bash
docker-compose up -d           # Start all
docker-compose logs -f backend # View logs
docker-compose down -v         # Reset all data
```

### Cloud
```bash
cd infra/terraform/environments/dev
tofu apply                     # Deploy infrastructure

# Or use the deploy script:
./scripts/gcp/deploy-all.sh
```
