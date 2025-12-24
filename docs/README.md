# Documentação

## Visão Geral

O objetivo desta documentação é manter **paridade local ↔ GCP** - o mesmo código roda em ambos os ambientes:

- Backend no Cloud Run (ou Docker local)
- Banco no Cloud SQL (ou PostgreSQL local)
- Uploads no Google Cloud Storage (ou fake-gcs-server local)
- Sessões WhatsApp no Redis Cloud (ou Redis local)

## Guias Principais

### Arquitetura

- **[Local vs Cloud](architecture/LOCAL_VS_CLOUD.md)** - Diferenças completas entre ambientes
- **[Storage e Redis](STORAGE_AND_REDIS_SETUP.md)** - Configuração de armazenamento e sessões

### Infraestrutura

- **[Guia de Deploy](infra/deployment-guide.md)** - Deploy detalhado no GCP
- **[Terraform](infra/terraform.md)** - Infraestrutura como código

### Desenvolvimento

- **[Quickstart](quickstart.md)** - Início rápido
- **[Docker](docker.md)** - Configuração local com Docker
- **[Testes](testing.md)** - Como executar os testes
- **[Troubleshooting](troubleshooting.md)** - Soluções para problemas comuns

## URLs dos Serviços

### Local (Docker Compose)

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:3001/api |
| API Docs | http://localhost:3001/api-docs |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |
| GCS Emulator | http://localhost:4443 |

### Produção (GCP)

| Serviço | URL |
|---------|-----|
| Frontend | https://`<project-id>`.web.app |
| Backend API | https://`<service>`.run.app |
| PostgreSQL | Cloud SQL (via proxy) |
| Redis | Redis Cloud (TLS) |
| Storage | Cloud Storage (signed URLs) |

## Variáveis de Ambiente

### Backend

| Variável | Descrição | Local | Cloud |
|----------|-----------|-------|-------|
| `DATABASE_URL` | Conexão PostgreSQL | `postgres:5432` | Cloud SQL proxy |
| `REDIS_URL` | Conexão Redis | `redis:6379` | Redis Cloud (TLS) |
| `STORAGE_DRIVER` | Driver de storage | `gcs` | `gcs` |
| `STORAGE_EMULATOR_HOST` | Endpoint do emulador | `http://fake-gcs:4443` | (não definido) |
| `GCS_BUCKET` | Bucket de uploads | `txai-uploads` | `project-uploads` |
| `WHATSAPP_TOKEN_STORE` | Storage de sessões | `redis` | `redis` |
| `JWT_SECRET` | Segredo JWT | `.env` | Secret Manager |

### Frontend

| Variável | Descrição |
|----------|-----------|
| `REACT_APP_API_URL` | URL da API backend |

## Perfis de Ambiente

| Arquivo | Uso |
|---------|-----|
| `.env.local.template` | Todos os serviços em Docker |
| `.env.dev.template` | Todos os serviços na nuvem |
| `.env.hybrid.example` | Mistura local e nuvem |

## Scripts de Deploy

- `scripts/gcp/deploy-backend.sh` - Deploy do backend
- `scripts/gcp/deploy-frontend-firebase.sh` - Deploy do frontend
- `scripts/gcp/first-time-deploy.sh` - Setup inicial completo
