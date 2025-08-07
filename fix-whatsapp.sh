#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Corrigindo problemas do WhatsApp no servidor...${NC}"

# Verificar se estamos no diretório correto
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
    exit 1
fi

cd backend

# 1. Instalar dependências necessárias para o Chrome
echo -e "${YELLOW}📦 Instalando dependências do Chrome...${NC}"
sudo apt update
sudo apt install -y chromium-browser chromium-chromedriver

# 2. Verificar se o Chrome foi instalado
if ! command -v chromium-browser &> /dev/null; then
    echo -e "${RED}❌ Chrome não foi instalado corretamente${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Chrome instalado: $(which chromium-browser)${NC}"

# 3. Criar diretórios necessários
echo -e "${YELLOW}📁 Criando diretórios necessários...${NC}"
mkdir -p whatsapp-sessions
mkdir -p tokens
chmod 755 whatsapp-sessions
chmod 755 tokens

# 4. Verificar permissões
echo -e "${YELLOW}🔐 Verificando permissões...${NC}"
ls -la whatsapp-sessions/
ls -la tokens/

# 5. Configurar variável de ambiente para o Chrome
echo -e "${YELLOW}⚙️ Configurando variável de ambiente...${NC}"
export CHROME_PATH=$(which chromium-browser)
echo "CHROME_PATH=$CHROME_PATH"

# 6. Verificar se a variável está no .env.production
if [ -f ".env.production" ]; then
    if ! grep -q "CHROME_PATH" .env.production; then
        echo -e "${YELLOW}📝 Adicionando CHROME_PATH ao .env.production...${NC}"
        echo "CHROME_PATH=$CHROME_PATH" >> .env.production
    fi
else
    echo -e "${YELLOW}⚠️ Arquivo .env.production não encontrado${NC}"
    echo -e "${BLUE}📝 Adicione manualmente: CHROME_PATH=$CHROME_PATH${NC}"
fi

# 7. Reiniciar o backend
echo -e "${YELLOW}🔄 Reiniciando backend...${NC}"
pm2 restart txai-backend

# 8. Verificar status
echo -e "${YELLOW}📊 Verificando status...${NC}"
sleep 3
pm2 status

# 9. Testar API do WhatsApp
echo -e "${YELLOW}🧪 Testando API do WhatsApp...${NC}"
sleep 5
curl -s http://localhost:3001/api/whatsapp/status | jq . || echo "API não respondeu"

echo -e "${GREEN}✅ Configuração do WhatsApp concluída!${NC}"
echo -e "${BLUE}💡 Agora tente conectar o WhatsApp novamente${NC}"
echo -e "${BLUE}📱 Acesse: http://31.97.170.240/whatsapp${NC}" 