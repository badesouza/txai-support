import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Configurar CORS
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

// Rotas
app.use('/api', routes);

// Middleware de tratamento de erros
app.use(errorHandler);

export default app;
