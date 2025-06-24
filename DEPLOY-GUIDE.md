# 🚀 Guia Rápido de Deploy - TXAI Support

## 📋 Checklist de Deploy no Hostinger

### ✅ Pré-requisitos

- [ ] Conta Hostinger com Node.js
- [ ] Acesso SSH
- [ ] IP do servidor: 31.97.170.240
- [ ] MySQL disponível

### 🔧 Passo a Passo (5 minutos)

#### 1. Upload do Projeto

```bash
# Via SSH (recomendado)
ssh u123456789@31.97.170.240
cd public_html
git clone <seu-repositorio> txai-support
cd txai-support
```

#### 2. Setup Inicial

```bash
# Executar script de setup
./setup.sh
```

#### 3. Configurar Banco MySQL

```bash
# Acessar MySQL
mysql -u root -p

# Criar banco e usuário
CREATE DATABASE txai_support CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'txai'@'localhost' IDENTIFIED BY 'Acaraje123';
GRANT ALL PRIVILEGES ON txai_support.* TO 'txai'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Executar migrações
cd backend
npx prisma migrate deploy
```

#### 4. Configurar Arquivos .env

**Backend (.env.production):**

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=mysql://txai:Acaraje123@localhost:3306/txai_support
JWT_SECRET=sua_chave_jwt_super_secreta_producao
CORS_ORIGIN=http://31.97.170.240
UPLOAD_PATH=./uploads
```

**Frontend (.env.production):**

```env
REACT_APP_API_URL=http://31.97.170.240/api
REACT_APP_ENV=production
```

#### 5. Iniciar Aplicação

```bash
cd backend
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 6. Configurar Nginx

```bash
# Copiar configuração
sudo cp nginx/nginx.conf /etc/nginx/sites-available/txai-support
sudo ln -s /etc/nginx/sites-available/txai-support /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. Configurar SSL

```bash
sudo certbot --nginx -d seudominio.com
```

### 🎉 Pronto! Aplicação Online

Acesse: `http://31.97.170.240`

### 🔄 Para Atualizações Futuras

```bash
./deploy.sh
```

### 📊 Monitoramento

```bash
pm2 status          # Status da aplicação
pm2 logs txai-backend # Ver logs
pm2 monit           # Monitoramento em tempo real
```

### 🚨 Troubleshooting Rápido

| Problema | Solução                         |
| -------- | ------------------------------- |
| Erro 502 | `pm2 restart txai-backend`      |
| CORS     | Verificar `CORS_ORIGIN` no .env |
| MySQL    | `sudo systemctl status mysql`   |
| Nginx    | `sudo nginx -t`                 |

### 📞 Comandos Úteis

```bash
# Health check
curl http://localhost:3001/api/health

# Backup
./backup.sh

# Logs em tempo real
pm2 logs txai-backend --lines 100

# Reiniciar tudo
pm2 restart all
sudo systemctl restart nginx
```

---

**🎯 Dica:** Use `./setup.sh` para configuração inicial e `./deploy.sh` para atualizações!
