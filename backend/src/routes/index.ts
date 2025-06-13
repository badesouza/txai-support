import { Router } from 'express';
import userRoutes from './user.routes';
import callRoutes from './call.routes';
import whatsappRoutes from './whatsapp.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/calls', callRoutes);
router.use('/whatsapp', whatsappRoutes);

export default router; 