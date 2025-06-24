import { Router } from 'express';
import userRoutes from './user.routes';
import callRoutes from './call.routes';
import whatsappRoutes from './whatsapp.routes';

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

export default router; 