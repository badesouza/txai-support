# =============================================================================
# Development Startup Script (Windows PowerShell)
# =============================================================================
# This script:
# 1. Kills processes on required ports (3000, 3001, Docker services)
# 2. Checks and displays .env.local files
# 3. Spawns 3 terminal windows with default system shell
# =============================================================================

$ErrorActionPreference = "Stop"

# Get script directory and repo root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  TXAI Support - Dev Mode Startup" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# =============================================================================
# Step 1: Kill processes on required ports
# =============================================================================
Write-Host "Freeing required ports..." -ForegroundColor Cyan

# Kill processes on port 3000 (frontend)
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "  Killing process on port 3000..." -ForegroundColor Yellow
    $port3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
}

# Kill processes on port 3001 (backend)
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "  Killing process on port 3001..." -ForegroundColor Yellow
    $port3001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
}

# Stop Docker services
try {
    Push-Location $RepoRoot
    $dockerCompose = docker compose -f "docker-compose.dev.yml" ps -q 2>$null
    if ($dockerCompose) {
        Write-Host "  Stopping Docker services..." -ForegroundColor Yellow
        docker compose -f "docker-compose.dev.yml" down 2>$null | Out-Null
        Start-Sleep -Seconds 1
    }
} finally {
    Pop-Location
}

Write-Host "✅ Ports freed" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 2: Check .env.local files and requirements
# =============================================================================
Write-Host "Checking environment configuration..." -ForegroundColor Cyan
Write-Host ""

$MissingFiles = @()

# Check root .env.local
$rootEnvLocal = Join-Path $RepoRoot ".env.local"
if (-not (Test-Path $rootEnvLocal)) {
    $MissingFiles += "Root .env.local"
    Write-Host "⚠️  Root .env.local not found" -ForegroundColor Yellow
    $rootEnvExample = Join-Path $RepoRoot ".env.local.example"
    if (Test-Path $rootEnvExample) {
        Write-Host "   Creating from template..." -ForegroundColor Cyan
        Copy-Item $rootEnvExample $rootEnvLocal
    }
} else {
    Write-Host "✅ Root .env.local found" -ForegroundColor Green
}

Write-Host "   Contents:" -ForegroundColor Cyan
if (Test-Path $rootEnvLocal) {
    Get-Content $rootEnvLocal | ForEach-Object { Write-Host "   $_" }
} else {
    Write-Host "   File not found" -ForegroundColor Red
}
Write-Host ""

# Check backend .env.local
$backendEnvLocal = Join-Path $RepoRoot "backend\.env.local"
if (-not (Test-Path $backendEnvLocal)) {
    $MissingFiles += "Backend .env.local"
    Write-Host "⚠️  Backend .env.local not found" -ForegroundColor Yellow
    $backendEnvExample = Join-Path $RepoRoot "backend\.env.local.example"
    if (Test-Path $backendEnvExample) {
        Write-Host "   Creating from template..." -ForegroundColor Cyan
        Copy-Item $backendEnvExample $backendEnvLocal
    }
} else {
    Write-Host "✅ Backend .env.local found" -ForegroundColor Green
}

Write-Host "   Contents:" -ForegroundColor Cyan
if (Test-Path $backendEnvLocal) {
    Get-Content $backendEnvLocal | ForEach-Object { Write-Host "   $_" }
} else {
    Write-Host "   File not found" -ForegroundColor Red
}
Write-Host ""

# Check frontend .env.local
$frontendEnvLocal = Join-Path $RepoRoot "frontend\.env.local"
if (-not (Test-Path $frontendEnvLocal)) {
    $MissingFiles += "Frontend .env.local"
    Write-Host "⚠️  Frontend .env.local not found" -ForegroundColor Yellow
    $frontendEnvExample = Join-Path $RepoRoot "frontend\.env.local.example"
    if (Test-Path $frontendEnvExample) {
        Write-Host "   Creating from template..." -ForegroundColor Cyan
        Copy-Item $frontendEnvExample $frontendEnvLocal
    }
} else {
    Write-Host "✅ Frontend .env.local found" -ForegroundColor Green
}

Write-Host "   Contents:" -ForegroundColor Cyan
if (Test-Path $frontendEnvLocal) {
    Get-Content $frontendEnvLocal | ForEach-Object { Write-Host "   $_" }
} else {
    Write-Host "   File not found" -ForegroundColor Red
}
Write-Host ""

# Check Docker
try {
    docker info 2>$null | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host ""

# =============================================================================
# Step 3: Spawn terminals with default system shell
# =============================================================================
Write-Host "Spawning development terminals..." -ForegroundColor Cyan
Write-Host ""

# Windows - use Start-Process to open new PowerShell windows
# Terminal 1: Docker Services
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot'; npm run dev:services" -WindowStyle Normal

Start-Sleep -Seconds 1

# Terminal 2: Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\backend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 1

# Terminal 3: Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\frontend'; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "✅ All terminals spawned successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Terminal windows opened:" -ForegroundColor Cyan
Write-Host "   1. Docker Services (Firebase, WPPConnect, Redis, GCS)" -ForegroundColor Green
Write-Host "   2. Backend (http://localhost:3001)" -ForegroundColor Green
Write-Host "   3. Frontend (http://localhost:3000)" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "   Frontend:     http://localhost:3000" -ForegroundColor Green
Write-Host "   Backend API:  http://localhost:3001/api" -ForegroundColor Green
Write-Host "   Swagger:      http://localhost:3001/api-docs" -ForegroundColor Green
Write-Host "   Firebase UI:  http://localhost:4000" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Admin user is automatically created on backend startup" -ForegroundColor Yellow
Write-Host "   Email: admin@txai.com | Password: admin123" -ForegroundColor Yellow
Write-Host ""

