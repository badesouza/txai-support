# Destroy Complete GCP Infrastructure (PowerShell)
# WARNING: This will destroy all cloud resources including:
#  - Cloud Run services
#  - Compute Engine VMs
#  - Firestore database
#  - GCS buckets (with manual cleanup)
#  - Service accounts and secrets
#
# State bucket and protected buckets require manual deletion

param(
    [switch]$DestroyStateBegin = $false,
    [switch]$SkipConfirmation = $false
)

$ErrorActionPreference = "Stop"

# Color output functions
function Write-Info { Write-Host "==> $args" -ForegroundColor Blue }
function Write-Success { Write-Host "==> $args" -ForegroundColor Green }
function Write-Warn { Write-Host "==> $args" -ForegroundColor Yellow }
function Write-Error_ { Write-Host "==> $args" -ForegroundColor Red }
function Write-Danger { Write-Host "❌ $args" -ForegroundColor Magenta }

# Get script and repo root directories
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

# Load environment from .env.local files
if (Test-Path "$repoRoot\.env.local") {
    Write-Info "Loading root environment from .env.local..."
    Get-Content "$repoRoot\.env.local" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

if (Test-Path "$repoRoot\infra\.env.local") {
    Write-Info "Loading infra environment from infra/.env.local..."
    Get-Content "$repoRoot\infra\.env.local" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

# Configuration
$projectId = [System.Environment]::GetEnvironmentVariable("PROJECT_ID", "User") -or [System.Environment]::GetEnvironmentVariable("PROJECT_ID", "Machine")
$region = [System.Environment]::GetEnvironmentVariable("REGION", "User") -or "us-central1"
$environmentName = [System.Environment]::GetEnvironmentVariable("ENVIRONMENT_NAME", "User") -or "dev"
$tfStateBucket = [System.Environment]::GetEnvironmentVariable("TF_STATE_BUCKET", "User") -or [System.Environment]::GetEnvironmentVariable("TF_STATE_BUCKET", "Machine")
$tfStatePrefix = [System.Environment]::GetEnvironmentVariable("TF_STATE_PREFIX", "User") -or "txai-support/$environmentName"
$uploadsBucket = [System.Environment]::GetEnvironmentVariable("UPLOADS_BUCKET", "User") -or "$projectId-uploads"
$destroyStateBucket = $DestroyStateBegin

# Validate required variables
if ([string]::IsNullOrEmpty($projectId)) {
    Write-Error_ "PROJECT_ID is required"
    Write-Host "Usage: .\destroy-all.ps1 -ProjectId 'your-project' -TfStateBucket 'your-tfstate-bucket'"
    Write-Host "Or create .env.local and infra\.env.local with the required values"
    exit 1
}

if ([string]::IsNullOrEmpty($tfStateBucket)) {
    Write-Error_ "TF_STATE_BUCKET is required (created during bootstrap)"
    exit 1
}

Write-Host ""
Write-Danger "⚠️  INFRASTRUCTURE DESTRUCTION INITIATED"
Write-Host ""
Write-Warn "This will DESTROY:"
Write-Host "  ✗ Cloud Run backend service"
Write-Host "  ✗ Compute Engine VM (wppconnect-server)"
Write-Host "  ✗ Firestore database ($environmentName)"
Write-Host "  ✗ GCS uploads bucket"
Write-Host "  ✗ Service accounts and secrets"
Write-Host "  ✗ Artifact Registry"
Write-Host ""
Write-Host "Configuration:"
Write-Host "  Project ID:       $projectId"
Write-Host "  Environment:      $environmentName"
Write-Host "  Region:           $region"
Write-Host "  State Bucket:     $tfStateBucket"
Write-Host "  Uploads Bucket:   $uploadsBucket"
Write-Host ""

# Confirmation prompt
if (-not $SkipConfirmation) {
    $response = Read-Host "Type 'destroy' to continue"
    if ($response -ne "destroy") {
        Write-Warn "Destruction cancelled"
        exit 0
    }

    # Additional confirmation for non-dev environments
    if ($environmentName -ne "dev") {
        Write-Danger "⚠️  You are destroying the $environmentName environment!"
        $response = Read-Host "Type 'destroy-$environmentName' to confirm"
        if ($response -ne "destroy-$environmentName") {
            Write-Warn "Destruction cancelled"
            exit 0
        }
    }
}

# Check prerequisites
Write-Info "Checking prerequisites..."

$prereqs = @("gcloud", "tofu", "gsutil")
foreach ($cmd in $prereqs) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error_ "$cmd not found. Please install it first."
        exit 1
    }
}

# Verify gcloud authentication
try {
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null | Select-Object -First 1
    if ([string]::IsNullOrEmpty($account)) {
        throw "Not authenticated"
    }
    Write-Success "Authenticated as: $account"
} catch {
    Write-Error_ "Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
}

# Set active project
Write-Info "Setting active project..."
gcloud config set project $projectId 2>&1 | Out-Null
Write-Success "Project set to $projectId"

# Step 1: Destroy dev environment resources
Write-Info "Step 1: Destroying infrastructure in $environmentName environment..."

$terraformDir = "$repoRoot\infra\terraform\environments\dev"
if (-not (Test-Path $terraformDir)) {
    Write-Error_ "Terraform directory not found: $terraformDir"
    exit 1
}

Push-Location $terraformDir
Write-Info "Changed to: $terraformDir"

try {
    # Initialize Terraform with remote backend
    Write-Info "Initializing Terraform backend..."
    tofu init `
        -backend-config="bucket=$tfStateBucket" `
        -backend-config="prefix=$tfStatePrefix" `
        -upgrade `
        -reconfigure

    # Show what will be destroyed
    Write-Info "Showing destruction plan..."
    tofu plan -destroy -out=destroy.tfplan

    # Confirm before destruction
    if (-not $SkipConfirmation) {
        Write-Danger "Review the plan above carefully. This action is IRREVERSIBLE."
        $response = Read-Host "Type 'yes' to destroy resources"
        if ($response -ne "yes") {
            Write-Warn "Destruction cancelled"
            if (Test-Path "destroy.tfplan") { Remove-Item "destroy.tfplan" }
            exit 0
        }
    }

    # Execute destruction
    Write-Danger "Destroying Terraform-managed resources..."
    tofu apply destroy.tfplan

    if (Test-Path "destroy.tfplan") { Remove-Item "destroy.tfplan" }
    Write-Success "Terraform-managed resources destroyed"
} finally {
    Pop-Location
}

# Step 2: Handle protected GCS buckets
Write-Info "Step 2: Handling protected GCS buckets..."

$bucketExists = gsutil -q ls "gs://$uploadsBucket" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Warn "Uploads bucket exists: gs://$uploadsBucket"
    Write-Info "Emptying bucket (this may take a while)..."
    gsutil -m rm -r "gs://$uploadsBucket/*" 2>$null

    Write-Info "Deleting bucket..."
    gcloud storage buckets delete "gs://$uploadsBucket" --quiet 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Could not delete uploads bucket. It may have retention policies or other protections."
        Write-Info "Delete manually if needed: gcloud storage buckets delete gs://$uploadsBucket"
    }
} else {
    Write-Success "Uploads bucket already gone"
}

# Step 3: Optional state bucket destruction
if ($destroyStateBucket) {
    Write-Info "Step 3: Destroying state bucket (DestroyStateBegin=true)..."
    
    $stateExists = gsutil -q ls "gs://$tfStateBucket" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Warn "State bucket exists: gs://$tfStateBucket"
        Write-Info "Emptying bucket (this may take a while)..."
        gsutil -m rm -r "gs://$tfStateBucket/*" 2>$null

        Write-Info "Deleting state bucket..."
        gcloud storage buckets delete "gs://$tfStateBucket" --quiet 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Error_ "Could not delete state bucket."
            Write-Info "Delete manually: gcloud storage buckets delete gs://$tfStateBucket"
        }
    }
} else {
    Write-Warn "State bucket NOT deleted (DestroyStateBegin=false)"
    Write-Info "To destroy state bucket later, run:"
    Write-Host "  gsutil -m rm -r gs://$tfStateBucket/*"
    Write-Host "  gcloud storage buckets delete gs://$tfStateBucket"
    Write-Host ""
    Write-Host "Or run: .\destroy-all.ps1 -DestroyStateBegin"
}

# Step 4: Optional bootstrap destruction
if (-not $SkipConfirmation) {
    Write-Info "Step 4: Bootstrap destruction..."
    $response = Read-Host "Destroy bootstrap infrastructure too? (y/n)"

    if ($response -match "^[Yy]$") {
        $bootstrapDir = "$repoRoot\infra\terraform\bootstrap"
        
        if (-not (Test-Path $bootstrapDir)) {
            Write-Error_ "Bootstrap directory not found: $bootstrapDir"
        } else {
            Push-Location $bootstrapDir
            Write-Info "Changed to: $bootstrapDir"
            
            try {
                Write-Info "Initializing Bootstrap Terraform..."
                tofu init -upgrade

                Write-Info "Showing bootstrap destruction plan..."
                tofu plan -destroy -out=destroy-bootstrap.tfplan

                Write-Danger "Review bootstrap destruction plan above."
                $response = Read-Host "Type 'yes' to destroy bootstrap"
                
                if ($response -eq "yes") {
                    Write-Danger "Destroying bootstrap infrastructure..."
                    tofu apply destroy-bootstrap.tfplan
                    if (Test-Path "destroy-bootstrap.tfplan") { Remove-Item "destroy-bootstrap.tfplan" }
                    Write-Success "Bootstrap infrastructure destroyed"
                } else {
                    Write-Warn "Bootstrap destruction cancelled"
                    if (Test-Path "destroy-bootstrap.tfplan") { Remove-Item "destroy-bootstrap.tfplan" }
                }
            } finally {
                Pop-Location
            }
        }
    } else {
        Write-Info "Bootstrap destruction skipped"
    }
}

# Summary
Write-Host ""
Write-Success "Destruction complete!"
Write-Host ""
Write-Info "Summary of destroyed resources:"
Write-Host "  ✓ Cloud Run services"
Write-Host "  ✓ Compute Engine VM and disks"
Write-Host "  ✓ Firestore database"
Write-Host "  ✓ Service accounts and secrets"
Write-Host "  ✓ Artifact Registry"
Write-Host ""

Write-Warn "Manual cleanup may be required:"
Write-Host ""
Write-Info "Check GCP Console for remaining resources:"
Write-Host "  - Static IP addresses"
Write-Host "  - Firewall rules"
Write-Host "  - Any orphaned disks"
Write-Host ""

if (-not $destroyStateBucket) {
    Write-Warn "State bucket still exists (for recovery): gs://$tfStateBucket"
    Write-Host "  To clean up completely, run:"
    Write-Host "  gsutil -m rm -r gs://$tfStateBucket/*"
    Write-Host "  gcloud storage buckets delete gs://$tfStateBucket"
}

Write-Host ""
Write-Success "Infrastructure destruction finished successfully!"
