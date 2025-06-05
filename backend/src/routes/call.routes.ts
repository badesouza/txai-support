import { Router } from 'express';
import { CallController } from '../controllers/call.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Call routes
router.get('/', CallController.index);
router.get('/:id', CallController.show);
router.post('/', upload.array('images', 5), CallController.store);
router.put('/:id', CallController.update);
router.delete('/:id', CallController.destroy);
router.delete('/:callId/images/:imageId', CallController.deleteImage);

export default router; 