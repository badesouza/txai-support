#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setup inicial do TXAI Support no Hostinger${NC}"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
    exit 1
fi

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não está instalado${NC}"
    exit 1
fi

# Verificar se MySQL está disponível
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠️ MySQL não encontrado. Certifique-se de que está instalado.${NC}"
fi

echo -e "${GREEN}✅ Verificações básicas concluídas${NC}"

# Configurar backend
echo -e "${YELLOW}📦 Configurando backend...${NC}"
cd backend

# Instalar dependências (incluindo devDependencies para build)
npm install

# Criar diretórios necessários
mkdir -p logs uploads whatsapp-sessions

# Verificar se .env.production existe
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️ Arquivo .env.production não encontrado${NC}"
    echo -e "${BLUE}📝 Crie o arquivo .env.production com as seguintes variáveis:${NC}"
    echo "NODE_ENV=production"
    echo "PORT=3001"
    echo "DATABASE_URL=mysql://txai:Acaraje123@localhost:3306/txai_support"
    echo "JWT_SECRET=sua_chave_jwt_super_secreta_producao"
    echo "CORS_ORIGIN=http://31.97.170.240"
    echo "UPLOAD_PATH=./uploads"
else
    echo -e "${GREEN}✅ Arquivo .env.production encontrado${NC}"
fi

# Build do backend
echo -e "${YELLOW}🔨 Build do backend...${NC}"
npm run build

cd ..

# Configurar frontend
echo -e "${YELLOW}📦 Configurando frontend...${NC}"
cd frontend

# Instalar dependências
npm install

# Verificar se .env.production existe
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️ Arquivo .env.production não encontrado${NC}"
    echo -e "${BLUE}📝 Crie o arquivo .env.production com as seguintes variáveis:${NC}"
    echo "REACT_APP_API_URL=http://31.97.170.240/api"
    echo "REACT_APP_ENV=production"
else
    echo -e "${GREEN}✅ Arquivo .env.production encontrado${NC}"
fi

# Build do frontend
echo -e "${YELLOW}🔨 Build do frontend...${NC}"
npm run build

cd ..

# Configurar PM2
echo -e "${YELLOW}⚙️ Configurando PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando PM2...${NC}"
    npm install -g pm2
fi

# Tornar scripts executáveis
chmod +x deploy.sh backup.sh

echo -e "${GREEN}✅ Setup concluído!${NC}"
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo "1. Configure os arquivos .env.production"
echo "2. Configure o banco de dados MySQL:"
echo "   mysql -u root -p"
echo "   CREATE DATABASE txai_support CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE USER 'txai'@'localhost' IDENTIFIED BY 'Acaraje123';"
echo "   GRANT ALL PRIVILEGES ON txai_support.* TO 'txai'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo "3. Execute: cd backend && npx prisma migrate deploy"
echo "4. Execute: cd backend && pm2 start ecosystem.config.js --env production"
echo "5. Configure o Nginx"
echo ""
echo -e "${GREEN}🎉 Para futuras atualizações, use: ./deploy.sh${NC}"
echo -e "${BLUE}🌐 Acesse: http://31.97.170.240${NC}" 