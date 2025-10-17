# Script para desenvolvimento com Docker
# Execute no PowerShell

Write-Host "🚀 Iniciando ambiente de desenvolvimento Docker..." -ForegroundColor Green

# Verificar se Docker está rodando
try {
    docker version | Out-Null
    Write-Host "✅ Docker está rodando" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker não está rodando. Inicie o Docker Desktop primeiro." -ForegroundColor Red
    exit 1
}

# Parar containers existentes
Write-Host "🛑 Parando containers existentes..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml down

# Remover volumes antigos (opcional)
$removeVolumes = Read-Host "Deseja remover volumes antigos? (y/N)"
if ($removeVolumes -eq "y" -or $removeVolumes -eq "Y") {
    Write-Host "🗑️ Removendo volumes antigos..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml down -v
}

# Construir e iniciar containers
Write-Host "🔨 Construindo e iniciando containers..." -ForegroundColor Blue
docker-compose -f docker-compose.dev.yml up --build -d

# Verificar status
Write-Host "📊 Verificando status dos containers..." -ForegroundColor Cyan
docker-compose -f docker-compose.dev.yml ps

Write-Host "🎉 Ambiente de desenvolvimento iniciado!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🗄️ PostgreSQL: localhost:5433" -ForegroundColor Cyan

Write-Host "`n📋 Comandos úteis:" -ForegroundColor Yellow
Write-Host "  Ver logs: docker-compose -f docker-compose.dev.yml logs -f" -ForegroundColor White
Write-Host "  Parar: docker-compose -f docker-compose.dev.yml down" -ForegroundColor White
Write-Host "  Rebuild: docker-compose -f docker-compose.dev.yml up --build" -ForegroundColor White
