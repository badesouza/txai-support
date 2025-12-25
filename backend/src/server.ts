// backend/src/server.ts

// CRITICAL: This MUST be the first import to enable OpenTelemetry instrumentation
import './tracing';

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import process from 'process';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { wppConnectDirectService } from './services/wppconnect-direct.service';
import { storage } from './storage/storage';
import { swaggerSpec } from './config/swagger';
import { initializeFirebase, getFirestore } from './lib/firebase';

const app = express();
const port = process.env.PORT || 3001;
const whatsappEnabled = String(process.env.WHATSAPP_ENABLED ?? 'true').toLowerCase() !== 'false';

// 1) Configurar CORS (sem reverse proxy no compose)
const defaultCorsOrigins = ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000'];
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
const uploadsPath = storage.uploadsDir;

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

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
    },
  })
);

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

// 7) Initialize Firebase and start server
async function startServer() {
  try {
    // Initialize Firebase
    initializeFirebase();
    const db = getFirestore();
    
    // Basic Firestore connection check (read-only)
    await db.collection('_health').doc('check').get();
    console.log('✅ Firestore ready');

    // Start WPPConnect Direct Service (optional, async, don't wait)
    if (whatsappEnabled) {
      wppConnectDirectService.initialize()
        .then(() => {
          console.log('✅ WPPConnect Direct Service started');
        })
        .catch((error) => {
          console.error('❌ Failed to start WPPConnect Direct Service:', error);
        });
    } else {
      console.log('ℹ️ WhatsApp disabled (WHATSAPP_ENABLED=false)');
    }

    app.listen(port, () => {
      console.log(`🚀 Server rodando em http://localhost:${port}`);
    });
  } catch (err) {
    console.error('❌ Falha ao iniciar servidor:', err);
    process.exit(1);
  }
}

startServer();
