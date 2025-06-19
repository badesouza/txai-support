// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import process from 'process';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

// 1) Configurar CORS para permitir seu front
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://31.97.170.240',
    'http://31.97.170.240:3000',
    'http://31.97.170.240:80',
    'http://31.97.170.240:443'
  ],
  credentials: true,
}));
app.use(express.json());

// Configurar o diretório de uploads
console.log('=== SERVER UPLOADS INFO ===');
console.log('__dirname:', __dirname);
console.log('Caminho atual:', process.cwd());

const uploadsPath = path.join(process.cwd(), 'uploads');
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

// 3) Servir arquivos estáticos de /uploads
app.use(
  '/uploads',
  express.static(uploadsPath, {
    maxAge: '30d',
    setHeaders(res, filePath) {
      // Permitir CORS também nos assets
      const allowedOrigins = [
        'http://localhost:3000',
        'http://31.97.170.240',
        'http://31.97.170.240:3000',
        'http://31.97.170.240:80',
        'http://31.97.170.240:443'
      ];
      const origin = res.req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    },
  })
);

// 4) Montar rotas da API
app.use('/api', routes);

// 5) Middleware de tratamento de erro
app.use(errorHandler);

// 6) Conectar ao banco e iniciar o servidor
prisma.$connect()
  .then(() => {
    console.log('✅ Conectado ao banco de dados');
    app.listen(port, () => {
      console.log(`🚀 Server rodando em http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('❌ Falha ao conectar ao banco:', err);
  });
