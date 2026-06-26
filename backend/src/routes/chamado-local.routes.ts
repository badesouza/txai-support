import { Router } from 'express';
import { ChamadoLocalController } from '../controllers/chamado-local.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, ChamadoLocalController.listAll);
router.get('/:id', authMiddleware, ChamadoLocalController.getById);
router.post('/', authMiddleware, ChamadoLocalController.create);
router.put('/:id', authMiddleware, ChamadoLocalController.update);
router.delete('/:id', authMiddleware, ChamadoLocalController.delete);

export default router;
