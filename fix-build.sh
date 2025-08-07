#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Corrigindo problemas de build...${NC}"

# Verificar se estamos no diretório correto
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
    exit 1
fi

cd backend

# Limpar node_modules e package-lock.json
echo -e "${YELLOW}🧹 Limpando dependências antigas...${NC}"
rm -rf node_modules package-lock.json

# Instalar todas as dependências (incluindo devDependencies)
echo -e "${YELLOW}📦 Instalando todas as dependências...${NC}"
npm install

# Verificar se TypeScript está instalado
if ! npm list typescript; then
    echo -e "${YELLOW}📦 Instalando TypeScript...${NC}"
    npm install --save-dev typescript
fi

# Verificar se os tipos estão instalados
echo -e "${YELLOW}📦 Verificando tipos TypeScript...${NC}"
npm install --save-dev @types/express @types/node @types/cors @types/bcrypt @types/jsonwebtoken @types/multer

# Gerar Prisma client
echo -e "${YELLOW}🔨 Gerando Prisma client...${NC}"
npx prisma generate

# Build do projeto
echo -e "${YELLOW}🔨 Build do projeto...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"
    echo -e "${BLUE}📊 Status do build:${NC}"
    ls -la dist/
else
    echo -e "${RED}❌ Erro no build. Verifique os logs acima.${NC}"
    exit 1
fi

cd ..

echo -e "${GREEN}🎉 Problemas de build resolvidos!${NC}"
echo -e "${BLUE}💡 Agora você pode executar: cd backend && pm2 start ecosystem.config.js --env production${NC}" 