$ErrorActionPreference = "Stop"

# Load local, non-committed secrets if present (preferred on this repo).
# This keeps tokens out of git while still feeding deploy scripts automatically.
if (Test-Path ".secrets.local") {
    foreach ($line in Get-Content ".secrets.local") {
        if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
        $pair = $line -split '=', 2
        if ($pair.Length -lt 2) { continue }
        $name = $pair[0]
        $value = $pair[1]
        if ([string]::IsNullOrWhiteSpace($name)) { continue }
        if ([string]::IsNullOrWhiteSpace((Get-Item -Path "Env:$name" -ErrorAction SilentlyContinue).Value)) {
            Set-Item -Path ("Env:$name") -Value $value
        }
    }
}

$ProjectId = if ($env:PROJECT_ID) { $env:PROJECT_ID } else { "" }
$Region = if ($env:REGION) { $env:REGION } else { "us-central1" }
$EnvironmentName = if ($env:ENVIRONMENT_NAME) { $env:ENVIRONMENT_NAME } else { "dev" }
$TfStateBucket = if ($env:TF_STATE_BUCKET) { $env:TF_STATE_BUCKET } else { "" }
$TfStatePrefix = if ($env:TF_STATE_PREFIX) { $env:TF_STATE_PREFIX } else { "txai-support/$EnvironmentName" }

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
    Write-Host "PROJECT_ID is required" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($TfStateBucket)) {
    Write-Host "TF_STATE_BUCKET is required (bucket created in bootstrap)" -ForegroundColor Red
    exit 1
}

# Ensure OpenTofu can access the GCS state backend on developer machines without
# requiring ADC to be configured (common on Windows). This token is short-lived.
try {
    $AccessToken = (gcloud auth print-access-token 2>$null).Trim()
    if (-not [string]::IsNullOrWhiteSpace($AccessToken)) {
        $env:GOOGLE_OAUTH_ACCESS_TOKEN = $AccessToken
    }
} catch {
    # If token retrieval fails, OpenTofu may still work via ADC or other auth.
}

# Helper function to load env file
function Load-EnvFile($Path, $Label) {
    if (Test-Path $Path) {
        Write-Host "==> Loading $Label from $Path" -ForegroundColor Cyan
        foreach ($line in Get-Content $Path) {
            if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
            $pair = $line -split '=', 2
            if ($pair.Length -lt 2) { continue }
            $name = $pair[0].Trim()
            $value = $pair[1].Trim()
            if ([string]::IsNullOrWhiteSpace($name)) { continue }
            # Only set if not already set (allow env overrides)
            if ([string]::IsNullOrWhiteSpace((Get-Item -Path "Env:$name" -ErrorAction SilentlyContinue).Value)) {
                Set-Item -Path ("Env:$name") -Value $value
            }
        }
    }
}

# Load environment from root and infra .env.local files
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Load-EnvFile (Join-Path $RepoRoot ".env.local") "root environment"
Load-EnvFile (Join-Path $RepoRoot "infra/.env.local") "infra environment"

Write-Host "==> Terraform apply (project=$ProjectId, region=$Region, env=$EnvironmentName)" -ForegroundColor Cyan
tofu -chdir=infra/terraform/environments/dev init `
  -backend-config="bucket=$TfStateBucket" `
  -backend-config="prefix=$TfStatePrefix"

tofu -chdir=infra/terraform/environments/dev apply -auto-approve `
  -var="project_id=$ProjectId" `
  -var="region=$Region" `
  -var="environment_name=$EnvironmentName"

$BackendUrl = tofu -chdir=infra/terraform/environments/dev output -raw backend_cloud_run_url
$BackendServiceName = tofu -chdir=infra/terraform/environments/dev output -raw backend_service_name
$ServiceAccount = tofu -chdir=infra/terraform/environments/dev output -raw runtime_api_email
$WppconnectUrl = tofu -chdir=infra/terraform/environments/dev output -raw wppconnect_cloud_run_url
$WppconnectServiceName = tofu -chdir=infra/terraform/environments/dev output -raw wppconnect_service_name
$ArtifactRepoUrl = tofu -chdir=infra/terraform/environments/dev output -raw artifact_repo_url
$RepoParts = $ArtifactRepoUrl.Split("/")
$ArRepo = $RepoParts[2]

Write-Host "    Backend Service:     $BackendServiceName"
Write-Host "    Backend URL:         $BackendUrl"
Write-Host "    WPPConnect Service:  $WppconnectServiceName"
Write-Host "    WPPConnect URL:      $WppconnectUrl"

# Derive Firebase/CORS inputs for backend with clear precedence:
# - FIREBASE_PROJECT_ID: caller env > .firebaserc > PROJECT_ID
# - CORS_ORIGINS: caller env > derived from FIREBASE_PROJECT_ID
Write-Host "==> Configuring CORS inputs for backend" -ForegroundColor Cyan

$FirebaseProjectId = if ($env:FIREBASE_PROJECT_ID) { $env:FIREBASE_PROJECT_ID } else { "" }
if ([string]::IsNullOrWhiteSpace($FirebaseProjectId) -and (Test-Path ".firebaserc")) {
    $FirebaseProjectId = (Get-Content ".firebaserc" | ConvertFrom-Json).projects.default
}

if ([string]::IsNullOrWhiteSpace($FirebaseProjectId) -or $FirebaseProjectId -eq "your-project-id" -or $FirebaseProjectId -eq "YOUR_PROJECT_ID") {
    $FirebaseProjectId = $ProjectId
}

$CorsOrigins = if ($env:CORS_ORIGINS) { $env:CORS_ORIGINS } else { "" }
if ([string]::IsNullOrWhiteSpace($CorsOrigins)) {
    $CorsOrigins = "https://$FirebaseProjectId.web.app,https://$FirebaseProjectId.firebaseapp.com"
}

Write-Host "    FIREBASE_PROJECT_ID: $FirebaseProjectId"
Write-Host "    CORS_ORIGINS: $CorsOrigins"

Write-Host "==> Deploy backend image" -ForegroundColor Cyan
$env:SERVICE_ACCOUNT = $ServiceAccount
$env:REGION = $Region
$env:IMAGE_NAME = "txai-backend"
$env:SERVICE_NAME = $BackendServiceName
$env:AR_REPO = $ArRepo
$env:PROJECT_ID = $ProjectId
$env:CORS_ORIGINS = $CorsOrigins
$env:FIREBASE_PROJECT_ID = $FirebaseProjectId
$env:WPPCONNECT_BASE_URL = $WppconnectUrl
& scripts/gcp/deploy-backend.ps1

Write-Host "==> Deploy frontend (Firebase Hosting)" -ForegroundColor Cyan
$env:API_URL = "$BackendUrl/api"
& scripts/gcp/deploy-frontend-firebase.ps1

Write-Host "==> Done" -ForegroundColor Green
Write-Host ""
Write-Host "========================================"
Write-Host "Application URLs"
Write-Host "========================================"
Write-Host ""
if (Test-Path ".firebaserc") {
    $FirebaseProject = (Get-Content .firebaserc | ConvertFrom-Json).projects.default
    if (![string]::IsNullOrWhiteSpace($FirebaseProject)) {
        Write-Host "Frontend:   https://$FirebaseProject.web.app"
    } else {
        Write-Host "Frontend:   (missing Firebase project id in .firebaserc)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Frontend:   (missing .firebaserc, run setup-firebase.sh)" -ForegroundColor Yellow
}
Write-Host "Backend:    $BackendUrl"
Write-Host "Health:     $BackendUrl/api/health"
Write-Host "WPPConnect: $WppconnectUrl"
Write-Host ""
