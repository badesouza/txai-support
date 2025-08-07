# 🚀 Deploy TXAI Support no Hostinger

## 📋 Pré-requisitos

- Conta no Hostinger com plano que suporte Node.js
- Acesso SSH ao servidor
- IP do servidor: 31.97.170.240
- Git instalado localmente

## 🔧 Passo a Passo Completo

### 1. Preparação do Projeto Local

```bash
# Clone o repositório (se ainda não tiver)
git clone <seu-repositorio>
cd txai-support

# Instale as dependências
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configuração dos Arquivos de Ambiente

#### Backend (.env.production)

```bash
# Crie o arquivo backend/.env.production
NODE_ENV=production
PORT=3001
DATABASE_URL=mysql://txai:Acaraje123@localhost:3306/txai_support
JWT_SECRET=sua_chave_jwt_super_secreta_producao
CORS_ORIGIN=http://31.97.170.240
UPLOAD_PATH=./uploads
```

#### Frontend (.env.production)

```bash
# Crie o arquivo frontend/.env.production
REACT_APP_API_URL=http://31.97.170.240/api
REACT_APP_ENV=production
```

### 3. Build do Frontend

```bash
cd frontend
npm run build
```

### 4. Upload para o Hostinger

#### Opção A: Via File Manager (mais fácil)

1. Acesse o painel do Hostinger
2. Vá em "File Manager"
3. Navegue até a pasta `public_html`
4. Faça upload dos arquivos:
   - Pasta `backend/` completa
   - Pasta `frontend/build/` (renomeie para `public_html`)

#### Opção B: Via SSH (recomendado)

```bash
# Conecte via SSH
ssh u123456789@31.97.170.240

# Navegue para o diretório do projeto
cd public_html

# Clone o repositório
git clone <seu-repositorio> txai-support
cd txai-support
```

### 5. Configuração do Backend no Hostinger

#### Instalar Dependências

```bash
cd backend
npm install
```

#### Configurar Banco de Dados MySQL

```bash
# Acessar MySQL (no Hostinger geralmente já está disponível)
mysql -u root -p

# Criar banco de dados e usuário
CREATE DATABASE txai_support CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'txai'@'localhost' IDENTIFIED BY 'Acaraje123';
GRANT ALL PRIVILEGES ON txai_support.* TO 'txai'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Executar migrações
npx prisma migrate deploy
npx prisma generate
```

#### Configurar PM2 para Process Management

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Criar arquivo ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'txai-backend',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

# Build do projeto
npm run build

# Iniciar com PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 6. Configuração do Nginx (Proxy Reverso)

#### Criar arquivo de configuração do Nginx

```bash
# No servidor, criar arquivo de configuração
sudo nano /etc/nginx/sites-available/txai-support
```

```nginx
server {
    listen 80;
    server_name 31.97.170.240;

    # Frontend (React)
    location / {
        root /home/u123456789/public_html/txai-support/frontend/build;
        try_files $uri $uri/ /index.html;

        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads/ {
        alias /home/u123456789/public_html/txai-support/backend/uploads/;
        expires 1d;
        add_header Cache-Control "public";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}
```

#### Ativar a configuração

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/txai-support /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 7. Configuração de SSL (HTTPS) - Opcional

#### Via Let's Encrypt (gratuito) - apenas se tiver domínio

```bash
# Instalar Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL (substitua pelo seu domínio quando tiver)
# sudo certbot --nginx -d seudominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. Configuração de Firewall

```bash
# Permitir apenas portas necessárias
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS (se usar SSL)
sudo ufw enable
```

### 9. Monitoramento e Logs

#### Configurar logs do PM2

```bash
# Ver logs em tempo real
pm2 logs txai-backend

# Ver status dos processos
pm2 status

# Monitorar recursos
pm2 monit
```

#### Configurar logs do Nginx

```bash
# Ver logs de acesso
sudo tail -f /var/log/nginx/access.log

# Ver logs de erro
sudo tail -f /var/log/nginx/error.log
```

### 10. Scripts de Deploy Automatizado

#### Criar script de deploy

```bash
# Criar arquivo deploy.sh
cat > deploy.sh << 'EOF'
#!/bin/bash

echo "🚀 Iniciando deploy do TXAI Support..."

# Parar aplicação
pm2 stop txai-backend

# Pull das mudanças
git pull origin main

# Instalar dependências do backend
cd backend
npm install
npm run build

# Instalar dependências do frontend
cd ../frontend
npm install
npm run build

# Reiniciar aplicação
cd ../backend
pm2 start ecosystem.config.js --env production

echo "✅ Deploy concluído!"
echo "📊 Status da aplicação:"
pm2 status
EOF

# Tornar executável
chmod +x deploy.sh
```

### 11. Configuração de Backup

#### Script de backup automático

```bash
# Criar script de backup
cat > backup.sh << 'EOF'
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/u123456789/backups"

mkdir -p $BACKUP_DIR

# Backup do banco de dados MySQL
mysqldump -u txai -pAcaraje123 txai_support > $BACKUP_DIR/db_backup_$DATE.sql

# Backup dos uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz backend/uploads/

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup criado: $DATE"
EOF

# Configurar cron para backup diário
crontab -e
# Adicionar: 0 2 * * * /home/u123456789/txai-support/backup.sh
```

## 🔍 Verificação Final

### Testar a aplicação

1. Acesse `http://31.97.170.240`
2. Teste o login
3. Teste criação de chamados
4. Teste upload de imagens
5. Verifique logs em caso de erro

### Comandos úteis para manutenção

```bash
# Reiniciar aplicação
pm2 restart txai-backend

# Ver logs em tempo real
pm2 logs txai-backend --lines 100

# Ver status do sistema
htop
df -h
free -h

# Verificar portas em uso
netstat -tlnp
```

## 🚨 Troubleshooting

### Problemas comuns e soluções

1. **Erro 502 Bad Gateway**

   - Verificar se o backend está rodando: `pm2 status`
   - Verificar logs: `pm2 logs txai-backend`

2. **Erro de CORS**

   - Verificar se `CORS_ORIGIN` está configurado corretamente
   - Verificar se o proxy do Nginx está funcionando

3. **Erro de banco de dados MySQL**

   - Verificar se o MySQL está rodando: `sudo systemctl status mysql`
   - Verificar se as migrações foram executadas
   - Verificar conexão: `mysql -u txai -p txai_support`

4. **Arquivos não carregam**
   - Verificar permissões da pasta uploads
   - Verificar configuração do Nginx para uploads

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `pm2 logs txai-backend`
2. Verifique o status: `pm2 status`
3. Teste a API diretamente: `curl http://localhost:3001/api/health`
4. Verifique configuração do Nginx: `sudo nginx -t`
