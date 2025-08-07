#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando deploy do TXAI Support...${NC}"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
    exit 1
fi

# Parar aplicação
echo -e "${YELLOW}📦 Parando aplicação...${NC}"
pm2 stop txai-backend 2>/dev/null || true

# Pull das mudanças (se for um repositório git)
if [ -d ".git" ]; then
    echo -e "${YELLOW}📥 Atualizando código...${NC}"
    git pull origin main
fi

# Instalar dependências do backend (incluindo devDependencies para build)
echo -e "${YELLOW}📦 Instalando dependências do backend...${NC}"
cd backend
npm install

# Build do backend
echo -e "${YELLOW}🔨 Build do backend...${NC}"
npm run build

# Criar diretório de logs se não existir
mkdir -p logs
mkdir -p uploads

# Voltar para a raiz
cd ..

# Instalar dependências do frontend
echo -e "${YELLOW}📦 Instalando dependências do frontend...${NC}"
cd frontend
npm install

# Build do frontend
echo -e "${YELLOW}🔨 Build do frontend...${NC}"
npm run build

# Voltar para a raiz
cd ..

# Reiniciar aplicação
echo -e "${YELLOW}🔄 Reiniciando aplicação...${NC}"
cd backend
pm2 start ecosystem.config.js --env production

# Verificar status
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo -e "${BLUE}📊 Status da aplicação:${NC}"
pm2 status

# Verificar se a aplicação está rodando
sleep 3
if pm2 list | grep -q "txai-backend.*online"; then
    echo -e "${GREEN}✅ Aplicação iniciada com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao iniciar aplicação. Verifique os logs:${NC}"
    echo -e "${YELLOW}pm2 logs txai-backend${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deploy finalizado com sucesso!${NC}" 