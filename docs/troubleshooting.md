# Troubleshooting Guide

Guia de solução de problemas comuns durante desenvolvimento e deploy.

## Sumário
- [Auth & JWT (Erro 401)](#auth--jwt-erro-401)
- [CORS (Cross-Origin Resource Sharing)](#cors-cross-origin-resource-sharing)
- [Banco de Dados (Connection Failed)](#banco-de-dados-connection-failed)
- [Deploy GCP (Cloud Run/Build)](#deploy-gcp-cloud-runbuild)
- [Frontend (Firebase/React)](#frontend-firebasereact)

---

## Auth & JWT (Erro 401)

### Sintoma
Frontend recebe `401 Unauthorized` ao acessar endpoints protegidos (`/api/users`, `/api/calls`), mesmo após login bem-sucedido.

### Causa
Mismatch na assinatura do token JWT. O segredo usado para **gerar** o token (login) é diferente do usado para **validar** (middleware).

### Solução

#### 1. Padronização do Código (Já aplicado)
Certifique-se de que ambos usam a mesma configuração:
```typescript
// backend/src/config/jwt.ts
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';
```

#### 2. Ambiente de Produção (Cloud Run)
Se o erro ocorre em produção, é porque a variável de ambiente `JWT_SECRET` não foi definida ou foi alterada.

**Correção:**
```bash
# Gere um secret seguro
NEW_SECRET=$(openssl rand -base64 32)

# Atualize o serviço
gcloud run services update txai-backend \
  --region us-central1 \
  --update-env-vars JWT_SECRET=$NEW_SECRET
```

> **Nota:** Todos os usuários precisarão fazer login novamente após a mudança.

---

## CORS (Cross-Origin Resource Sharing)

### Sintoma
Erro no console do browser: `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`.

### Causa
O backend não está configurado para aceitar requisições da origem do frontend (ex: `https://seu-app.web.app`).

### Solução

#### 1. Configuração Dinâmica
O backend deve aceitar múltiplas origens definidas via variável de ambiente `CORS_ORIGINS`.

**Verificar configuração atual:**
```bash
gcloud run services describe txai-backend \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

#### 2. Correção Automática
Re-execute o script de deploy do backend, que detecta automaticamente as URLs do Firebase:
```bash
./scripts/gcp/deploy-backend.sh
```

#### 3. Correção Manual
```bash
# Adicione suas URLs (separadas por vírgula)
URLS="https://seu-projeto.web.app,https://seu-projeto.firebaseapp.com"

gcloud run services update txai-backend \
  --update-env-vars "^:^CORS_ORIGINS=$URLS"
```
*Nota: Use `^:^` como delimitador para evitar problemas com vírgulas no gcloud CLI.*

---

## Banco de Dados (Connection Failed)

### Sintoma
Backend falha ao iniciar ou endpoints retornam erro 500. Logs mostram `PrismaClientInitializationError` ou timeout de conexão.

### Causa
- **Local:** Container Postgres parado ou porta incorreta.
- **GCP:** Cloud Run não tem permissão para acessar o Cloud SQL ou a string de conexão está errada.

### Solução

#### Local
```bash
# Verifique se o container está rodando
docker compose ps

# Reinicie com volumes limpos (atenção: apaga dados)
docker compose down -v
docker compose up -d
```

#### GCP (Cloud Run)
1. **Verifique a conexão:**
   O Cloud Run usa o Cloud SQL Proxy embutido. A string de conexão **não** deve usar IP, mas sim socket Unix:
   `postgresql://user:pass@localhost/db?host=/cloudsql/PROJECT:REGION:INSTANCE`

2. **Verifique as variáveis:**
   ```bash
   gcloud run services describe txai-backend
   ```
   Procure por `DATABASE_URL`.

3. **Verifique permissões:**
   A Service Account do Cloud Run (`runtime-api@...`) deve ter o papel `Cloud SQL Client`.

---

## Deploy GCP (Cloud Run/Build)

### Sintoma
Deploy falha com `Step #...: ERROR`.

### Causa
Geralmente erro de build do Docker ou falha nos scripts de migração (`startup.sh`).

### Solução

#### 1. Verificar Logs de Build
```bash
gcloud builds list --limit 1
gcloud builds log [BUILD_ID]
```

#### 2. Verificar Scripts de Startup
O backend executa `prisma migrate` e `seed` ao iniciar. Se isso falhar, o container morre.
- Aumente o timeout de startup (configurado para 300s no Terraform).
- Verifique se o banco está acessível durante o startup.

---

## Frontend (Firebase/React)

### Sintoma
Tela branca ou loop de redirecionamento.

### Causa
- Roteamento SPA não configurado (erro 404 em rotas profundas).
- Variável `REACT_APP_API_URL` incorreta no build.

### Solução

#### 1. Configuração SPA (`firebase.json`)
Certifique-se de que há um rewrite para `index.html`:
```json
"rewrites": [ { "source": "**", "destination": "/index.html" } ]
```

#### 2. Re-deploy com API URL correta
```bash
export API_URL="https://seu-backend.run.app/api"
./scripts/gcp/deploy-frontend-firebase.sh
```
*O React "bakes" as variáveis de ambiente no momento do build (npm run build).*
