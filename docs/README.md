# Documentação

## Visão geral

O objetivo desta documentação é manter **paridade local ↔ GCP** e preparar o caminho para:
- Backend no Cloud Run
- Banco no Cloud SQL (Postgres)
- Uploads/arquivos no Google Cloud Storage (GCS)
- Multi-tenant com isolamento por tenant (futuro) e RLS no Postgres

## Contrato de URLs (local)

Sem reverse proxy (sem nginx no docker-compose):
- **Frontend:** `http://localhost:3000`
- **API:** `http://localhost:3001/api`
- **API Docs:** `http://localhost:3001/api-docs`
- **Uploads (temporário/local):** `http://localhost:3001/uploads`

O frontend chama a API via `REACT_APP_API_URL=http://localhost:3001/api`.

## Contrato de URLs (GCP)

Ambiente alvo (dev-first):
- **Frontend:** Firebase Hosting em `https://<project-id>.web.app`
- **API:** Cloud Run (`https://<service>-<hash>-uc.a.run.app`)
- **Uploads:** GCS privado com URLs assinadas (geradas pelo backend)

> Quando o driver GCS estiver ativo, o backend deve retornar URLs assinadas para download/upload.

## Deploy local para GCP (Cloud Run)

Scripts locais (sem CI/CD ainda):
- `scripts/gcp/deploy-backend.sh`
- `scripts/gcp/deploy-backend.ps1`

Pré-requisitos: `gcloud` autenticado no projeto dev e Artifact Registry criado (via Terraform).

## Guias

- Quickstart: `docs/quickstart.md`
- Docker/local: `docs/docker.md`
- Testes: `docs/testing.md`
- Contribuição: `docs/contributing.md`
- Infra (OpenTofu/Terraform compatível): `docs/infra/terraform.md`

## Variáveis de ambiente (notas)

- Backend:
  - `DATABASE_URL` (Postgres)
  - `JWT_SECRET`
  - `CORS_ORIGINS` (CSV) ou `CORS_ORIGIN` (único)
  - `STORAGE_DRIVER` (`local` | `gcs`)
  - `UPLOAD_PATH` (caminho local para uploads)
  - `GCS_BUCKET`, `GCS_PROJECT_ID`, `GCS_CREDENTIALS_JSON` (placeholders)
  - `GCS_UPLOADS_PREFIX`, `GCS_SIGNED_URL_TTL_SECONDS`
- Frontend:
  - `REACT_APP_API_URL`

> Observação: uploads serão migrados para GCS; o caminho `/uploads` é apenas para paridade local no curto prazo.
