# Troubleshooting Guide

## Quick Diagnosis

```
Problem?
   │
   ├── 401 Unauthorized ────────▶ See "Authentication Issues"
   │
   ├── CORS Errors ─────────────▶ See "CORS Errors"
   │
   ├── WhatsApp not connecting ─▶ See "WPPConnect Issues"
   │
   ├── Database errors ─────────▶ See "Database Issues"
   │
   └── Deploy failures ─────────▶ See "Deploy Issues"
```

---

## Authentication Issues (401)

### Admin User Not Created

**Symptom:** Login fails, logs show "Usuário não encontrado"

**Fix:**
```bash
gcloud run services update txai-backend --region us-central1 \
  --update-env-vars ADMIN_DEFAULT_PASSWORD="your-secure-password"
```

### JWT Token Mismatch

**Symptom:** 401 on protected endpoints after login success

**Fix (Local):**
1. Browser DevTools → Application → Local Storage
2. Delete `token` entry
3. Login again

**Fix (Cloud):**
```bash
gcloud run services update txai-backend --region us-central1 \
  --update-env-vars JWT_SECRET="$(openssl rand -base64 32)"
```

---

## CORS Errors

**Symptom:** Browser console: `blocked by CORS policy`

**Fix:**
```bash
gcloud run services update txai-backend --region us-central1 \
  --update-env-vars "CORS_ORIGINS=https://your-app.web.app,https://your-app.firebaseapp.com"
```

---

## WPPConnect Issues

### QR Code Not Showing

**Local:**
```bash
docker-compose logs wppconnect-server
docker-compose restart wppconnect-server
```

**Cloud (VM):**
```bash
# Check VM logs
gcloud compute ssh wppconnect-server --zone=us-central1-a \
  --command="sudo docker logs --tail 50 wppconnect-server"

# Restart container
gcloud compute ssh wppconnect-server --zone=us-central1-a \
  --command="sudo docker restart wppconnect-server"
```

### Session Lost / Disconnected

**Symptom:** "Parando polling" or "CLOSED" status

**Cloud:** Sessions persist on VM's SSD. If lost:
1. Check VM is running: `gcloud compute instances list`
2. Check container: `gcloud compute ssh ... --command="sudo docker ps"`
3. Re-scan QR code from frontend

### Backend Can't Reach WPPConnect

**Symptom:** Backend returns WPPConnect errors

**Check URL is synced:**
```bash
gcloud run services describe txai-backend --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)" | grep WPPCONNECT

# Should show: WPPCONNECT_BASE_URL=http://<VM-IP>:21465
```

**Re-sync via Terraform:**
```bash
cd infra/terraform/environments/dev
tofu apply  # Triggers null_resource to update backend
```

---

## Database Issues

### Local
```bash
docker-compose ps                     # Check emulator status
docker-compose logs firebase-emulator # View logs
docker-compose down -v && docker-compose up -d  # Reset
```

### Cloud
```bash
gcloud firestore databases list --project=YOUR_PROJECT
gcloud run logs read txai-backend --limit=50
```

---

## Storage Issues

### Local
```bash
curl http://localhost:4443/storage/v1/b  # Test emulator
docker-compose restart fake-gcs          # Restart
```

### Cloud
```bash
gsutil ls gs://your-bucket-name          # Check bucket
```

---

## Deploy Issues

### Build Failed
```bash
gcloud builds list --limit 1
gcloud builds log [BUILD_ID]
```

### Container Crashing
```bash
gcloud run logs read txai-backend --limit=50
```

### Common Causes
1. Missing environment variables
2. Wrong WPPCONNECT_BASE_URL
3. Redis connection issues

### Frontend Blank Screen
1. Check `firebase.json` has rewrites: `{ "source": "**", "destination": "/index.html" }`
2. Verify API URL in build: `grep -r "txai-backend" frontend/build/static/js/`

---

## Logs Cheatsheet

```bash
# Backend (Cloud Run)
gcloud run logs read txai-backend --limit=50

# WPPConnect (VM)
gcloud compute ssh wppconnect-server --zone=us-central1-a \
  --command="sudo docker logs -f wppconnect-server"

# Local (Docker)
docker-compose logs -f backend
docker-compose logs -f wppconnect-server
```
