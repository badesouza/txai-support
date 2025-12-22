# Docker (local)

Este projeto usa Docker Compose para rodar localmente todo o ambiente de desenvolvimento.

## Setup recomendado

macOS/Linux:
```bash
./setup.sh
```

Windows:
```powershell
.\setup.ps1
```

## Arquitetura local

O `docker-compose.yml` sobe 3 serviços essenciais:

1. **Frontend (`txai-frontend`)**
   - Imagem: `nginx:alpine` servindo o build do React
   - Porta: `8080` (mapeada para 80 interna)
   - Config: `frontend/nginx.conf` (SPA routing + gzip)
   
2. **Backend (`txai-backend`)**
   - Imagem: Node.js 18 (Alpine)
   - Porta: `3001`
   - Inicialização: Executa migrations e seed automaticamente

3. **Database (`txai-postgres`)**
   - Imagem: PostgreSQL 15 (Alpine)
   - Porta: `5433` (evita conflito com postgres local na 5432)
   - Volume: `postgres_data` (persistência)

## Portas padrão
- **Frontend**: http://localhost:8080
- **API**: http://localhost:3001/api
- **Postgres**: localhost:5433

## Setup manual

1) Subir containers:
```bash
docker compose up -d --build
```

2) Migrations + seed (já automático, mas se precisar forçar):
```bash
docker exec txai-backend npx prisma migrate deploy
docker exec txai-backend npx prisma db seed
```

> Se você executar `docker compose down -v`, precisará rodar o seed novamente pois o volume do banco será apagado.

## Comandos úteis

Logs em tempo real:
```bash
docker compose logs -f
```

Apenas logs do backend:
```bash
docker compose logs -f backend
```

Shell do banco de dados:
```bash
docker exec -it txai-postgres psql -U txai -d txai_support
```

Reset completo (apaga dados):
```bash
docker compose down -v
```

## Observações
- Uploads persistem em `backend/uploads` (volume mapeado)
- Sessões do WhatsApp persistem em `backend/whatsapp-sessions` (volume mapeado)
