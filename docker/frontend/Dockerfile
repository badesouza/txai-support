# Frontend Dockerfile - React
FROM node:18-alpine as build

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY frontend/package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/tsconfig.json ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./

# Build da aplicação
RUN npm run build

# Estágio de produção com Nginx
FROM nginx:alpine

# Copiar build do React
COPY --from=build /app/build /usr/share/nginx/html

# Copiar configuração customizada do Nginx
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta
EXPOSE 80

# Comando de inicialização
CMD ["nginx", "-g", "daemon off;"]
