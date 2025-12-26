import { Router } from 'express';
import { CallController } from '../controllers/call.controller';
import { CallStatusHistoryController } from '../controllers/call-status-history.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload, processUploadedFiles } from '../middleware/upload.middleware';

const router = Router();

// Todas as rotas de chamados requerem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /api/calls:
 *   get:
 *     tags:
 *       - Calls
 *     summary: List all calls
 *     description: Get a paginated list of all support calls
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering calls
 *     responses:
 *       200:
 *         description: List of calls
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calls:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Call'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', CallController.listAllCalls);

/**
 * @openapi
 * /api/calls/statistics:
 *   get:
 *     tags:
 *       - Calls
 *     summary: Get call statistics
 *     description: Get aggregated statistics about support calls
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Call statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of calls
 *                 open:
 *                   type: integer
 *                   description: Number of open calls
 *                 inProgress:
 *                   type: integer
 *                   description: Number of calls in progress
 *                 closed:
 *                   type: integer
 *                   description: Number of closed calls
 *                 byPriority:
 *                   type: object
 *                   properties:
 *                     high:
 *                       type: integer
 *                     medium:
 *                       type: integer
 *                     low:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/statistics', CallController.getCallStatistics);

/**
 * @openapi
 * /api/calls/{id}:
 *   get:
 *     tags:
 *       - Calls
 *     summary: Get call by ID
 *     description: Retrieve a specific support call by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Call ID
 *     responses:
 *       200:
 *         description: Call details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Call'
 *       404:
 *         description: Call not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', CallController.getCallById);

/**
 * @openapi
 * /api/calls/{callId}/status-history:
 *   get:
 *     tags:
 *       - Calls
 *     summary: Get call status history
 *     description: Get the complete status change history for a call
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Call ID
 *     responses:
 *       200:
 *         description: Status history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   callId:
 *                     type: integer
 *                   oldStatus:
 *                     type: string
 *                   newStatus:
 *                     type: string
 *                   userId:
 *                     type: integer
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: Call not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:callId/status-history', CallStatusHistoryController.getCallStatusHistory);

/**
 * @openapi
 * /api/calls:
 *   post:
 *     tags:
 *       - Calls
 *     summary: Create a new call
 *     description: Create a new support call with optional image attachments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - priority
 *             properties:
 *               title:
 *                 type: string
 *                 description: Call title/location
 *                 example: "Sala 101 - Ar condicionado"
 *               description:
 *                 type: string
 *                 description: Detailed description of the issue
 *                 example: "O ar condicionado não está ligando"
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *                 description: Call priority level
 *                 example: "HIGH"
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, CLOSED]
 *                 description: Initial status (defaults to OPEN)
 *                 example: "OPEN"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image attachments (max 5 files)
 *     responses:
 *       201:
 *         description: Call created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Call'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', upload, processUploadedFiles, CallController.createCall);

/**
 * @openapi
 * /api/calls/{id}:
 *   put:
 *     tags:
 *       - Calls
 *     summary: Update a call
 *     description: Update an existing support call
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Call ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, CLOSED]
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Additional image attachments
 *     responses:
 *       200:
 *         description: Call updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Call'
 *       404:
 *         description: Call not found
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', upload, processUploadedFiles, CallController.updateCall);

/**
 * @openapi
 * /api/calls/{id}:
 *   delete:
 *     tags:
 *       - Calls
 *     summary: Delete a call
 *     description: Permanently delete a support call and all associated data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Call ID
 *     responses:
 *       200:
 *         description: Call deleted successfully
 *       404:
 *         description: Call not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', CallController.deleteCall);

/**
 * @openapi
 * /api/calls/{callId}/images/{imageId}:
 *   delete:
 *     tags:
 *       - Calls
 *     summary: Delete a call image (legacy)
 *     description: Delete a specific image attachment from a call (legacy endpoint)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call ID
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       404:
 *         description: Call or image not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:callId/images/:imageId', CallController.deleteCallImage);

/**
 * @openapi
 * /api/calls/{callId}/attachments/{attachmentId}:
 *   delete:
 *     tags:
 *       - Calls
 *     summary: Delete a call attachment
 *     description: Delete a specific attachment from a call (from subcollection)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call ID
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Attachment ID
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
 *       404:
 *         description: Call or attachment not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:callId/attachments/:attachmentId', CallController.deleteCallAttachment);

export default router;
