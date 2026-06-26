# =============================================================================
# Development Startup Script (Windows PowerShell)
# =============================================================================
# This script:
# 1. Checks Docker is running
# 2. Checks and creates .env.local files if needed
# 3. Starts Docker services in detached mode
# 4. Provides instructions to start backend and frontend manually
# =============================================================================

$ErrorActionPreference = "Continue"

# Get script directory and repo root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path

# Function to check if Docker is ready
function Test-DockerReady {
    $ErrorActionPreference = "SilentlyContinue"
    try {
        $result = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
        # Also check if error is about connection (Docker not ready yet)
        $errorText = $result | Out-String
        if ($errorText -match "Cannot connect to the Docker daemon" -or 
            $errorText -match "dockerDesktopLinuxEngine" -or
            $errorText -match "pipe") {
            return $false
        }
        # Other errors might still mean Docker is available
        return $false
    }
    catch {
        return $false
    }
}

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  TXAI Support - Dev Mode Startup" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# =============================================================================
# Step 0: Check Docker is ready
# =============================================================================
Write-Host "Verificando Docker..." -ForegroundColor Cyan

$dockerReady = Test-DockerReady

if (-not $dockerReady) {
    Write-Host "⏳ Docker nao esta pronto, aguardando Docker Desktop iniciar..." -ForegroundColor Yellow
    
    $maxAttempts = 30
    $attempt = 0
    while ($attempt -lt $maxAttempts -and -not $dockerReady) {
        Start-Sleep -Seconds 2
        $dockerReady = Test-DockerReady
        $attempt++
        if ($attempt % 5 -eq 0) {
            Write-Host "  Ainda aguardando... ($attempt/$maxAttempts)" -ForegroundColor Gray
        }
    }
    
    if (-not $dockerReady) {
        Write-Host ""
        Write-Host "❌ Docker nao esta disponivel!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Por favor, certifique-se de que o Docker Desktop esta rodando." -ForegroundColor Yellow
        Write-Host "Aguarde alguns segundos e tente novamente." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}

Write-Host "✅ Docker esta pronto" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 2: Check and create .env.local files
# =============================================================================
Write-Host "Verificando arquivos de configuracao..." -ForegroundColor Cyan
Write-Host ""

# Check root .env.local
$rootEnvLocal = Join-Path $RepoRoot ".env.local"
if (-not (Test-Path $rootEnvLocal)) {
    Write-Host "⚠️  Root .env.local nao encontrado" -ForegroundColor Yellow
    $rootEnvExample = Join-Path $RepoRoot ".env.local.example"
    if (Test-Path $rootEnvExample) {
        Write-Host "   Criando a partir do template..." -ForegroundColor Cyan
        Copy-Item $rootEnvExample $rootEnvLocal
        Write-Host "✅ Root .env.local criado" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Template .env.local.example nao encontrado" -ForegroundColor Yellow
    }
}
else {
    Write-Host "✅ Root .env.local encontrado" -ForegroundColor Green
}

# Check backend .env.local
$backendEnvLocal = Join-Path $RepoRoot "backend\.env.local"
if (-not (Test-Path $backendEnvLocal)) {
    Write-Host "⚠️  Backend .env.local nao encontrado" -ForegroundColor Yellow
    $backendEnvExample = Join-Path $RepoRoot "backend\.env.local.example"
    if (Test-Path $backendEnvExample) {
        Write-Host "   Criando a partir do template..." -ForegroundColor Cyan
        Copy-Item $backendEnvExample $backendEnvLocal
        Write-Host "✅ Backend .env.local criado" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Template backend\.env.local.example nao encontrado" -ForegroundColor Yellow
    }
}
else {
    Write-Host "✅ Backend .env.local encontrado" -ForegroundColor Green
}

# Check frontend .env.local
$frontendEnvLocal = Join-Path $RepoRoot "frontend\.env.local"
if (-not (Test-Path $frontendEnvLocal)) {
    Write-Host "⚠️  Frontend .env.local nao encontrado" -ForegroundColor Yellow
    $frontendEnvExample = Join-Path $RepoRoot "frontend\.env.local.example"
    if (Test-Path $frontendEnvExample) {
        Write-Host "   Criando a partir do template..." -ForegroundColor Cyan
        Copy-Item $frontendEnvExample $frontendEnvLocal
        Write-Host "✅ Frontend .env.local criado" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Template frontend\.env.local.example nao encontrado" -ForegroundColor Yellow
    }
}
else {
    Write-Host "✅ Frontend .env.local encontrado" -ForegroundColor Green
}

Write-Host ""

# =============================================================================
# Step 3: Start Docker services
# =============================================================================
Write-Host "Iniciando servicos Docker..." -ForegroundColor Cyan

Set-Location $RepoRoot

# Stop any existing services first (ignore errors)
$ErrorActionPreference = "SilentlyContinue"
try {
    $null = docker compose -f "docker-compose.dev.yml" ps -q 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Parando servicos existentes..." -ForegroundColor Yellow
        $null = docker compose -f "docker-compose.dev.yml" down 2>&1
        Start-Sleep -Seconds 2
    }
}
catch {
    # Ignore errors when stopping services
}

$ErrorActionPreference = "Continue"

# Verify Docker is still ready before starting
Write-Host "  Verificando Docker novamente antes de iniciar..." -ForegroundColor Cyan
if (-not (Test-DockerReady)) {
    Write-Host ""
    Write-Host "❌ Docker nao esta mais disponivel. Por favor, verifique o Docker Desktop." -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Start services in detached mode
Write-Host "  Iniciando servicos em modo detached..." -ForegroundColor Cyan

docker compose -f "docker-compose.dev.yml" up -d
$dockerExitCode = $LASTEXITCODE

if ($dockerExitCode -eq 0) {
    Write-Host "✅ Servicos Docker iniciados" -ForegroundColor Green
    Write-Host ""
    
    # Wait a bit for services to start
    Write-Host "Aguardando servicos iniciarem..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Write-Host "✅ Ambiente de desenvolvimento configurado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para iniciar o backend e frontend, execute em terminais separados:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Terminal 1 - Backend:" -ForegroundColor Yellow
    Write-Host "    cd backend" -ForegroundColor White
    Write-Host "    npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "  Terminal 2 - Frontend:" -ForegroundColor Yellow
    Write-Host "    cd frontend" -ForegroundColor White
    Write-Host "    npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "URLs de acesso:" -ForegroundColor Cyan
    Write-Host "   Frontend:     http://localhost:3000" -ForegroundColor Green
    Write-Host "   Backend API:  http://localhost:3001/api" -ForegroundColor Green
    Write-Host "   Swagger:      http://localhost:3001/api-docs" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para ver logs dos servicos Docker:" -ForegroundColor Cyan
    Write-Host "   npm run dev:services:logs" -ForegroundColor White
    Write-Host ""
    Write-Host "Para parar os servicos Docker:" -ForegroundColor Cyan
    Write-Host "   npm run dev:services:stop" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "❌ Erro ao iniciar servicos Docker" -ForegroundColor Red
    Write-Host ""
    exit 1
}

