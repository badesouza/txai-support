# 🔧 Solução para Imagens Quebradas em Produção

## 📋 Problema Identificado

As imagens do WhatsApp funcionam localmente mas quebram no servidor Digital Ocean devido a URLs hardcoded com `localhost`.

## ✅ Soluções Implementadas

### 1. **Função Dinâmica de URLs** ✅

- Criada função `getImageUrl()` em `frontend/src/config/api.ts`
- Detecta automaticamente se está em desenvolvimento ou produção
- Constrói URLs corretas baseadas na configuração da API

### 2. **Atualização dos Componentes** ✅

- **EditCall.tsx**: Atualizado para usar `getImageUrl()`
- **CallTable.tsx**: Atualizado para usar `getImageUrl()`
- Removidas todas as URLs hardcoded com `localhost`

### 3. **Logs de Debug** ✅

- Adicionados logs detalhados no servidor para debug de imagens
- Middleware para monitorar requisições de imagens
- Verificação de existência e permissões de arquivos

## 🚀 Como Aplicar as Correções

### 1. **Atualizar o Frontend**

```bash
cd frontend
npm run build
```

### 2. **Verificar Configuração do Nginx**

Certifique-se de que o nginx está configurado corretamente:

```nginx
# Uploads
location /uploads/ {
    alias /home/u123456789/public_html/txai-support/backend/uploads/;
    expires 1d;
    add_header Cache-Control "public";

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
}
```

### 3. **Verificar Permissões**

```bash
# No servidor
chmod 755 /home/u123456789/public_html/txai-support/backend/uploads
chown www-data:www-data /home/u123456789/public_html/txai-support/backend/uploads
```

### 4. **Testar as Imagens**

```bash
# Executar o script de teste
node test-images.js
```

## 🔍 Verificações Importantes

### 1. **Variáveis de Ambiente**

Certifique-se de que `REACT_APP_API_URL` está configurado corretamente:

**Desenvolvimento:**

```
REACT_APP_API_URL=http://localhost:3001/api
```

**Produção:**

```
REACT_APP_API_URL=http://31.97.170.240/api
```

### 2. **Estrutura de Pastas**

```
backend/
├── uploads/          # Pasta das imagens
└── src/
    └── server.ts     # Configuração de servir arquivos estáticos
```

### 3. **Logs do Servidor**

Verifique os logs para identificar problemas:

```bash
# Logs do nginx
sudo tail -f /var/log/nginx/error.log

# Logs da aplicação
pm2 logs
```

## 🐛 Possíveis Problemas e Soluções

### 1. **Imagens não carregam**

- Verificar se a pasta `uploads` existe
- Verificar permissões da pasta
- Verificar se o nginx está servindo a pasta corretamente

### 2. **Erro 404 nas imagens**

- Verificar se o caminho no nginx está correto
- Verificar se os arquivos existem na pasta
- Verificar se o alias do nginx está apontando para o local correto

### 3. **Erro de CORS**

- Verificar se o CORS está configurado corretamente
- Verificar se as origens permitidas incluem o domínio de produção

## 📝 Comandos Úteis

### Verificar arquivos na pasta uploads:

```bash
ls -la /home/u123456789/public_html/txai-support/backend/uploads/
```

### Testar URL de imagem:

```bash
curl -I http://31.97.170.240/uploads/nome-da-imagem.jpg
```

### Verificar configuração do nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## ✅ Checklist de Verificação

- [ ] Frontend atualizado com `getImageUrl()`
- [ ] Build do frontend gerado
- [ ] Nginx configurado corretamente
- [ ] Permissões da pasta uploads corretas
- [ ] Variáveis de ambiente configuradas
- [ ] Servidor reiniciado
- [ ] Imagens testadas localmente
- [ ] Imagens testadas em produção

## 🎯 Resultado Esperado

Após aplicar todas as correções:

- ✅ Imagens funcionam localmente
- ✅ Imagens funcionam em produção
- ✅ URLs são construídas dinamicamente
- ✅ Logs mostram requisições de imagens
- ✅ Nenhum erro 404 para imagens
