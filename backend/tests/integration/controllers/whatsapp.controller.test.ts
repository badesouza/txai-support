import request from 'supertest';
import app from '../../../src/app';
import { prisma } from '../../../src/lib/prisma';
import { whatsappService } from '../../../src/services/whatsapp.service';
import { WhatsAppMessageService } from '../../../src/services/whatsapp-message.service';

// Mocks
jest.mock('../../../src/services/whatsapp.service');
jest.mock('../../../src/services/whatsapp-message.service');

const mockWhatsappService = whatsappService as jest.Mocked<typeof whatsappService>;
const mockWhatsAppMessageService = WhatsAppMessageService as jest.Mocked<typeof WhatsAppMessageService>;

describe('WhatsApp Integration Tests', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        name: 'Test User WhatsApp',
        email: 'whatsapp-test@example.com',
        password: 'hashedpassword',
        phone: '5511999999999',
        profile: 'USER',
      },
    });

    // Generate auth token
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: 'whatsapp-test@example.com',
        password: 'hashedpassword',
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.whatsAppMessage.deleteMany();
    await prisma.call.deleteMany();
    await prisma.user.deleteMany();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/whatsapp/webhook', () => {
    it('should process new call webhook successfully', async () => {
      const webhookPayload = {
        event: 'messages.upsert',
        data: {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
          },
          message: {
            conversation: 'novo chamado',
          },
          messageTimestamp: 1640995200,
        },
      };

      mockWhatsAppMessageService.processIncomingMessage.mockResolvedValue();

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'received' });
      expect(mockWhatsAppMessageService.processIncomingMessage).toHaveBeenCalledWith({
        phone: '5511999999999',
        message: 'novo chamado',
        messageType: 'text',
        timestamp: 1640995200,
      });
    });

    it('should ignore non-text messages', async () => {
      const webhookPayload = {
        event: 'messages.upsert',
        data: {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
          },
          message: {
            imageMessage: {
              caption: 'Image caption',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'received' });
      expect(mockWhatsAppMessageService.processIncomingMessage).not.toHaveBeenCalled();
    });

    it('should handle webhook errors gracefully', async () => {
      const invalidPayload = {
        event: 'invalid',
        data: null,
      };

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send(invalidPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'received' });
    });
  });

  describe('GET /api/whatsapp/status', () => {
    it('should return WhatsApp status', async () => {
      const mockStatus = {
        connected: true,
        qrCode: null,
        phone: '5511999999999',
      };
      mockWhatsappService.getStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/whatsapp/status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStatus);
    });

    it('should handle status service errors', async () => {
      mockWhatsappService.getStatus.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/whatsapp/status');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Error getting WhatsApp status',
      });
    });
  });

  describe('POST /api/whatsapp/send-message', () => {
    it('should send message successfully', async () => {
      const messageData = {
        phone: '5511999999999',
        message: 'Test message',
      };
      const mockResult = { success: true, messageId: '123' };
      mockWhatsappService.sendMessage.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/whatsapp/send-message')
        .send(messageData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockResult,
      });
      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '5511999999999',
        'Test message'
      );
    });

    it('should return 400 for missing phone', async () => {
      const messageData = {
        message: 'Test message',
      };

      const response = await request(app)
        .post('/api/whatsapp/send-message')
        .send(messageData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Phone and message are required',
      });
    });

    it('should return 400 for missing message', async () => {
      const messageData = {
        phone: '5511999999999',
      };

      const response = await request(app)
        .post('/api/whatsapp/send-message')
        .send(messageData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Phone and message are required',
      });
    });

    it('should handle send message service errors', async () => {
      const messageData = {
        phone: '5511999999999',
        message: 'Test message',
      };
      mockWhatsappService.sendMessage.mockRejectedValue(new Error('Send failed'));

      const response = await request(app)
        .post('/api/whatsapp/send-message')
        .send(messageData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Error sending message',
      });
    });
  });

  describe('POST /api/whatsapp/initialize', () => {
    it('should initialize WhatsApp session', async () => {
      mockWhatsappService.startSession.mockResolvedValue();

      const response = await request(app)
        .post('/api/whatsapp/initialize');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'WhatsApp initialization requested',
      });
      expect(mockWhatsappService.startSession).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockWhatsappService.startSession.mockRejectedValue(new Error('Init failed'));

      const response = await request(app)
        .post('/api/whatsapp/initialize');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Error initializing WhatsApp',
      });
    });
  });

  describe('POST /api/whatsapp/disconnect', () => {
    it('should disconnect WhatsApp session', async () => {
      mockWhatsappService.closeSession.mockResolvedValue();

      const response = await request(app)
        .post('/api/whatsapp/disconnect');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'WhatsApp disconnected successfully',
      });
      expect(mockWhatsappService.closeSession).toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      mockWhatsappService.closeSession.mockRejectedValue(new Error('Disconnect failed'));

      const response = await request(app)
        .post('/api/whatsapp/disconnect');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'WhatsApp disconnected successfully (forced)',
      });
    });
  });

  describe('POST /api/whatsapp/reconnect', () => {
    it('should reconnect successfully when both operations succeed', async () => {
      mockWhatsappService.closeSession.mockResolvedValue();
      mockWhatsappService.startSession.mockResolvedValue();

      const response = await request(app)
        .post('/api/whatsapp/reconnect');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'WhatsApp reconnection requested',
      });
      expect(mockWhatsappService.closeSession).toHaveBeenCalled();
      expect(mockWhatsappService.startSession).toHaveBeenCalled();
    });

    it('should handle start session failure gracefully', async () => {
      mockWhatsappService.closeSession.mockResolvedValue();
      mockWhatsappService.startSession.mockRejectedValue(new Error('Start failed'));

      const response = await request(app)
        .post('/api/whatsapp/reconnect');

      expect(response.status).toBe(202);
      expect(response.body).toEqual({
        success: true,
        message: 'Session start requested',
        note: 'Await QR/status',
      });
    });

    it('should handle overall reconnect errors', async () => {
      mockWhatsappService.closeSession.mockRejectedValue(new Error('Close failed'));

      const response = await request(app)
        .post('/api/whatsapp/reconnect');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Error reconnecting WhatsApp',
      });
    });
  });

  describe('GET /api/whatsapp/message-history', () => {
    it('should get message history by callId with authentication', async () => {
      // Create a test call
      const testCall = await prisma.call.create({
        data: {
          title: 'Test Call',
          description: 'Test Description',
          status: 'OPEN',
          priority: 'MEDIUM',
          userId: testUser.id,
        },
      });

      // Create test messages
      await prisma.whatsAppMessage.createMany({
        data: [
          {
            phone: '5511999999999',
            message: 'First message',
            messageType: 'text',
            isFromUser: true,
            userId: testUser.id,
            callId: testCall.id,
          },
          {
            phone: '5511999999999',
            message: 'Second message',
            messageType: 'text',
            isFromUser: true,
            userId: testUser.id,
            callId: testCall.id,
          },
        ],
      });

      const response = await request(app)
        .get(`/api/whatsapp/message-history?callId=${testCall.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[0].message).toBe('First message');
      expect(response.body.messages[1].message).toBe('Second message');
    });

    it('should get message history by phone with authentication', async () => {
      const response = await request(app)
        .get('/api/whatsapp/message-history?phone=5511999999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    it('should return 400 when neither callId nor phone provided', async () => {
      const response = await request(app)
        .get('/api/whatsapp/message-history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'callId or phone parameter required',
      });
    });

    it('should require authentication for message history', async () => {
      const response = await request(app)
        .get('/api/whatsapp/message-history?callId=1');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'No token provided',
      });
    });
  });

  describe('POST /api/whatsapp/send-image', () => {
    it('should return not implemented', async () => {
      const response = await request(app)
        .post('/api/whatsapp/send-image')
        .send({ phone: '5511999999999', image: 'base64data' });

      expect(response.status).toBe(501);
      expect(response.body).toEqual({
        error: 'Not implemented',
      });
    });
  });
});