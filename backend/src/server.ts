// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import process from 'process';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { wppConnectDirectService } from './services/wppconnect-direct.service';
import { storage } from './storage/storage';
import { swaggerSpec } from './config/swagger';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

// 1) Configurar CORS (sem reverse proxy no compose)
const defaultCorsOrigins = ['http://localhost:8080', 'http://localhost:3000'];
const corsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = corsOrigins.length > 0
  ? corsOrigins
  : process.env.CORS_ORIGIN
    ? [process.env.CORS_ORIGIN]
    : defaultCorsOrigins;

const allowedOriginsSet = new Set(allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOriginsSet.has(origin)) return callback(null, true);
      return callback(new Error(`CORS bloqueado para origem: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

// Configurar o diretório de uploads
console.log('=== SERVER UPLOADS INFO ===');
console.log('__dirname:', __dirname);
console.log('Caminho atual:', process.cwd());

const uploadsPath = storage.uploadsDir;
console.log('Caminho da pasta uploads:', uploadsPath);

if (!fs.existsSync(uploadsPath)) {
  console.log('Criando diretório uploads...');
  fs.mkdirSync(uploadsPath, { recursive: true });
}

console.log('Configuração do uploads:', {
  __dirname,
  uploadsPath,
  exists: fs.existsSync(uploadsPath),
  isDirectory: fs.existsSync(uploadsPath) ? fs.statSync(uploadsPath).isDirectory() : false,
  permissions: fs.existsSync(uploadsPath) ? fs.statSync(uploadsPath).mode : 'N/A',
  files: fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath) : []
});

// 3) Servir arquivos estáticos de /uploads com melhor tratamento de erros
app.use(
  '/uploads',
  express.static(uploadsPath, {
    maxAge: '30d',
    setHeaders(res, filePath) {
      // Permitir CORS também nos assets
      const origin = res.req.headers.origin;
      if (origin && allowedOriginsSet.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      
      // Log para debug
      console.log('📁 Servindo arquivo:', filePath);
      console.log('📁 Arquivo existe:', fs.existsSync(filePath));
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log('📁 Tamanho do arquivo:', stats.size, 'bytes');
        console.log('📁 Permissões:', stats.mode);
      }
    },
  })
);

// Middleware para log de requisições de imagens
app.use('/uploads', (req, res, next) => {
  console.log('🖼️ Requisição de imagem:', req.url);
  console.log('🖼️ Caminho completo:', path.join(uploadsPath, req.url));
  console.log('🖼️ Arquivo existe:', fs.existsSync(path.join(uploadsPath, req.url)));
  next();
});

// 4) Montar documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TXAI Support API Documentation',
}));

// Servir OpenAPI JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 5) Montar rotas da API
app.use('/api', routes);

// 6) Middleware de tratamento de erro
app.use(errorHandler);

// 7) Conectar ao banco e iniciar o servidor
prisma.$connect()
  .then(async () => {
    console.log('✅ Conectado ao banco de dados');

    // Start WPPConnect Direct Service (async, don't wait)
    wppConnectDirectService.initialize()
      .then(() => {
        console.log('✅ WPPConnect Direct Service started');
      })
      .catch((error) => {
        console.error('❌ Failed to start WPPConnect Direct Service:', error);
      });

    app.listen(port, () => {
      console.log(`🚀 Server rodando em http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('❌ Falha ao conectar ao banco:', err);
  });
