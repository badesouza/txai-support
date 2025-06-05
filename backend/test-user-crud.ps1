# Configurações
$API_URL = "http://localhost:3001/api"
$EMAIL = "teste@exemplo.com"
$PASSWORD = "senha123"

Write-Host "🚀 Iniciando testes do CRUD de usuários..." -ForegroundColor Green

# 1. Registrar usuário
Write-Host "`n1. Registrando usuário..." -ForegroundColor Green
$registerBody = @{
    email = $EMAIL
    name = "Usuário Teste"
    phone = "11999999999"
    password = $PASSWORD
    profile = "requester"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri "$API_URL/users/register" -Method Post -Body $registerBody -ContentType "application/json"
Write-Host "Resposta: $($registerResponse | ConvertTo-Json)"

# 2. Login
Write-Host "`n2. Fazendo login..." -ForegroundColor Green
$loginBody = @{
    email = $EMAIL
    password = $PASSWORD
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$API_URL/users/login" -Method Post -Body $loginBody -ContentType "application/json"
Write-Host "Resposta: $($loginResponse | ConvertTo-Json)"

# Extrair token
$TOKEN = $loginResponse.token

if (-not $TOKEN) {
    Write-Host "Erro: Não foi possível obter o token" -ForegroundColor Red
    exit 1
}

# 3. Ver perfil
Write-Host "`n3. Obtendo perfil..." -ForegroundColor Green
$profileResponse = Invoke-RestMethod -Uri "$API_URL/users/profile" -Method Get -Headers @{
    "Authorization" = "Bearer $TOKEN"
}
Write-Host "Resposta: $($profileResponse | ConvertTo-Json)"

# 4. Atualizar perfil
Write-Host "`n4. Atualizando perfil..." -ForegroundColor Green
$updateBody = @{
    name = "Nome Atualizado"
    phone = "11988888888"
} | ConvertTo-Json

$updateResponse = Invoke-RestMethod -Uri "$API_URL/users/profile" -Method Put -Headers @{
    "Authorization" = "Bearer $TOKEN"
} -Body $updateBody -ContentType "application/json"
Write-Host "Resposta: $($updateResponse | ConvertTo-Json)"

# 5. Atualizar senha
Write-Host "`n5. Atualizando senha..." -ForegroundColor Green
$passwordBody = @{
    currentPassword = $PASSWORD
    newPassword = "novaSenha123"
} | ConvertTo-Json

$passwordResponse = Invoke-RestMethod -Uri "$API_URL/users/password" -Method Put -Headers @{
    "Authorization" = "Bearer $TOKEN"
} -Body $passwordBody -ContentType "application/json"
Write-Host "Resposta: $($passwordResponse | ConvertTo-Json)"

Write-Host "`n✅ Testes concluídos!" -ForegroundColor Green 