"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const call_controller_1 = require("../controllers/call.controller");
const call_status_history_controller_1 = require("../controllers/call-status-history.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
// Todas as rotas de chamados requerem autenticação
router.use(auth_middleware_1.authMiddleware);
// Listar todos os chamados
router.get('/', call_controller_1.CallController.listAllCalls);
// Obter estatísticas dos chamados
router.get('/statistics', call_controller_1.CallController.getCallStatistics);
// Obter um chamado específico
router.get('/:id', call_controller_1.CallController.getCallById);
// Obter histórico de status de um chamado
router.get('/:callId/status-history', call_status_history_controller_1.CallStatusHistoryController.getCallStatusHistory);
// Criar um novo chamado
router.post('/', upload_middleware_1.upload, upload_middleware_1.processUploadedFiles, call_controller_1.CallController.createCall);
// Atualizar um chamado
router.put('/:id', upload_middleware_1.upload, upload_middleware_1.processUploadedFiles, call_controller_1.CallController.updateCall);
// Deletar um chamado
router.delete('/:id', call_controller_1.CallController.deleteCall);
// Deletar uma imagem de um chamado
router.delete('/:callId/images/:imageId', call_controller_1.CallController.deleteCallImage);
exports.default = router;
