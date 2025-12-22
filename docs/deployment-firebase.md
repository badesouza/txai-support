# Firebase Hosting Deployment

## Overview

The frontend is deployed to Firebase Hosting, providing:
- **Global CDN** distribution for fast load times worldwide
- **Automatic HTTPS** with managed SSL certificates
- **SPA routing** - all routes serve `index.html`
- **Instant atomic deployments** with zero downtime
- **Preview channels** for testing before production

## Configuration Files

### .firebaserc

Located in the repository root. Maps deployment aliases to GCP projects:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

**Note:** This file IS committed to the repository.

### firebase.json

Located in the repository root. Hosting configuration:

```json
{
  "hosting": {
    "public": "frontend/build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      }
    ]
  }
}
```

**Key Settings:**
- **public**: Build output directory (React's `build/` folder)
- **rewrites**: SPA routing - all paths serve `/index.html`
- **headers**: Cache-Control for optimal performance
  - Static assets (JS/CSS/images): 1 year immutable cache
  - index.html: No cache (always fetch latest)

## Deployment URLs

Your app is accessible at two URLs (both point to the same deployment):
- **Primary**: `https://<project-id>.web.app`
- **Alternate**: `https://<project-id>.firebaseapp.com`

## Deployment

### Production Deployment

Deploy to production (live site):

```bash
export API_URL=https://your-backend.run.app/api
./scripts/gcp/deploy-frontend-firebase.sh
```

This will:
1. Build the React app with the API URL
2. Deploy to Firebase Hosting
3. Show the live URL

### Preview Channel Deployment (Testing)

Deploy to a preview channel for testing before going live:

```bash
export API_URL=https://your-backend.run.app/api
export PREVIEW=true
./scripts/gcp/deploy-frontend-firebase.sh
```

Preview channels:
- Auto-expire after 7 days
- Have unique URLs with hash (e.g., `https://project--preview-123-abc.web.app`)
- Safe for testing without affecting production
- Can be deleted manually: `npx firebase hosting:channel:delete preview-123`

### Manual Deployment Commands

If you prefer to run Firebase CLI directly:

```bash
# Production
cd frontend
REACT_APP_API_URL=https://your-backend.run.app/api npm run build
cd ..
npx firebase deploy --only hosting

# Preview channel
npx firebase hosting:channel:deploy preview-feature-name --expires 7d
```

## Environment Variables

### Build-Time Variables

The React app uses environment variables that are **baked into the build**:

- **REACT_APP_API_URL**: Backend API URL (from Cloud Run)

**Important:** These are NOT runtime variables. To change them:
1. Set the new value
2. Rebuild: `npm run build`
3. Redeploy: `firebase deploy --only hosting`

### CORS Configuration

The backend must allow requests from Firebase Hosting URLs.

This is configured automatically in Terraform (`infra/terraform/environments/dev/main.tf`):

```hcl
CORS_ORIGINS = "https://<project-id>.web.app,https://<project-id>.firebaseapp.com"
```

Verify CORS is configured:

```bash
gcloud run services describe txai-backend \
  --region us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)" | grep CORS
```

Should show both Firebase domains.

## Local Development

**Firebase is NOT needed for local development!**

Simply run the React dev server:

```bash
cd frontend
npm install
npm start
```

React dev server runs at: **http://localhost:3000**

The dev server provides:
- Hot module reload (instant updates)
- Better error messages
- No build step required

## Firebase CLI Commands

### View Deployment History

```bash
npx firebase hosting:clone --list
```

### Rollback to Previous Version

```bash
# List versions
npx firebase hosting:clone --list

# Rollback (replace VERSION_ID)
npx firebase hosting:clone <SITE_ID> live:<VERSION_ID>
```

### View Current Deployment Info

```bash
npx firebase hosting:channel:list
```

### Delete Preview Channel

```bash
npx firebase hosting:channel:delete preview-channel-name
```

## Troubleshooting

### 404 on Page Refresh

**Symptom:** Navigating to `/calls` works, but refreshing the page shows 404.

**Cause:** Rewrites not configured correctly in `firebase.json`.

**Solution:** Verify `firebase.json` has the catch-all rewrite rule:

```json
{
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

### CORS Errors

**Symptom:** Network errors in browser console, "blocked by CORS policy".

**Cause:** Backend doesn't allow Firebase domain.

**Solution:** Check Cloud Run environment variables:

```bash
gcloud run services describe txai-backend \
  --region us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)" | grep CORS
```

Should include Firebase URLs. If missing, apply Terraform:

```bash
cd infra/terraform/environments/dev
tofu apply
```

### Old Version Still Showing

**Symptom:** Deployed new version, but seeing old content.

**Cause:** Browser cache or CDN cache.

**Solution:**
1. Firebase auto-invalidates CDN on deploy
2. Clear browser cache (Cmd+Shift+R or Ctrl+F5)
3. Try incognito/private window

### Deployment Fails: "Not authorized"

**Symptom:** `firebase deploy` fails with authorization error.

**Solution:** Re-authenticate:

```bash
firebase login --reauth
```

### Deployment Hangs

**Symptom:** Deployment command hangs indefinitely.

**Solution:** Check Firebase APIs are enabled:

```bash
gcloud services enable firebase.googleapis.com
gcloud services enable firebasehosting.googleapis.com
```

### Build Contains Wrong API_URL

**Symptom:** Frontend calls wrong backend URL.

**Cause:** `REACT_APP_API_URL` not set during build.

**Solution:** Verify environment variable is exported before building:

```bash
export API_URL=https://correct-backend-url.run.app/api
./scripts/gcp/deploy-frontend-firebase.sh
```

Or check the built JavaScript:

```bash
grep -r "https://.*txai-backend.*" frontend/build/static/js/
```

## Best Practices

### 1. Always Test with Preview Channels

Before deploying to production, test with a preview channel:

```bash
export PREVIEW=true
./scripts/gcp/deploy-frontend-firebase.sh
```

### 2. Use Meaningful Preview Channel Names

Instead of timestamps, use descriptive names:

```bash
npx firebase hosting:channel:deploy feature-new-dashboard --expires 7d
```

### 3. Clean Up Old Preview Channels

Preview channels consume hosting quota. Delete after testing:

```bash
npx firebase hosting:channel:delete feature-new-dashboard
```

### 4. Monitor Deployment Size

Keep bundle size small for fast load times:

```bash
# After build
du -sh frontend/build
```

If too large, consider code splitting or tree shaking.

### 5. Verify HTTPS

Always access via HTTPS (not HTTP). Firebase forces HTTPS, but verify:

```bash
curl -I http://your-project.web.app
# Should redirect to https://
```

## Performance Optimization

Firebase Hosting is already optimized, but you can improve further:

### 1. Enable Compression (Already Done)

Brotli compression is enabled by Firebase automatically for:
- HTML, CSS, JavaScript
- JSON, XML
- Fonts (WOFF, WOFF2)

### 2. Optimize Images

Before deploying, optimize images:

```bash
# Install imagemin
npm install -g imagemin-cli imagemin-pngquant imagemin-mozjpeg

# Optimize
imagemin frontend/public/*.{jpg,png} --out-dir=frontend/public/optimized
```

### 3. Code Splitting

React automatically does code splitting for routes. Verify:

```bash
ls frontend/build/static/js/
# Should see multiple chunk files
```

### 4. Monitor Performance

Use Firebase Performance Monitoring (optional):

```bash
npx firebase init performance
```

## Cost

Firebase Hosting free tier (very generous):
- **10 GB** storage
- **360 MB/day** data transfer (~10 GB/month)
- Unlimited SSL certificates
- Unlimited custom domains

For this app: **$0/month** (well within free tier)

## Migration Notes

### From GCS to Firebase

This project was migrated from Google Cloud Storage (GCS) to Firebase Hosting.

**Advantages of Firebase:**
- Global CDN (GCS was single-region)
- Automatic cache invalidation
- Preview channels for testing
- Better DX (CLI, hosting channels)
- Free tier (GCS cost ~$0.13/month)

**Removed:**
- GCS frontend bucket (Terraform resource)
- nginx configuration (not needed, Firebase handles routing)
- Docker frontend service (use `npm start` locally)

## Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [SPA Routing Guide](https://firebase.google.com/docs/hosting/full-config#rewrites)
- [Custom Domain Setup](https://firebase.google.com/docs/hosting/custom-domain)
