$ErrorActionPreference = "Stop"

$ApiUrl = if ($env:API_URL) { $env:API_URL } else { "" }
$Preview = if ($env:PREVIEW) { $env:PREVIEW } else { "false" }
$FirebaseToken = if ($env:FIREBASE_TOKEN) { $env:FIREBASE_TOKEN } else { "" }

if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
    Write-Host "API_URL is required (example: `$env:API_URL='https://your-backend-url.run.app/api')" -ForegroundColor Red
    exit 1
}

if (!(Test-Path ".firebaserc")) {
    Write-Host "Firebase not initialized. Run setup-firebase.sh first:" -ForegroundColor Red
    Write-Host "  `$env:PROJECT_ID='your-project-id'; ./scripts/gcp/setup-firebase.sh"
    exit 1
}

$FirebaseProjectId = (Get-Content ".firebaserc" | ConvertFrom-Json).projects.default
if ([string]::IsNullOrWhiteSpace($FirebaseProjectId) -or $FirebaseProjectId -eq "your-project-id" -or $FirebaseProjectId -eq "YOUR_PROJECT_ID") {
    Write-Host "Firebase project ID is not set in .firebaserc" -ForegroundColor Red
    Write-Host "  `$env:PROJECT_ID='your-project-id'; ./scripts/gcp/setup-firebase.sh"
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Firebase Hosting Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl"
Write-Host "Preview: $Preview"
Write-Host ""

Write-Host "==> Building frontend with REACT_APP_API_URL=$ApiUrl" -ForegroundColor Cyan
Push-Location frontend
npm ci
$env:REACT_APP_API_URL = $ApiUrl
npm run build
Pop-Location

# Prepare token arguments
$TokenArgs = @()
if (![string]::IsNullOrWhiteSpace($FirebaseToken)) {
    $TokenArgs += @("--token", $FirebaseToken)
    Write-Host "    Using Firebase CI token for authentication"
}

if ($Preview -eq "true") {
    $ChannelId = "preview-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
    Write-Host "==> Deploying to Firebase preview channel: $ChannelId" -ForegroundColor Cyan
    npx firebase hosting:channel:deploy $ChannelId --expires 7d @TokenArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Firebase preview deployment failed!" -ForegroundColor Red
        if ([string]::IsNullOrWhiteSpace($FirebaseToken)) {
            Write-Host ""
            Write-Host "For non-interactive deployments, set FIREBASE_TOKEN:" -ForegroundColor Cyan
            Write-Host "  1. Run: firebase login:ci"
            Write-Host "  2. Copy the token"
            Write-Host "  3. Set: `$env:FIREBASE_TOKEN='your-token'"
            Write-Host "  4. Re-run this script"
        }
        exit 1
    }
    
    Write-Host "Preview deployment complete. Look for 'Channel URL' above." -ForegroundColor Green
} else {
    Write-Host "==> Deploying to Firebase Hosting (production)" -ForegroundColor Cyan
    npx firebase deploy --only hosting @TokenArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Firebase deployment failed!" -ForegroundColor Red
        if ([string]::IsNullOrWhiteSpace($FirebaseToken)) {
            Write-Host ""
            Write-Host "For non-interactive deployments, set FIREBASE_TOKEN:" -ForegroundColor Cyan
            Write-Host "  1. Run: firebase login:ci"
            Write-Host "  2. Copy the token"
            Write-Host "  3. Set: `$env:FIREBASE_TOKEN='your-token'"
            Write-Host "  4. Re-run this script"
        }
        exit 1
    }
    
    Write-Host "Production deployment complete:" -ForegroundColor Green
    Write-Host "  Primary:   https://$FirebaseProjectId.web.app"
    Write-Host "  Alternate: https://$FirebaseProjectId.firebaseapp.com"
}

Write-Host ""
Write-Host "Deployment finished." -ForegroundColor Green
