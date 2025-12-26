# Firebase Hosting Deployment

Frontend deployment to Firebase Hosting (global CDN).

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Firebase Hosting                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Build: frontend/build/                                         │
│     │                                                           │
│     ▼                                                           │
│  Firebase Deploy ──▶ Global CDN ──▶ https://project.web.app    │
│                                                                 │
│  Features:                                                      │
│  ✅ Automatic HTTPS       ✅ Global CDN                         │
│  ✅ SPA routing           ✅ Preview channels                   │
│  ✅ Zero-downtime deploy  ✅ Free tier                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## URLs

| URL | Description |
|-----|-------------|
| `https://<project>.web.app` | Primary |
| `https://<project>.firebaseapp.com` | Alternate |

## Deploy

### Production

```bash
export API_URL=https://your-backend.run.app/api
./scripts/gcp/deploy-frontend-firebase.sh
```

### Preview Channel (Testing)

```bash
export API_URL=https://your-backend.run.app/api
export PREVIEW=true
./scripts/gcp/deploy-frontend-firebase.sh
```

Preview channels auto-expire in 7 days.

## Configuration Files

### firebase.json

```json
{
  "hosting": {
    "public": "frontend/build",
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "**/*.@(js|css|jpg|png|svg)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000" }]
      },
      {
        "source": "index.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      }
    ]
  }
}
```

### .firebaserc

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

## Environment Variables

Build-time only (baked into JS):

```bash
REACT_APP_API_URL=https://backend.run.app/api
```

To change: rebuild + redeploy.

## CORS

Backend must allow Firebase URLs. Terraform configures this:

```hcl
CORS_ORIGINS = "https://<project>.web.app,https://<project>.firebaseapp.com"
```

## CLI Commands

```bash
# Deploy to production
npx firebase deploy --only hosting

# Deploy preview channel
npx firebase hosting:channel:deploy preview-name --expires 7d

# List channels
npx firebase hosting:channel:list

# Delete preview channel
npx firebase hosting:channel:delete preview-name
```

## Troubleshooting

### 404 on Page Refresh

Check `firebase.json` has SPA rewrite:
```json
{ "rewrites": [{ "source": "**", "destination": "/index.html" }] }
```

### CORS Errors

Check backend has Firebase URLs:
```bash
gcloud run services describe txai-backend --region us-central1 \
  --format="yaml" | grep CORS
```

### Old Version Showing

1. Firebase auto-invalidates CDN on deploy
2. Clear browser cache (Cmd+Shift+R)
3. Try incognito window

### Wrong API URL

Check built JS:
```bash
grep -r "txai-backend" frontend/build/static/js/
```

Rebuild with correct URL:
```bash
REACT_APP_API_URL=https://correct-url.run.app/api npm run build
```

## Cost

Firebase Hosting free tier:
- 10 GB storage
- ~10 GB/month transfer
- Unlimited SSL/custom domains

**Cost for this app: $0/month**
