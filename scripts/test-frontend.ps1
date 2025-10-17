# Script para executar testes do frontend
Write-Host "🧪 Executando testes do frontend..." -ForegroundColor Cyan

# Verificar se estamos no diretório correto
if (-not (Test-Path "frontend/package.json")) {
    Write-Host "❌ Erro: Execute este script a partir do diretório raiz do projeto" -ForegroundColor Red
    exit 1
}

# Instalar dependências se necessário
Write-Host "📦 Verificando dependências..." -ForegroundColor Yellow
Set-Location frontend
npm install

# Executar testes unitários
Write-Host "🔬 Executando testes unitários..." -ForegroundColor Green
npm run test:ci

# Gerar relatório de cobertura
Write-Host "📊 Gerando relatório de cobertura..." -ForegroundColor Green
npm run test:coverage

Write-Host "✅ Testes do frontend concluídos!" -ForegroundColor Green
Set-Location ..
