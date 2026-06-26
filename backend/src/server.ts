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
import { initializeDatabase, checkDatabaseHealth } from './lib/db';
import { migrate } from './db/migrate';
import { whatsappService } from './services/whatsapp/whatsapp.service';
import { seed } from './scripts/seed';
import { uploadsConfig } from './storage/storage';

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

// Serve uploaded files from local disk storage
app.use(`/${uploadsConfig.prefix}`, express.static(uploadsConfig.dir));

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

// 6) Initialize PostgreSQL and start server
async function startServer() {
  try {
    initializeDatabase();
    await migrate();
    await checkDatabaseHealth();
    console.log('✅ PostgreSQL ready');

    if (process.env.SEED_ON_STARTUP !== 'false') {
      seed()
        .then(() => {
          console.log('✅ Database seeding completed');
        })
        .catch((error) => {
          console.warn('⚠️ Database seeding failed (non-critical):', error instanceof Error ? error.message : error);
        });
    }

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
