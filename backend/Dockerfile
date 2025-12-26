# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Development image
FROM base AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build application
RUN npm run build

# Production image
FROM base AS production
WORKDIR /app

# Set to production environment
ENV NODE_ENV=production

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy startup script
COPY startup.sh ./
# Ensure the script works when building from Windows (CRLF) and Unix (LF)
# by normalizing line-endings inside the image.
RUN sed -i 's/\r$//' startup.sh && chmod +x startup.sh

# No local directories needed - all state is external:
# - Files → GCS
# - WhatsApp sessions → Redis

# Start application
CMD ["./startup.sh"]
