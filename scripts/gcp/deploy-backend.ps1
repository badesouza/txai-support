$ErrorActionPreference = "Stop"

$ProjectId = if ($env:PROJECT_ID) { $env:PROJECT_ID } else { "" }
$Region = if ($env:REGION) { $env:REGION } else { "us-central1" }
$ArRepo = if ($env:AR_REPO) { $env:AR_REPO } else { "txai-support" }
$ImageName = if ($env:IMAGE_NAME) { $env:IMAGE_NAME } else { "txai-backend" }
$ServiceName = if ($env:SERVICE_NAME) { $env:SERVICE_NAME } else { "txai-backend" }
$ServiceAccount = if ($env:SERVICE_ACCOUNT) { $env:SERVICE_ACCOUNT } else { "" }
$CorsOrigins = if ($env:CORS_ORIGINS) { $env:CORS_ORIGINS } else { "" }
$FirebaseProjectId = if ($env:FIREBASE_PROJECT_ID) { $env:FIREBASE_PROJECT_ID } else { "" }
$WppconnectBaseUrl = if ($env:WPPCONNECT_BASE_URL) { $env:WPPCONNECT_BASE_URL } else { "" }
$TimeoutSeconds = if ($env:TIMEOUT_SECONDS) { $env:TIMEOUT_SECONDS } else { "300" }
$MaxInstances = if ($env:MAX_INSTANCES) { $env:MAX_INSTANCES } else { "" }

$ImageUri = "$Region-docker.pkg.dev/$ProjectId/$ArRepo/${ImageName}:latest"

Write-Host "==> Build/push: $ImageUri" -ForegroundColor Cyan
gcloud builds submit --tag $ImageUri ./backend

# Cloud Run URL is stable across revisions; we use it for WPPConnect webhook callbacks.
$ServiceUrl = ""
try {
  $ServiceUrl = (gcloud run services describe $ServiceName --region $Region --format="value(status.url)" 2>$null).Trim()
} catch {
  $ServiceUrl = ""
}

Write-Host "==> Update Cloud Run image: $ServiceName" -ForegroundColor Cyan
$CmdArgs = @("run", "services", "update", $ServiceName, "--image", $ImageUri, "--region", $Region, "--timeout", $TimeoutSeconds)
if (-not [string]::IsNullOrWhiteSpace($MaxInstances)) {
  $CmdArgs += @("--max-instances", $MaxInstances)
}
if (-not [string]::IsNullOrWhiteSpace($ServiceAccount)) {
  $CmdArgs += @("--service-account", $ServiceAccount)
}

# Env var precedence for CORS:
# 1) CORS_ORIGINS (explicit input from caller/pipeline)
# 2) FIREBASE_PROJECT_ID (derive Firebase Hosting URLs)
# 3) (no change)
$CorsToSet = ""
if (-not [string]::IsNullOrWhiteSpace($CorsOrigins)) {
  $CorsToSet = $CorsOrigins
} elseif (-not [string]::IsNullOrWhiteSpace($FirebaseProjectId)) {
  $CorsToSet = "https://$FirebaseProjectId.web.app,https://$FirebaseProjectId.firebaseapp.com"
}

if (-not [string]::IsNullOrWhiteSpace($CorsToSet)) {
  Write-Host "==> Updating CORS_ORIGINS: $CorsToSet" -ForegroundColor Cyan
  # IMPORTANT:
  # - Use update-env-vars so we do NOT replace other env vars (e.g. DATABASE_URL).
  # - Use a custom delimiter (;) so commas inside the value are safe.
  $CmdArgs += @("--update-env-vars=^;^CORS_ORIGINS=$CorsToSet")
} else {
  Write-Host "==> Not updating CORS_ORIGINS (no CORS_ORIGINS or FIREBASE_PROJECT_ID provided)." -ForegroundColor Yellow
}

if (-not [string]::IsNullOrWhiteSpace($ServiceUrl)) {
  Write-Host "==> Updating PUBLIC_BASE_URL: $ServiceUrl" -ForegroundColor Cyan
  $CmdArgs += @("--update-env-vars=^;^PUBLIC_BASE_URL=$ServiceUrl")
} else {
  Write-Host "==> Not updating PUBLIC_BASE_URL (failed to read service URL)." -ForegroundColor Yellow
}

if (-not [string]::IsNullOrWhiteSpace($WppconnectBaseUrl)) {
  Write-Host "==> Updating WPPCONNECT_BASE_URL: $WppconnectBaseUrl" -ForegroundColor Cyan
  $CmdArgs += @("--update-env-vars=^;^WPPCONNECT_BASE_URL=$WppconnectBaseUrl")
} else {
  Write-Host "==> Not updating WPPCONNECT_BASE_URL (WPPCONNECT_BASE_URL not provided)." -ForegroundColor Yellow
}

gcloud @CmdArgs

Write-Host "==> Configure additional env vars with:" -ForegroundColor Yellow
Write-Host "gcloud run services update $ServiceName --region $Region --update-env-vars KEY=VALUE"
