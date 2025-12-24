# Troubleshooting Guide

Common issues and their solutions.

## Table of Contents
- [401 Unauthorized](#401-unauthorized)
- [CORS Errors](#cors-errors)
- [Database Issues](#database-issues)
- [Storage Issues](#storage-issues)
- [Deploy Issues](#deploy-issues)

---

## 401 Unauthorized

### Symptom
Frontend receives 401 errors on protected endpoints (`/api/users`, `/api/calls`) after login.

### Cause
JWT token mismatch - usually an old token signed with a different `JWT_SECRET`.

### Solution

**Local:** Clear browser localStorage and login again:
1. DevTools → Application → Local Storage
2. Delete `token` entry
3. Login again

**Cloud:** Ensure `JWT_SECRET` is consistent:
```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update Cloud Run
gcloud run services update txai-backend \
  --region us-central1 \
  --update-env-vars JWT_SECRET=$NEW_SECRET
```

> Note: All users must login again after changing the secret.

---

## CORS Errors

### Symptom
Browser console shows: `Access to XMLHttpRequest blocked by CORS policy`

### Cause
Backend not accepting requests from frontend origin.

### Solution

```bash
# Check current CORS config
gcloud run services describe txai-backend \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"

# Update CORS origins
gcloud run services update txai-backend \
  --update-env-vars "CORS_ORIGINS=https://your-app.web.app,https://your-app.firebaseapp.com"
```

---

## Database Issues

### Symptom
Backend fails to start or returns 500 errors on data operations.

### Local Solution

```bash
# Check Firebase emulator is running
docker-compose ps
docker-compose logs firebase-emulator

# Reset everything
docker-compose down -v
docker-compose up -d
```

### Cloud Solution

Check Firestore is enabled:
```bash
gcloud firestore databases list --project=YOUR_PROJECT
```

Check Cloud Run logs:
```bash
gcloud run logs read txai-backend --limit=50
```

---

## Storage Issues

### Symptom
File uploads fail or images don't display.

### Local Solution

```bash
# Check GCS emulator is running
curl http://localhost:4443/storage/v1/b

# Restart emulator
docker-compose restart fake-gcs
```

### Cloud Solution

Verify bucket exists and backend has access:
```bash
gsutil ls gs://your-bucket-name
```

---

## Deploy Issues

### Symptom
Deploy fails or containers crash on startup.

### Solution

**Check build logs:**
```bash
gcloud builds list --limit 1
gcloud builds log [BUILD_ID]
```

**Check runtime logs:**
```bash
gcloud run logs read txai-backend --limit=50
```

**Common causes:**
1. Missing environment variables
2. Firebase/GCP credentials not configured
3. Network issues connecting to Redis Cloud

### Frontend Blank Screen

Ensure SPA routing in `firebase.json`:
```json
{
  "rewrites": [{ "source": "**", "destination": "/index.html" }]
}
```

Verify API URL is baked into the build:
```bash
export REACT_APP_API_URL="https://your-backend.run.app/api"
npm run build
```
