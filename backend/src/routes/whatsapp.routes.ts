import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller';

const router = Router();
const whatsappController = new WhatsAppController();

router.post('/initialize', whatsappController.initialize.bind(whatsappController));
router.post('/disconnect', whatsappController.disconnect.bind(whatsappController));
router.post('/reconnect', whatsappController.reconnect.bind(whatsappController));
router.get('/status', whatsappController.getStatus.bind(whatsappController));
router.post('/send-message', whatsappController.sendMessage.bind(whatsappController));
router.post('/send-image', whatsappController.sendImage.bind(whatsappController));

export default router; 