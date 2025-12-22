$ErrorActionPreference = "Stop"

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
$ArtifactRepoUrl = tofu -chdir=infra/terraform/environments/dev output -raw artifact_repo_url
$RepoParts = $ArtifactRepoUrl.Split("/")
$ArRepo = $RepoParts[2]

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
& scripts/gcp/deploy-backend.ps1

Write-Host "==> Deploy frontend (Firebase Hosting)" -ForegroundColor Cyan
$env:API_URL = "$BackendUrl/api"
& scripts/gcp/deploy-frontend-firebase.ps1

Write-Host "==> Done" -ForegroundColor Green
if (Test-Path ".firebaserc") {
    $FirebaseProject = (Get-Content .firebaserc | ConvertFrom-Json).projects.default
    if (![string]::IsNullOrWhiteSpace($FirebaseProject)) {
        Write-Host "Frontend: https://$FirebaseProject.web.app"
    } else {
        Write-Host "Frontend: (missing Firebase project id in .firebaserc)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Frontend: (missing .firebaserc, run setup-firebase.sh)" -ForegroundColor Yellow
}
Write-Host "Backend:  $BackendUrl"
