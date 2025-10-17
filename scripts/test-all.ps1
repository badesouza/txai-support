# Script para executar todos os testes
Write-Host "🧪 Executando todos os testes..." -ForegroundColor Cyan

$startTime = Get-Date

# Executar testes do backend
Write-Host "`n🔧 Testando Backend..." -ForegroundColor Yellow
& .\scripts\test-backend.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Testes do backend falharam!" -ForegroundColor Red
    exit 1
}

# Executar testes do frontend
Write-Host "`n🎨 Testando Frontend..." -ForegroundColor Yellow
& .\scripts\test-frontend.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Testes do frontend falharam!" -ForegroundColor Red
    exit 1
}

# Testes E2E removidos - mantendo apenas testes unitários

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "`n✅ Todos os testes passaram com sucesso!" -ForegroundColor Green
Write-Host "⏱️  Tempo total: $($duration.ToString('mm\:ss'))" -ForegroundColor Cyan
Write-Host "`n📊 Relatórios gerados:" -ForegroundColor Yellow
Write-Host "   - Backend Coverage: backend/coverage/index.html" -ForegroundColor White
Write-Host "   - Frontend Coverage: frontend/coverage/index.html" -ForegroundColor White
