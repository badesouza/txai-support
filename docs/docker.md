# Docker (Local Development)

Docker Compose runs the complete stack locally with zero cloud dependencies.

## Quick Start

```bash
# 1. Copy example files
cp .env.example .env.local
cp backend/.env.example backend/.env.local

# 2. Edit secrets in backend/.env.local:
#    - JWT_SECRET
#    - ADMIN_DEFAULT_PASSWORD
#    - WPPCONNECT_SECRET_KEY
#    - WPPCONNECT_PLATFORM (Apple Silicon/arm64: defaults to linux/amd64)

# 3. Start everything
docker-compose up -d
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      docker-compose                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  :8081         :3001         :21465        :4000                │
│  Frontend      Backend       WPPConnect    Firebase UI          │
│  (Nginx)  ───▶ (Node.js) ──▶ (Docker)                          │
│                    │                                            │
│              ┌─────┴─────┐                                      │
│              ▼           ▼                                      │
│         Firebase      Redis                                     │
│         Emulator      :6379                                     │
│              │                                                  │
│              ▼                                                  │
│         fake-gcs                                                │
│          :4443                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 8081 | React app (Nginx) |
| `backend` | 3001 | Node.js API |
| `wppconnect-server` | 21465 | WhatsApp API |
| `firebase-emulator` | 4000 | Emulator UI |
| `redis` | 6379 | Session storage |
| `fake-gcs` | 4443 | Storage emulator |

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8081 |
| Backend API | http://localhost:3001/api |
| WPPConnect | http://localhost:21465 |
| Firebase UI | http://localhost:4000 |
| GCS Emulator | http://localhost:4443 |

## Common Commands

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f wppconnect-server

# Restart single service
docker-compose restart backend

# Reset everything (deletes all data!)
docker-compose down -v && docker-compose up -d

# Shell into container
docker-compose exec backend sh
```

## Data Persistence

| Data | Location |
|------|----------|
| Firestore | Docker volume `firebase_data` |
| Redis | Docker volume `redis_data` |
| GCS uploads | `./data/gcs/` |
| WPPConnect | Docker volume `wppconnect_data` |

## Troubleshooting

### Backend won't start
```bash
docker-compose ps                    # Check status
docker-compose logs firebase-emulator # Check emulator
```

### WPPConnect QR code issues
```bash
docker-compose logs wppconnect-server # Check logs
docker-compose restart wppconnect-server
```

### 401 errors after restart
Clear browser localStorage → Login again

### Reset all data
```bash
docker-compose down -v
docker-compose up -d
```
