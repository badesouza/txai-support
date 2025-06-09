import { Router } from 'express';
import { CallController } from '../controllers/call.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Todas as rotas de chamados requerem autenticação
router.use(authMiddleware);

// Listar todos os chamados
router.get('/', CallController.listAllCalls);

// Obter um chamado específico
router.get('/:id', CallController.getCallById);

// Criar um novo chamado
router.post('/', upload.array('images', 5), CallController.createCall);

// Atualizar um chamado
router.put('/:id', CallController.updateCall);

// Deletar um chamado
router.delete('/:id', CallController.deleteCall);

export default router; 