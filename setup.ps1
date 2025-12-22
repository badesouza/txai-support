# TXAI Support - Automated Setup Script (PowerShell)
# This script will set up and run the entire application with Docker

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🚀 TXAI Support - Automated Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✓ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Visit: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Yellow
    exit 1
}

function Get-ComposeCommand {
    try {
        docker compose version | Out-Null
        return @("docker", "compose")
    } catch {
        try {
            docker-compose --version | Out-Null
            return @("docker-compose")
        } catch {
            Write-Host "❌ Docker Compose não encontrado. Instale o Docker Desktop (recomendado)." -ForegroundColor Red
            exit 1
        }
    }
}

$ComposeCmd = Get-ComposeCommand
Write-Host ("✓ Docker Compose disponível: " + ($ComposeCmd -join " ")) -ForegroundColor Green

Write-Host ""

# Check if Docker daemon is running
try {
    docker info | Out-Null
    Write-Host "✓ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker daemon is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host ""

Write-Host "📝 Setting up environment file (.env)..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
@"
# Local Docker Compose defaults (safe for local dev only)
POSTGRES_USER=txai
POSTGRES_PASSWORD=txai123
POSTGRES_DB=txai_support

# Backend
JWT_SECRET=your-super-secret-jwt-key

# Optional: override API URL baked into the frontend image build
# REACT_APP_API_URL=http://localhost:3001/api
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✓ Created .env (repo root)" -ForegroundColor Green
} else {
    Write-Host "✓ .env already exists (repo root)" -ForegroundColor Green
}

Write-Host ""

# Stop and remove existing containers
Write-Host "🛑 Stopping any existing containers..." -ForegroundColor Yellow
& $ComposeCmd down --remove-orphans 2>$null
Write-Host ""

# Build and start containers
Write-Host "🏗️  Building and starting containers..." -ForegroundColor Yellow
& $ComposeCmd up -d --build
Write-Host ""

Write-Host "⏳ Waiting for Backend healthcheck..." -ForegroundColor Yellow
$MaxSeconds = 300
$Start = Get-Date
while ($true) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 3
        if ($resp.StatusCode -eq 200) { break }
    } catch {
        # ignore
    }

    if (((Get-Date) - $Start).TotalSeconds -ge $MaxSeconds) {
        Write-Host "❌ Backend did not become healthy within $MaxSeconds seconds." -ForegroundColor Red
        Write-Host "Check logs:" -ForegroundColor Yellow
        Write-Host ("  " + ($ComposeCmd -join " ") + " logs -f backend")
        exit 1
    }
    Start-Sleep -Seconds 5
}
Write-Host "✓ Backend is healthy" -ForegroundColor Green
Write-Host ""

# Check container status
Write-Host "📊 Checking container status..." -ForegroundColor Yellow
& $ComposeCmd ps
Write-Host ""

# Display success message
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Your TXAI Support application is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access the application at:" -ForegroundColor Yellow
Write-Host "   Frontend: " -NoNewline; Write-Host "http://localhost:8080" -ForegroundColor Green
Write-Host "   Backend API: " -NoNewline; Write-Host "http://localhost:3001/api" -ForegroundColor Green
Write-Host ""
Write-Host "🔑 Default Admin Credentials:" -ForegroundColor Yellow
Write-Host "   Email: " -NoNewline; Write-Host "admin@txai.com" -ForegroundColor Green
Write-Host "   Password: " -NoNewline; Write-Host "admin123" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Useful commands:" -ForegroundColor Yellow
Write-Host ("   View logs: " + ($ComposeCmd -join " ") + " logs -f")
Write-Host ("   Stop: " + ($ComposeCmd -join " ") + " down")
Write-Host ("   Restart: " + ($ComposeCmd -join " ") + " restart")
Write-Host "   Access database: docker exec -it txai-postgres psql -U txai -d txai_support"
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
