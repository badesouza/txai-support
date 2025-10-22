FROM node:18-alpine

# Install dependencies for Puppeteer/Chrome and build tools
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget \
    curl \
    git \
    python3 \
    make \
    g++

# Set Puppeteer to use installed chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Clone and install wppconnect-server from GitHub
RUN git clone https://github.com/wppconnect-team/wppconnect-server.git . && \
    npm install && \
    npm install redis && \
    npm run build

# Create necessary directories
RUN mkdir -p /app/tokens /app/sessions /app/logs

# Copy Redis publisher, webhook server and startup script
COPY redis-publisher.js /app/redis-publisher.js
COPY redis-webhook-server.js /app/redis-webhook-server.js
COPY start-with-redis.js /app/start-with-redis.js

# Expose port
EXPOSE 21465

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:21465 || exit 1

# Start wppconnect-server with Redis integration
CMD ["node", "start-with-redis.js"]

