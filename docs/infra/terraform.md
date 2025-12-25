# Infra (OpenTofu/Terraform) + GitHub Actions (dev-first)

Gerenciamos a infraestrutura no Google Cloud usando **OpenTofu** (compatível com Terraform) e executamos via **GitHub Actions** com **OIDC** (Workload Identity Federation). Sem chaves de longa duração.

## Estrutura
- `infra/terraform/bootstrap` (uma vez, local)
  - Cria bucket GCS para state remoto
  - Cria provider OIDC do GitHub (WIF)
  - Cria service account `tf-admin` usado pelo GitHub Actions
- `infra/terraform/environments/dev` (repetível, GitHub-driven)
  - Habilita APIs necessárias
  - Cria repositório no Artifact Registry
  - Cria service accounts e roles
- Cria bucket GCS (uploads privados)
  - Cria Cloud Run service para o backend

## Bootstrap (rodar uma vez localmente)
Pré-requisitos:
- `gcloud` autenticado e apontado para o projeto dev
- `tofu` instalado: `brew install opentofu`

Rodar:
```bash
cd infra/terraform/bootstrap
tofu init
tofu apply \
  -var="project_id=bizybox-gcp-project-dev" \
  -var="region=us-central1" \
  -var="github_owner=<github_owner>" \
  -var="github_repo=<repo_name>"
```

Anote os outputs:
- `wif_provider`
- `tf_service_account`
- `tf_state_bucket`

## Secrets do GitHub Actions
Crie os secrets no repositório:
- `GCP_WIF_PROVIDER` = output `wif_provider`
- `GCP_TF_SERVICE_ACCOUNT` = output `tf_service_account`
- `TF_STATE_BUCKET` = output `tf_state_bucket`

O workflow está em `.github/workflows/terraform-dev.yml`.

## Deploy local (uma conta nova)
Depois do bootstrap, este é o fluxo mínimo para uma conta nova:
```bash
cd infra/terraform/environments/dev
tofu init
tofu apply -var="project_id=SEU_PROJETO" -var="region=us-central1"
```

Use os outputs para preencher os scripts locais:
- `artifact_repo_url`
- `backend_cloud_run_url`
- `firebase_hosting_url`

Ou use o script único (recomendado):
```bash
PROJECT_ID=SEU_PROJETO TF_STATE_BUCKET=seu-bucket-tfstate \
  scripts/gcp/deploy-all.sh
```

Template de variáveis:
- `infra/terraform/environments/dev/terraform.tfvars.example`

## Scripts locais (sem CI/CD)
- Deploy backend (imagem Cloud Run): `scripts/gcp/deploy-backend.sh` ou `.ps1`
- Deploy frontend (Firebase Hosting): `scripts/gcp/deploy-frontend-firebase.sh` ou `.ps1`
- Deploy completo (Terraform + backend + frontend): `scripts/gcp/deploy-all.sh` ou `.ps1`

## Variáveis principais (environments/dev)
- `project_id`
- `region`
- `environment_name`
- `gcs_uploads_bucket_name` (opcional)
- `gcs_bucket_location` (opcional)
- `backend_service_name`
- `backend_container_port`
- `backend_image` (placeholder inicial)
- `backend_allow_unauthenticated`
- `backend_env_vars` (mapa de env vars para o backend)

Exemplo de `backend_env_vars` (em um `.tfvars`):
```hcl
backend_env_vars = {
  DATABASE_URL   = "postgresql://user:pass@host:5432/txai_support"
  JWT_SECRET     = "troque-isto"
  CORS_ORIGINS   = "https://<project-id>.web.app,https://<project-id>.firebaseapp.com"
  STORAGE_DRIVER = "gcs"
  GCS_BUCKET     = "seu-bucket-uploads"
  GCS_PROJECT_ID = "seu-projeto"
}
```

## Uploads com URLs assinadas
O bucket de uploads é privado. O backend deve gerar URLs assinadas para upload/download.
O service account `runtime-api` recebe `roles/iam.serviceAccountTokenCreator` para assinar URLs.

## Banco (Cloud SQL)
O ambiente cria uma instância Postgres com banco/usuário. Outputs úteis:
- `cloudsql_instance_connection_name`
- `cloudsql_database_name`
- `cloudsql_database_user`
- `cloudsql_database_password` (sensível)

## Trunk-based + feature flags
Recomendado:
- Proteja a `main`
- Branches curtas
- Merge por trás de flags

Opções de feature flag (Google + pragmático):
- **Firebase Remote Config**: melhor para toggles de UI no frontend
- **Cloud Run traffic splitting**: rollout progressivo por revisão de serviço
- **OpenFeature (SDK) + Firestore/DB**: toggles dinâmicos no backend sem lock-in

Conectaremos as flags após o primeiro deploy no Cloud Run.
