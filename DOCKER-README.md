# 🐳 TXAI Support - Docker Setup

Este projeto foi dockerizado com containers separados para frontend, backend, nginx e PostgreSQL.

## 📋 Estrutura

```
txai-support/
├── docker/
│   ├── backend/
│   │   ├── Dockerfile
│   │   └── entrypoint.sh
│   ├── frontend/
│   │   ├── Dockerfile
│   │   ├── Dockerfile.dev
│   │   └── nginx.conf
│   ├── nginx/
│   │   └── nginx.conf
│   └── postgres/
│       └── init.sql
├── docker-compose.yml          # Produção
├── docker-compose.dev.yml      # Desenvolvimento
├── env.docker.example          # Exemplo de variáveis
└── scripts/
    ├── docker-dev.ps1          # Script desenvolvimento
    └── docker-prod.ps1         # Script produção
```

## 🚀 Início Rápido

### Desenvolvimento

1. **Execute o script de desenvolvimento:**

   ```powershell
   .\scripts\docker-dev.ps1
   ```

2. **Ou manualmente:**

   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Acesse:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - PostgreSQL: localhost:5433

### Produção

1. **Configure as variáveis de ambiente:**

   ```bash
   cp env.docker.example .env
   # Edite o arquivo .env com suas configurações
   ```

2. **Execute o script de produção:**

   ```powershell
   .\scripts\docker-prod.ps1
   ```

3. **Ou manualmente:**

   ```bash
   docker-compose up --build -d
   ```

4. **Acesse:**
   - Aplicação: http://localhost
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## 🔧 Serviços

### 🗄️ PostgreSQL

- **Porta:** 5432 (produção) / 5433 (desenvolvimento)
- **Database:** txai_support
- **Usuário:** txai_user
- **Senha:** txai_password

### 🔧 Backend (Node.js + Prisma)

- **Porta:** 3001
- **Framework:** Express + TypeScript
- **ORM:** Prisma
- **WhatsApp:** WPPConnect + Chromium

### 📱 Frontend (React)

- **Porta:** 3000 (dev) / 80 (prod)
- **Framework:** React + TypeScript
- **Styling:** Tailwind CSS

### 🌐 Nginx (Reverse Proxy)

- **Porta:** 80
- **Função:** Load balancer e proxy reverso
- **Features:** Rate limiting, gzip, security headers

## 📝 Comandos Úteis

### Desenvolvimento

```bash
# Iniciar ambiente de desenvolvimento
docker-compose -f docker-compose.dev.yml up --build

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Parar ambiente
docker-compose -f docker-compose.dev.yml down

# Rebuild específico
docker-compose -f docker-compose.dev.yml up --build backend
```

### Produção

```bash
# Iniciar ambiente de produção
docker-compose up --build -d

# Ver logs
docker-compose logs -f

# Parar ambiente
docker-compose down

# Backup do banco
docker-compose exec postgres pg_dump -U txai_user txai_support > backup.sql

# Restore do banco
docker-compose exec -T postgres psql -U txai_user txai_support < backup.sql
```

### Manutenção

```bash
# Limpar containers parados
docker container prune

# Limpar imagens não utilizadas
docker image prune

# Limpar volumes não utilizados
docker volume prune

# Limpar tudo
docker system prune -a
```

## 🔍 Troubleshooting

### Problemas comuns:

1. **Porta já em uso:**

   ```bash
   # Verificar portas em uso
   netstat -tulpn | grep :3000

   # Parar processo na porta
   sudo kill -9 <PID>
   ```

2. **Problemas com Chromium:**

   ```bash
   # Verificar logs do backend
   docker-compose logs backend

   # Entrar no container
   docker-compose exec backend sh
   ```

3. **Problemas com banco:**

   ```bash
   # Verificar status do PostgreSQL
   docker-compose exec postgres pg_isready -U txai_user

   # Conectar ao banco
   docker-compose exec postgres psql -U txai_user -d txai_support
   ```

4. **Rebuild completo:**

   ```bash
   # Parar tudo
   docker-compose down

   # Remover volumes
   docker-compose down -v

   # Rebuild sem cache
   docker-compose build --no-cache

   # Iniciar novamente
   docker-compose up -d
   ```

## 🔐 Variáveis de Ambiente

### Obrigatórias:

- `DATABASE_URL`: String de conexão PostgreSQL
- `JWT_SECRET`: Chave secreta para JWT
- `NODE_ENV`: Ambiente (development/production)

### Opcionais:

- `PORT`: Porta do backend (padrão: 3001)
- `CORS_ORIGIN`: Origem permitida para CORS
- `MAX_FILE_SIZE`: Tamanho máximo de upload

## 📊 Monitoramento

### Health Checks

Todos os serviços têm health checks configurados:

- PostgreSQL: `pg_isready`
- Backend: `curl http://localhost:3001/health`
- Frontend: `curl http://localhost:80`
- Nginx: `curl http://localhost:80/health`

### Logs

```bash
# Logs de todos os serviços
docker-compose logs -f

# Logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f nginx
```

## 🚀 Deploy em Produção

1. **Configure o servidor:**

   - Instale Docker e Docker Compose
   - Configure firewall (portas 80, 443)
   - Configure SSL/TLS (Let's Encrypt)

2. **Clone o repositório:**

   ```bash
   git clone <repository-url>
   cd txai-support
   ```

3. **Configure variáveis:**

   ```bash
   cp env.docker.example .env
   # Edite .env com configurações de produção
   ```

4. **Inicie a aplicação:**

   ```bash
   docker-compose up --build -d
   ```

5. **Configure backup automático:**
   ```bash
   # Adicione ao crontab
   0 2 * * * cd /path/to/txai-support && docker-compose exec -T postgres pg_dump -U txai_user txai_support > backup_$(date +\%Y\%m\%d).sql
   ```

## 📚 Recursos Adicionais

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [React Documentation](https://reactjs.org/docs/)
