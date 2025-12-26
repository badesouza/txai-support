# Docker (Local Development)

Docker Compose runs the complete development environment locally.

## Quick Start

```bash
# Create secrets file
cp env.example .env
# Edit .env and set JWT_SECRET and ADMIN_DEFAULT_PASSWORD (and WPPCONNECT secrets if needed)

# Start everything
docker-compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 8081 | React app (Nginx) |
| `backend` | 3001 | Node.js API |
| `firebase-emulator` | 4000, 8082 | Firestore + Auth emulator |
| `redis` | 6379 | Session storage |
| `fake-gcs` | 4443 | GCS emulator |
| `wppconnect-server` | 21465 | WhatsApp API (WPPConnect-Server) |

## URLs

- **Frontend**: http://localhost:8081
- **Backend API**: http://localhost:3001/api
- **Firebase Emulator UI**: http://localhost:4000
- **GCS Emulator**: http://localhost:4443

## Common Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Restart backend
docker-compose restart backend

# Reset everything (deletes all data)
docker-compose down -v && docker-compose up -d

# Access Redis CLI
docker-compose exec redis redis-cli

# Check Firebase emulator
curl http://localhost:8082
```

## Data Persistence

| Data | Location |
|------|----------|
| Firestore | Docker volume `firebase_data` |
| Redis | Docker volume `redis_data` |
| GCS uploads | `./data/gcs/txai-uploads/` |
| WPPConnect-Server sessions | Docker volume `wppconnect_data` |

## Troubleshooting

### Backend won't start

Check Firebase emulator is healthy:
```bash
docker-compose ps
docker-compose logs firebase-emulator
```

### Old data causing issues

Reset all volumes:
```bash
docker-compose down -v
docker-compose up -d
```

### 401 errors after restart

Clear browser localStorage and login again.
