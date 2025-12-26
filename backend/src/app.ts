import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Configurar CORS
// - Local (sem reverse proxy): frontend em http://localhost:8080 chama API em http://localhost:3001
// - Produção: configure via CORS_ORIGINS (CSV) ou CORS_ORIGIN (single)
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

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS bloqueado para origem: ${origin}`));
    },
    credentials: true,
  })
);

// Allow larger payloads (WPPConnect webhook may include base64 media data)
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '25mb' }));

// Rotas
app.use('/api', routes);

// Middleware de tratamento de erros
app.use(errorHandler);

export default app;
