# TXAI Support

Sistema de suporte técnico rodando no Google Cloud Platform (GCP).

## 🚀 Início Rápido

### Opção 1: Docker Compose (Recomendado)

Sobe todos os serviços (PostgreSQL + Backend + Frontend) com um único comando:

**macOS/Linux:**
```bash
./setup.sh
# OU manualmente: docker-compose up -d
```

**Windows (PowerShell):**
```powershell
.\setup.ps1
# OU manualmente: docker-compose up -d
```

**URLs locais:**
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health
- **API Docs (Swagger)**: http://localhost:3001/api-docs
- **PostgreSQL**: localhost:5433

### Opção 2: Frontend em Modo Desenvolvimento

Para desenvolvimento com hot reload:

```bash
# Backend e banco via Docker
docker-compose up -d postgres backend

# Frontend via npm (com hot reload)
cd frontend
npm install
npm start
```

Frontend estará em: http://localhost:3000

## 🔐 Credenciais Padrão

O sistema cria automaticamente um usuário administrador:

- **Email**: `admin@txai.com`
- **Senha**: `admin123`

> ⚠️ **Importante**: Altere essas credenciais em produção!

## 📦 Arquitetura

### Stack Tecnológica

- **Backend**: Node.js + Express + TypeScript + Prisma
- **Frontend**: React + TypeScript + Ant Design + TailwindCSS
- **Banco de Dados**: PostgreSQL 15
- **Container**: Docker + Docker Compose
- **Infraestrutura**: Google Cloud Platform (GCP)

### Ambiente de Produção (GCP)

- **Frontend**: Firebase Hosting (CDN global + roteamento SPA)
- **Backend**: Cloud Run (API containerizada serverless)
- **Banco de Dados**: Cloud SQL (PostgreSQL gerenciado)
- **Storage**: Cloud Storage (uploads de arquivos)
- **IaC**: OpenTofu/Terraform

## 🗄️ Banco de Dados

### Migrations e Seeding

O backend executa **automaticamente** ao iniciar:

1. ✅ **Migrations** (`npx prisma migrate deploy`)
2. ✅ **Seed** (`npx prisma db seed`) - cria usuário admin se não existir

Não é necessário executar nenhum comando manual após `docker-compose up`!

### Seed Manual (se necessário)

```bash
# Via Docker
docker exec txai-backend npx prisma db seed

# Ou localmente no backend
cd backend
npx prisma db seed
```

### Reset do Banco de Dados

```bash
# Remove volumes e recria tudo
docker-compose down -v
docker-compose up -d

# O seed será executado automaticamente
```

## 🔧 Variáveis de Ambiente

### Desenvolvimento Local (Docker Compose)

Já configuradas no `docker-compose.yml`:

```yaml
# Backend
DATABASE_URL=postgresql://txai:txai123@postgres:5432/txai_support
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
PORT=3001

# Frontend
REACT_APP_API_URL=http://localhost:3001/api
```

### Produção (GCP)

Configuradas via Terraform e scripts de deploy:

```bash
# Obrigatórias
DATABASE_URL=postgresql://...  # Cloud SQL
JWT_SECRET=<gerado-automaticamente>
CORS_ORIGINS=https://seu-app.web.app,https://seu-app.firebaseapp.com
GCS_BUCKET=seu-bucket-uploads
GCS_PROJECT_ID=seu-projeto-gcp

# Opcionais
STORAGE_DRIVER=gcs  # ou 'local' para desenvolvimento
NODE_ENV=production
PORT=3001
```

## ☁️ Deploy para Google Cloud Platform (Do Zero)

Esta seção ensina como configurar e deployar o projeto no GCP partindo de uma conta nova.

### 1. Preparação Inicial (Bootstrapping)

Antes de rodar qualquer script, você precisa preparar seu ambiente local e o projeto no Google Cloud.

#### Passo 1.1: Instalar Ferramentas
Você precisará ter instalado:
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- [OpenTofu](https://opentofu.org/docs/intro/install/) (`tofu`) - alternativa open-source ao Terraform
- [Node.js & npm](https://nodejs.org/)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

#### Passo 1.2: Criar Projeto e Autenticar
1. Crie um projeto no [Console do GCP](https://console.cloud.google.com/).
2. **Ative o Billing** (obrigatório para Cloud Run/SQL).
3. No seu terminal, faça login e configure o projeto:

```bash
# Login no GCP
gcloud auth login
gcloud auth application-default login

# Definir projeto ativo
gcloud config set project SEU_ID_DO_PROJETO
```

#### Passo 1.3: Login no Firebase
O frontend usa Firebase Hosting. Você precisa logar na CLI:

```bash
firebase login
```
*Isso abrirá o navegador para autenticação.*

### 2. Deploy Automatizado (First Time Deploy)

Criamos um "super script" que faz **tudo** para você: cria buckets, configura permissões (IAM), sobe o banco de dados, deploya o backend e o frontend.

Execute o comando abaixo, substituindo as variáveis:

```bash
# Variáveis de configuração
PROJECT_ID="seu-id-do-projeto-gcp"
GITHUB_OWNER="seu-usuario-github"
GITHUB_REPO="nome-do-repositorio"

# Executar o script mestre
./scripts/gcp/first-time-deploy.sh
```

**O que este script faz:**
1. **Bootstrap:** Cria um bucket para guardar o estado do Terraform (`tfstate`) e configura o acesso do GitHub Actions.
2. **Infraestrutura:** Usa OpenTofu para criar Cloud Run, Cloud SQL, Cloud Storage e Artifact Registry.
3. **Backend:** Compila o Docker, sobe para o registro e deploya no Cloud Run.
4. **Frontend:** Compila o React e deploya no Firebase Hosting.
5. **Verificação:** Testa se tudo está respondendo corretamente.

### 3. Configuração Pós-Deploy (Essencial)

Por segurança, o script gera alguns valores padrão. Você **DEVE** configurar o segredo do JWT para produção:

```bash
# 1. Gerar um segredo forte
JWT_SECRET=$(openssl rand -base64 32)

# 2. Atualizar o backend no Cloud Run
gcloud run services update txai-backend \
  --region us-central1 \
  --update-env-vars JWT_SECRET=$JWT_SECRET
```

### 4. Usando os Scripts Modulares

No dia a dia, você não usará o `first-time-deploy.sh`. Use os scripts específicos em `scripts/gcp/`:

- **Alterou código do Backend?**
  ```bash
  PROJECT_ID=seu-projeto ./scripts/gcp/deploy-backend.sh
  ```

- **Alterou código do Frontend?**
  ```bash
  # Precisa da URL do backend para o build
  API_URL=https://url-do-seu-backend.run.app/api \
  ./scripts/gcp/deploy-frontend-firebase.sh
  ```

- **Alterou Infraestrutura (Terraform)?**
  ```bash
  PROJECT_ID=seu-projeto \
  TF_STATE_BUCKET=seu-bucket-tfstate \
  ./scripts/gcp/deploy-all.sh
  ```

Consulte a [documentação completa em docs/](docs/README.md) para mais detalhes.

## 📚 Documentação Completa

Toda a documentação está organizada em `docs/`:

- **[Visão Geral](docs/README.md)** - Índice completo da documentação
- **[Guia de Deploy](docs/infra/deployment-guide.md)** - Deploy detalhado no GCP
- **[Terraform](docs/infra/terraform.md)** - Infraestrutura como código
- **[Scripts GCP](scripts/gcp/README.md)** - Referência dos scripts de deploy
- **[Docker](docs/docker.md)** - Configuração e uso do Docker
- **[Testes](docs/testing.md)** - Como executar os testes
- **[Troubleshooting](docs/troubleshooting.md)** - Soluções para problemas comuns

## 🧪 Testes

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test

# Todos os testes (requer Docker)
./scripts/test-all.sh  # Linux/macOS
.\scripts\test-all.ps1  # Windows
```

## 🔐 Segurança

### Autenticação JWT

- Tokens gerados com HS256
- Expiração padrão: 24 horas
- Secret configurado via `JWT_SECRET`
- Middleware de autenticação protege endpoints

### CORS

- Configurado dinamicamente baseado no ambiente
- Produção: apenas domínios Firebase autorizados
- Desenvolvimento: localhost permitido

### Senhas

- Hash com bcrypt (10 rounds)
- Nunca armazenadas em texto plano
- Validação de força de senha recomendada

## 🐛 Troubleshooting

### Erro 401 (Unauthorized) no Frontend

**Causa**: JWT_SECRET diferente entre login e validação.

**Solução**:
```bash
# Local: verificar docker-compose.yml
# GCP: redeployar backend com JWT_SECRET correto
gcloud run services update txai-backend \
  --update-env-vars JWT_SECRET=seu-secret
```

### CORS Blocked

**Causa**: CORS_ORIGINS não inclui a origem do frontend.

**Solução**:
```bash
# Adicionar origem ao backend
CORS_ORIGINS=https://seu-app.web.app,http://localhost:3000 \
./scripts/gcp/deploy-backend.sh
```

### Database Connection Failed

**Causa**: DATABASE_URL incorreta ou banco não acessível.

**Solução Local**:
```bash
# Verificar se postgres está rodando
docker-compose ps postgres

# Recriar containers
docker-compose down -v
docker-compose up -d
```

**Solução GCP**:
```bash
# Verificar Cloud SQL Proxy
gcloud sql instances describe INSTANCE_NAME

# Verificar logs do Cloud Run
gcloud run services logs read txai-backend --limit 50
```

## 📊 Status do Projeto

✅ **Produção**:
- Frontend: https://bizybox-gcp-project-dev.web.app
- Backend: https://txai-backend-*.run.app
- Infraestrutura: 100% automatizada com Terraform
- Deploy: Totalmente automatizado com scripts

✅ **Funcionalidades**:
- Autenticação JWT implementada
- CORS configurado corretamente
- Migrations automáticas no startup
- Seeding automático do admin
- Upload de imagens (GCS em produção)
- API REST completa
- Documentação Swagger

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

**Padrão de Commits**: Seguimos [Conventional Commits](https://www.conventionalcommits.org/)

## 📝 Licença

[Insira informações de licença aqui]

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma [issue no GitHub](https://github.com/badesouza/txai-support/issues)
- Consulte a [documentação completa](docs/README.md)
- Veja o [troubleshooting guide](docs/troubleshooting.md)
