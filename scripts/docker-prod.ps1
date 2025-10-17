# Script para produção com Docker
# Execute no PowerShell

Write-Host "🚀 Iniciando ambiente de produção Docker..." -ForegroundColor Green

# Verificar se Docker está rodando
try {
    docker version | Out-Null
    Write-Host "✅ Docker está rodando" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não está rodando. Inicie o Docker Desktop primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host "⚠️ Arquivo .env não encontrado. Copiando do exemplo..." -ForegroundColor Yellow
    Copy-Item "env.docker.example" ".env"
    Write-Host "📝 Edite o arquivo .env com suas configurações antes de continuar!" -ForegroundColor Red
    exit 1
}

# Parar containers existentes
Write-Host "🛑 Parando containers existentes..." -ForegroundColor Yellow
docker-compose down

# Remover imagens antigas (opcional)
$removeImages = Read-Host "Deseja remover imagens antigas? (y/N)"
if ($removeImages -eq "y" -or $removeImages -eq "Y") {
    Write-Host "🗑️ Removendo imagens antigas..." -ForegroundColor Yellow
    docker-compose down --rmi all
}

# Construir e iniciar containers
Write-Host "🔨 Construindo e iniciando containers..." -ForegroundColor Blue
docker-compose up --build -d

# Verificar status
Write-Host "📊 Verificando status dos containers..." -ForegroundColor Cyan
docker-compose ps

# Aguardar containers estarem prontos
Write-Host "⏳ Aguardando containers estarem prontos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar health checks
Write-Host "🏥 Verificando health checks..." -ForegroundColor Cyan
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

Write-Host "🎉 Ambiente de produção iniciado!" -ForegroundColor Green
Write-Host "🌐 Aplicação: http://localhost" -ForegroundColor Cyan
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3001" -ForegroundColor Cyan

Write-Host "`n📋 Comandos úteis:" -ForegroundColor Yellow
Write-Host "  Ver logs: docker-compose logs -f" -ForegroundColor White
Write-Host "  Parar: docker-compose down" -ForegroundColor White
Write-Host "  Rebuild: docker-compose up --build" -ForegroundColor White
Write-Host "  Backup DB: docker-compose exec postgres pg_dump -U txai_user txai_support > backup.sql" -ForegroundColor White
