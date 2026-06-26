import { Router } from 'express';
import { DepartamentoController } from '../controllers/departamento.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, DepartamentoController.listAll);
router.get('/:id', authMiddleware, DepartamentoController.getById);
router.post('/', authMiddleware, DepartamentoController.create);
router.put('/:id', authMiddleware, DepartamentoController.update);
router.delete('/:id', authMiddleware, DepartamentoController.delete);

export default router;
