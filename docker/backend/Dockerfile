# Backend Dockerfile - Node.js + Prisma + WhatsApp
FROM node:18-alpine

# Instalar dependências do sistema para Chromium e outras bibliotecas nativas
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    xvfb \
    dbus \
    ttf-dejavu \
    ttf-droid \
    ttf-liberation \
    font-noto \
    && rm -rf /var/cache/apk/*

# Configurar Chromium para funcionar sem display
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/bin/chromium-browser \
    DISPLAY=:99

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Instalar dependências (incluindo dev para build)
RUN npm ci

# Gerar cliente Prisma
RUN npx prisma generate

# Copiar código fonte
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Compilar TypeScript
RUN npm run build

# Criar diretório de uploads
RUN mkdir -p uploads

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Dar permissões para o usuário nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor porta
EXPOSE 3001

# Script de inicialização
COPY docker/backend/entrypoint.sh /entrypoint.sh
USER root
RUN chmod +x /entrypoint.sh
USER nodejs

# Comando de inicialização
CMD ["/entrypoint.sh"]
