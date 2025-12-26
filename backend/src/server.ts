// backend/src/server.ts

// CRITICAL: This MUST be the first import to enable OpenTelemetry instrumentation
import './tracing';

import express from 'express';
import cors from 'cors';
import process from 'process';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { swaggerSpec } from './config/swagger';
import { initializeFirebase, getFirestore } from './lib/firebase';
import { whatsappService } from './services/whatsapp/whatsapp.service';
import { seed } from './scripts/seed';

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
// Allow larger payloads (WPPConnect webhook may include base64 media data)
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '25mb' }));

// Note: No local uploads directory needed
// All files are stored in GCS (configured via STORAGE_DRIVER=gcs)
// File URLs are generated via storage.getFileUrl() which returns GCS signed URLs

// 3) Montar documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TXAI Support API Documentation',
}));

// Servir OpenAPI JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 4) Montar rotas da API
app.use('/api', routes);

// 5) Middleware de tratamento de erro
app.use(errorHandler);

// 6) Initialize Firebase and start server
async function startServer() {
  try {
    // Initialize Firebase
    initializeFirebase();
    const db = getFirestore();
    
    // Basic Firestore connection check (read-only)
    await db.collection('_health').doc('check').get();
    console.log('✅ Firestore ready');

    // Auto-seed database in development mode (idempotent - safe to run multiple times)
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.NODE_ENV === 'development') {
      seed()
        .then(() => {
          console.log('✅ Database seeding completed');
        })
        .catch((error) => {
          console.warn('⚠️ Database seeding failed (non-critical):', error instanceof Error ? error.message : error);
        });
    }

    // Start WPPConnect Direct Service (optional, async, don't wait)
    if (whatsappEnabled) {
      whatsappService.initialize()
        .then(() => {
          console.log('✅ WhatsApp service started');
        })
        .catch((error) => {
          console.error('❌ Failed to start WhatsApp service:', error);
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
