import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller';

const router = Router();
const whatsappController = new WhatsAppController();

/**
 * @openapi
 * /api/whatsapp/initialize:
 *   post:
 *     tags:
 *       - WhatsApp
 *     summary: Initialize WhatsApp connection
 *     description: Start the WhatsApp connection process and generate QR code
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Initialization started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Initialization error
 */
router.post('/initialize', whatsappController.initialize.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/disconnect:
 *   post:
 *     tags:
 *       - WhatsApp
 *     summary: Disconnect WhatsApp
 *     description: Close the current WhatsApp connection
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Disconnect error
 */
router.post('/disconnect', whatsappController.disconnect.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/reconnect:
 *   post:
 *     tags:
 *       - WhatsApp
 *     summary: Reconnect WhatsApp
 *     description: Disconnect and reinitialize WhatsApp connection
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reconnection started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Reconnection error
 */
router.post('/reconnect', whatsappController.reconnect.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/status:
 *   get:
 *     tags:
 *       - WhatsApp
 *     summary: Get WhatsApp connection status
 *     description: Check if WhatsApp is connected and get QR code if not connected
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WhatsAppStatus'
 *       500:
 *         description: Status check error
 */
router.get('/status', whatsappController.getStatus.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/qrcode:
 *   get:
 *     tags:
 *       - WhatsApp
 *     summary: Get QR code for authentication
 *     description: Get the QR code to scan with WhatsApp mobile app
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR code available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                 qrCode:
 *                   type: string
 *                   nullable: true
 *                   description: Base64 encoded QR code image
 *                 phone:
 *                   type: string
 *                   nullable: true
 *       202:
 *         description: QR code is being generated
 *       500:
 *         description: QR code generation error
 */
router.get('/qrcode', whatsappController.getQrCode.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/webhook:
 *   post:
 *     tags:
 *       - WhatsApp
 *     summary: Webhook receiver for WPPConnect-Server events
 *     description: Internal endpoint used by WPPConnect-Server to deliver inbound events/messages
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 */
router.post('/webhook', whatsappController.webhook.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/send-message:
 *   post:
 *     tags:
 *       - WhatsApp
 *     summary: Send WhatsApp message
 *     description: Send a text message via WhatsApp
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - message
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number with country code
 *                 example: "5511987654321"
 *               message:
 *                 type: string
 *                 description: Message text to send
 *                 example: "Olá! Seu chamado foi atualizado."
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Send error
 */
router.post('/send-message', whatsappController.sendMessage.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/send-image:
 *   post:
 *     tags:
 *       - WhatsApp
 *     summary: Send WhatsApp image
 *     description: Send an image via WhatsApp (not yet implemented)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Not implemented
 */
router.post('/send-image', whatsappController.sendImage.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/message-history:
 *   get:
 *     tags:
 *       - WhatsApp
 *     summary: Get message history
 *     description: Get WhatsApp message history for a call or phone number
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: callId
 *         schema:
 *           type: integer
 *         description: Filter by call ID
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Filter by phone number
 *     responses:
 *       200:
 *         description: Message history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       callId:
 *                         type: integer
 *                         nullable: true
 *                       userId:
 *                         type: integer
 *                         nullable: true
 *                       phone:
 *                         type: string
 *                       message:
 *                         type: string
 *                       messageType:
 *                         type: string
 *                       isFromUser:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get('/message-history', whatsappController.getMessageHistory.bind(whatsappController));

// ========================================
// Multi-Session Management Routes
// ========================================

/**
 * @openapi
 * /api/whatsapp/sessions:
 *   get:
 *     tags:
 *       - WhatsApp Sessions
 *     summary: List all WhatsApp sessions
 *     description: Get a list of all active WhatsApp sessions with their status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [CONNECTED, DISCONNECTED, QR_CODE, STARTING, UNKNOWN]
 *                       phone:
 *                         type: string
 *                         nullable: true
 *                 defaultSession:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.get('/sessions', whatsappController.listSessions.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/sessions:
 *   post:
 *     tags:
 *       - WhatsApp Sessions
 *     summary: Create a new WhatsApp session
 *     description: Create a new session that can connect to a different WhatsApp account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique session name (alphanumeric, hyphens, underscores)
 *                 example: "support-line"
 *     responses:
 *       200:
 *         description: Session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 session:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *                     phone:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid session name
 *       500:
 *         description: Server error
 */
router.post('/sessions', whatsappController.createSession.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/sessions/{session}:
 *   get:
 *     tags:
 *       - WhatsApp Sessions
 *     summary: Get session info
 *     description: Get detailed information about a specific session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: session
 *         required: true
 *         schema:
 *           type: string
 *         description: Session name
 *     responses:
 *       200:
 *         description: Session info
 *       400:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
router.get('/sessions/:session', whatsappController.getSessionInfo.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/sessions/{session}:
 *   delete:
 *     tags:
 *       - WhatsApp Sessions
 *     summary: Delete a session
 *     description: Close and remove a WhatsApp session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: session
 *         required: true
 *         schema:
 *           type: string
 *         description: Session name to delete
 *     responses:
 *       200:
 *         description: Session deleted
 *       400:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
router.delete('/sessions/:session', whatsappController.deleteSession.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/sessions/{session}/qrcode:
 *   get:
 *     tags:
 *       - WhatsApp Sessions
 *     summary: Get QR code for session
 *     description: Get the QR code to authenticate a specific session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: session
 *         required: true
 *         schema:
 *           type: string
 *         description: Session name
 *     responses:
 *       200:
 *         description: QR code available
 *       202:
 *         description: QR code is being generated
 *       500:
 *         description: Server error
 */
router.get('/sessions/:session/qrcode', whatsappController.getSessionQrCode.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/sessions/{session}/status:
 *   get:
 *     tags:
 *       - WhatsApp Sessions
 *     summary: Get session status
 *     description: Get the connection status of a specific session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: session
 *         required: true
 *         schema:
 *           type: string
 *         description: Session name
 *     responses:
 *       200:
 *         description: Session status
 *       500:
 *         description: Server error
 */
router.get('/sessions/:session/status', whatsappController.getSessionStatus.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/sessions/{session}/initialize:
 *   post:
 *     tags:
 *       - WhatsApp Sessions
 *     summary: Initialize session
 *     description: Start the initialization process for a specific session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: session
 *         required: true
 *         schema:
 *           type: string
 *         description: Session name
 *     responses:
 *       200:
 *         description: Initialization started
 *       500:
 *         description: Server error
 */
router.post('/sessions/:session/initialize', whatsappController.initializeSession.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/sessions/{session}/disconnect:
 *   post:
 *     tags:
 *       - WhatsApp Sessions
 *     summary: Disconnect session
 *     description: Disconnect a specific WhatsApp session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: session
 *         required: true
 *         schema:
 *           type: string
 *         description: Session name
 *     responses:
 *       200:
 *         description: Session disconnected
 *       500:
 *         description: Server error
 */
router.post('/sessions/:session/disconnect', whatsappController.disconnectSession.bind(whatsappController));

/**
 * @openapi
 * /api/whatsapp/sessions/{session}/send-message:
 *   post:
 *     tags:
 *       - WhatsApp Sessions
 *     summary: Send message via session
 *     description: Send a message through a specific WhatsApp session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: session
 *         required: true
 *         schema:
 *           type: string
 *         description: Session name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - message
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "5511987654321"
 *               message:
 *                 type: string
 *                 example: "Hello from session!"
 *     responses:
 *       200:
 *         description: Message sent
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/sessions/:session/send-message', whatsappController.sendMessageViaSession.bind(whatsappController));

export default router;
