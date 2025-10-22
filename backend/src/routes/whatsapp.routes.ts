import { Router, text } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller';

const router = Router();
const whatsappController = new WhatsAppController();

router.post('/initialize', whatsappController.initialize.bind(whatsappController));
router.post('/disconnect', whatsappController.disconnect.bind(whatsappController));
router.post('/reconnect', whatsappController.reconnect.bind(whatsappController));
router.get('/status', whatsappController.getStatus.bind(whatsappController));
router.get('/qrcode', whatsappController.getQrCode.bind(whatsappController));
router.post('/send-message', whatsappController.sendMessage.bind(whatsappController));
router.post('/send-image', whatsappController.sendImage.bind(whatsappController));

// Histórico de mensagens (com autenticação)
router.get('/message-history', whatsappController.getMessageHistory.bind(whatsappController));

// Webhook para WPPConnect container
// Webhook removido: integração direta dentro do backend

export default router; 