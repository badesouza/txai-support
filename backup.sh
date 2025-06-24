#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/u123456789/backups"
PROJECT_DIR="/home/u123456789/public_html/txai-support"

echo -e "${BLUE}💾 Iniciando backup do TXAI Support...${NC}"

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Backup do banco de dados MySQL
echo -e "${YELLOW}📊 Fazendo backup do banco de dados MySQL...${NC}"
if mysqldump -u txai -pAcaraje123 txai_support > $BACKUP_DIR/db_backup_$DATE.sql; then
    echo -e "${GREEN}✅ Backup do banco de dados criado: db_backup_$DATE.sql${NC}"
else
    echo -e "${RED}❌ Erro ao fazer backup do banco de dados${NC}"
    exit 1
fi

# Backup dos uploads
echo -e "${YELLOW}📁 Fazendo backup dos uploads...${NC}"
if tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz -C $PROJECT_DIR/backend uploads/; then
    echo -e "${GREEN}✅ Backup dos uploads criado: uploads_backup_$DATE.tar.gz${NC}"
else
    echo -e "${RED}❌ Erro ao fazer backup dos uploads${NC}"
fi

# Backup da configuração
echo -e "${YELLOW}⚙️ Fazendo backup da configuração...${NC}"
if tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz -C $PROJECT_DIR/backend .env.production ecosystem.config.js; then
    echo -e "${GREEN}✅ Backup da configuração criado: config_backup_$DATE.tar.gz${NC}"
else
    echo -e "${RED}❌ Erro ao fazer backup da configuração${NC}"
fi

# Limpar backups antigos (manter apenas os últimos 7 dias)
echo -e "${YELLOW}🧹 Limpando backups antigos...${NC}"
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

# Mostrar tamanho dos backups
echo -e "${BLUE}📈 Tamanho dos backups:${NC}"
du -h $BACKUP_DIR/*$DATE*

# Mostrar espaço em disco
echo -e "${BLUE}💽 Espaço em disco:${NC}"
df -h $BACKUP_DIR

echo -e "${GREEN}🎉 Backup concluído com sucesso!${NC}"
echo -e "${BLUE}📅 Data: $DATE${NC}" 