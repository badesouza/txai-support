#!/bin/bash

# Configurações
API_URL="http://localhost:3000"
EMAIL="teste@exemplo.com"
PASSWORD="senha123"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Iniciando testes do CRUD de usuários..."

# 1. Registrar usuário
echo -e "\n${GREEN}1. Registrando usuário...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/users/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"name\": \"Usuário Teste\",
    \"phone\": \"11999999999\",
    \"password\": \"$PASSWORD\",
    \"profile\": \"requester\"
  }")
echo "Resposta: $REGISTER_RESPONSE"

# 2. Login
echo -e "\n${GREEN}2. Fazendo login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/users/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")
echo "Resposta: $LOGIN_RESPONSE"

# Extrair token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Erro: Não foi possível obter o token${NC}"
  exit 1
fi

# 3. Ver perfil
echo -e "\n${GREEN}3. Obtendo perfil...${NC}"
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/users/profile" \
  -H "Authorization: Bearer $TOKEN")
echo "Resposta: $PROFILE_RESPONSE"

# 4. Atualizar perfil
echo -e "\n${GREEN}4. Atualizando perfil...${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/users/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nome Atualizado",
    "phone": "11988888888"
  }')
echo "Resposta: $UPDATE_RESPONSE"

# 5. Atualizar senha
echo -e "\n${GREEN}5. Atualizando senha...${NC}"
PASSWORD_RESPONSE=$(curl -s -X PUT "$API_URL/users/password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"currentPassword\": \"$PASSWORD\",
    \"newPassword\": \"novaSenha123\"
  }")
echo "Resposta: $PASSWORD_RESPONSE"

echo -e "\n${GREEN}✅ Testes concluídos!${NC}" 