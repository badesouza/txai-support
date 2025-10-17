// Script para executar testes do backend
Write-Host "🧪 Executando testes do backend..." -ForegroundColor Cyan

$ErrorActionPreference = 'Stop'

# Verificar se estamos no diretório correto
if (-not (Test-Path "backend/package.json")) {
    Write-Host "❌ Erro: Execute este script a partir do diretório raiz do projeto" -ForegroundColor Red
    exit 1
}

# Instalar dependências de forma determinística
Write-Host "📦 Verificando dependências..." -ForegroundColor Yellow
npm --prefix backend ci

# Executar testes unitários
Write-Host "🔬 Executando testes unitários..." -ForegroundColor Green
npm --prefix backend run test

# Executar testes de integração
Write-Host "🔗 Executando testes de integração..." -ForegroundColor Green
npm --prefix backend run test:integration

# Gerar relatório de cobertura
Write-Host "📊 Gerando relatório de cobertura..." -ForegroundColor Green
npm --prefix backend run test:coverage

Write-Host "✅ Testes do backend concluídos!" -ForegroundColor Green
