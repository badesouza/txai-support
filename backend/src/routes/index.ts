import { Router } from 'express';
import userRoutes from './user.routes';
import callRoutes from './call.routes';
import whatsappRoutes from './whatsapp.routes';
import chamadoLocalRoutes from './chamado-local.routes';
import departamentoRoutes from './departamento.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

router.use('/users', userRoutes);
router.use('/calls', callRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/chamado-locais', chamadoLocalRoutes);
router.use('/departamentos', departamentoRoutes);

export default router; 