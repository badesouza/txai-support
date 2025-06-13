import { Router } from 'express';
import { CallController } from '../controllers/call.controller';
import { CallStatusHistoryController } from '../controllers/call-status-history.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload, processUploadedFiles } from '../middleware/upload.middleware';

const router = Router();

// Todas as rotas de chamados requerem autenticação
router.use(authMiddleware);

// Listar todos os chamados
router.get('/', CallController.listAllCalls);

// Obter um chamado específico
router.get('/:id', CallController.getCallById);

// Obter histórico de status de um chamado
router.get('/:callId/status-history', CallStatusHistoryController.getCallStatusHistory);

// Criar um novo chamado
router.post('/', upload, processUploadedFiles, CallController.createCall);

// Atualizar um chamado
router.put('/:id', upload, processUploadedFiles, CallController.updateCall);

// Deletar um chamado
router.delete('/:id', CallController.deleteCall);

export default router; 