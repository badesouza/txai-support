# 🚀 TXAI Support System

Sistema moderno de suporte a tickets com autenticação de usuários e upload de arquivos.

## ✨ Funcionalidades

- **Gestão de Usuários**
  - Login/Logout
  - Recuperação de senha
  - Gestão de perfil de usuário
- **Gestão de Tickets de Suporte**
  - Criar, ler, atualizar, deletar tickets
  - Upload múltiplo de imagens por ticket
  - Acompanhamento de status dos tickets
- **Autenticação Segura**
  - JWT tokens
  - Middleware de autenticação
- **Sistema de Arquivos**
  - Upload seguro de imagens
  - Validação de tipos de arquivo

## 🛠️ Stack Tecnológica

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Banco de Dados**: MySQL + Prisma ORM
- **Autenticação**: JWT
- **Process Manager**: PM2
- **Proxy Reverso**: Nginx
- **Deploy**: Hostinger (IP: 31.97.170.240)

## 📁 Estrutura do Projeto

```
txai-support/
├── frontend/           # Aplicação React
├── backend/           # API Node.js
├── nginx/            # Configurações do Nginx
├── deploy.sh         # Script de deploy automatizado
├── backup.sh         # Script de backup
└── README.md         # Este arquivo
```

## 🚀 Deploy no Hostinger

### Pré-requisitos

- Conta no Hostinger com plano que suporte Node.js
- Acesso SSH ao servidor (IP: 31.97.170.240)
- MySQL disponível

### Passo a Passo Rápido

1. **Preparar o projeto localmente:**

   ```bash
   # Build do frontend
   cd frontend && npm run build

   # Configurar arquivos .env.production
   # Backend: backend/.env.production
   # Frontend: frontend/.env.production
   ```

2. **Upload para o servidor:**

   ```bash
   # Via SSH (recomendado)
   ssh u123456789@31.97.170.240
   cd public_html
   git clone <seu-repositorio> txai-support
   cd txai-support
   ```

3. **Configurar o backend:**

   ```bash
   cd backend
   npm install --production
   npm run build

   # Configurar PM2
   npm install -g pm2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

4. **Configurar Nginx:**
   ```bash
   # Copiar configuração do Nginx
   sudo cp nginx/nginx.conf /etc/nginx/sites-available/txai-support
   sudo ln -s /etc/nginx/sites-available/txai-support /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Para atualizações futuras:

```bash
./deploy.sh
```

## 🛠️ Desenvolvimento Local

### Pré-requisitos

- Node.js (v16 ou superior)
- MySQL
- npm ou yarn

### Configuração

1. **Clone o repositório:**

   ```bash
   git clone <seu-repositorio>
   cd txai-support
   ```

2. **Configure o backend:**

   ```bash
   cd backend
   npm install

   # Crie o arquivo .env
   cp env.example .env
   # Edite as variáveis de ambiente

   # Execute as migrações
   npx prisma migrate dev
   npx prisma generate

   # Inicie o servidor
   npm run dev
   ```

3. **Configure o frontend:**

   ```bash
   cd frontend
   npm install

   # Crie o arquivo .env.local
   echo "REACT_APP_API_URL=http://localhost:3001/api" > .env.local

   # Inicie o servidor
   npm start
   ```

## 📝 Arquivos de Configuração

### Backend (.env)

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=mysql://txai:Acaraje123@localhost:3306/txai_support
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:3000
UPLOAD_PATH=./uploads
```

### Frontend (.env.local)

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENV=development
```

## 🔧 Scripts Úteis

### Deploy

```bash
./deploy.sh          # Deploy automatizado
```

### Backup

```bash
./backup.sh          # Backup do banco e arquivos
```

### PM2 (no servidor)

```bash
pm2 status           # Status da aplicação
pm2 logs txai-backend # Ver logs
pm2 restart txai-backend # Reiniciar
pm2 monit            # Monitoramento
```

## 📊 Monitoramento

### Health Check

- Endpoint: `GET /api/health`
- Retorna status da aplicação, uptime e versão

### Logs

- Backend: `pm2 logs txai-backend`
- Nginx: `sudo tail -f /var/log/nginx/access.log`

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro 502 Bad Gateway**

   - Verificar se o backend está rodando: `pm2 status`
   - Verificar logs: `pm2 logs txai-backend`

2. **Erro de CORS**

   - Verificar `CORS_ORIGIN` no .env
   - Verificar configuração do Nginx

3. **Erro de banco de dados MySQL**

   - Verificar se MySQL está rodando: `sudo systemctl status mysql`
   - Executar migrações: `npx prisma migrate deploy`
   - Verificar conexão: `mysql -u txai -p txai_support`

4. **Arquivos não carregam**
   - Verificar permissões da pasta uploads
   - Verificar configuração do Nginx

## 📞 Suporte

Para problemas:

1. Verifique os logs: `pm2 logs txai-backend`
2. Teste a API: `curl http://localhost:3001/api/health`
3. Verifique configuração: `sudo nginx -t`

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.
