# 🐳 Docker Setup - TxAI Support

## Arquitetura

Sistema composto por 5 containers:

1. **Frontend** - React (Nginx)
2. **Backend** - Node.js + Express + Prisma
3. **PostgreSQL** - Banco de dados
4. **WPPConnect** - Servidor WhatsApp
5. **Nginx** - Proxy reverso

## 🚀 Iniciando o Sistema

### Pré-requisitos

- Docker e Docker Compose instalados
- Portas 80, 443, 3001, 5432 e 21465 disponíveis

### Passo 1: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Database
POSTGRES_USER=txai
POSTGRES_PASSWORD=txai123
POSTGRES_DB=txai_support

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# WPPConnect
WPPCONNECT_SECRET_KEY=THISISMYSECURETOKEN
```

### Passo 2: Build e Iniciar os Containers

```bash
# Build das imagens
docker-compose build

# Iniciar todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f
```

### Passo 3: Conectar WhatsApp

1. Acesse: `http://localhost/whatsapp`
2. Escaneie o QR Code com seu WhatsApp
3. Aguarde a confirmação de conexão

### Passo 4: Testar Resposta Automática

Envie qualquer mensagem para o número conectado e receba: **"oi, sou leko"**

## 📱 Funcionalidades

### Resposta Automática

- **TODAS** as mensagens recebidas são respondidas automaticamente com "oi, sou leko"
- Funciona 24/7 enquanto os containers estiverem rodando
- Histórico de mensagens salvo no banco de dados

### Webhook do WPPConnect

O sistema está configurado para receber webhooks do WPPConnect automaticamente:

- URL: `http://backend:3001/api/whatsapp/webhook`
- Eventos: `message`, `message_ack`, `state_change`, `qr`, `connection`
- Processamento assíncrono para não bloquear o webhook

## 🔧 Comandos Úteis

```bash
# Parar todos os containers
docker-compose down

# Parar e remover volumes (⚠️ apaga dados)
docker-compose down -v

# Rebuild de um serviço específico
docker-compose build backend
docker-compose up -d backend

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f wppconnect

# Acessar container
docker-compose exec backend sh
docker-compose exec postgres psql -U txai -d txai_support

# Reiniciar um serviço
docker-compose restart backend
docker-compose restart wppconnect
```

## 🌐 Endpoints

### Frontend

- `http://localhost/` - Aplicação principal
- `http://localhost/whatsapp` - Página de conexão WhatsApp

### Backend API (via Nginx)

- `http://localhost/api/health` - Health check
- `http://localhost/api/users` - Usuários
- `http://localhost/api/calls` - Chamados
- `http://localhost/api/whatsapp/status` - Status WhatsApp
- `http://localhost/api/whatsapp/qrcode` - QR Code

### WPPConnect (via Nginx - opcional)

- `http://localhost/wppconnect/` - API WPPConnect

### Direto nos containers

- Backend: `http://localhost:3001`
- WPPConnect: `http://localhost:21465`

## 🔍 Troubleshooting

### WhatsApp não conecta

```bash
# Ver logs do WPPConnect
docker-compose logs -f wppconnect

# Reiniciar WPPConnect
docker-compose restart wppconnect

# Ver sessões ativas
docker-compose exec wppconnect ls -la /app/sessions
```

### Backend não inicia

```bash
# Ver logs
docker-compose logs -f backend

# Verificar banco de dados
docker-compose logs -f postgres

# Rebuild do backend
docker-compose build backend
docker-compose up -d backend
```

### Mensagens não estão sendo respondidas

```bash
# Ver logs do backend
docker-compose logs -f backend | grep "📱"

# Testar webhook manualmente
curl -X POST http://localhost/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message",
    "data": {
      "from": "5511999999999@c.us",
      "body": "teste",
      "type": "chat",
      "t": 1234567890
    }
  }'
```

### Limpar tudo e começar do zero

```bash
# Parar e remover tudo
docker-compose down -v

# Remover imagens
docker rmi $(docker images -q txai-*)

# Rebuild e restart
docker-compose build --no-cache
docker-compose up -d
```

## 📊 Monitoramento

### Health Checks

Todos os serviços têm health checks configurados:

```bash
# Ver status de saúde
docker-compose ps

# Serviços saudáveis devem mostrar (healthy)
```

### Logs Estruturados

Todos os logs usam emojis para fácil identificação:

- 📱 WhatsApp
- 📤 Enviando
- ✅ Sucesso
- ❌ Erro
- 🔍 Debug

## 🔐 Segurança

### Produção

Antes de fazer deploy em produção:

1. **Altere todas as senhas** no `.env`
2. **Configure HTTPS** no Nginx
3. **Use volumes externos** para dados persistentes
4. **Configure firewall** apropriado
5. **Use secrets** do Docker para dados sensíveis

### Backup

```bash
# Backup do banco de dados
docker-compose exec postgres pg_dump -U txai txai_support > backup.sql

# Backup dos dados do WPPConnect
docker cp txai-wppconnect:/app/sessions ./backup/sessions
docker cp txai-wppconnect:/app/tokens ./backup/tokens
```

## 📝 Notas

- O sistema responde **TODAS** as mensagens automaticamente
- As mensagens são salvas no histórico
- O QR Code expira após alguns minutos
- Reconexão automática configurada
- Logs detalhados para debug

## 🆘 Suporte

Para problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Verifique o health status: `docker-compose ps`
3. Teste os endpoints: `curl http://localhost/api/health`
4. Reinicie os serviços: `docker-compose restart`

---

**Desenvolvido com ❤️ para automação de atendimento via WhatsApp**
