import { Router } from 'express';
import userRoutes from './user.routes';
import callRoutes from './call.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/calls', callRoutes);

export default router; 