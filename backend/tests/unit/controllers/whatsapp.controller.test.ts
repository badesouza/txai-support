import { Request, Response } from 'express';
import { WhatsAppController } from '../../../src/controllers/whatsapp.controller';
import { whatsappService } from '../../../src/services/whatsapp.service';
import { WhatsAppMessageService } from '../../../src/services/whatsapp-message.service';

// Mocks
jest.mock('../../../src/services/whatsapp.service');
jest.mock('../../../src/services/whatsapp-message.service');

const mockWhatsappService = whatsappService as jest.Mocked<typeof whatsappService>;
const mockWhatsAppMessageService = WhatsAppMessageService as jest.Mocked<typeof WhatsAppMessageService>;

describe('WhatsAppController', () => {
  let controller: WhatsAppController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    controller = new WhatsAppController();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize WhatsApp session successfully', async () => {
      mockWhatsappService.startSession.mockResolvedValue();

      await controller.initialize(mockRequest as Request, mockResponse as Response);

      expect(mockWhatsappService.startSession).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'WhatsApp initialization requested',
      });
    });

    it('should handle initialization error', async () => {
      const error = new Error('Initialization failed');
      mockWhatsappService.startSession.mockRejectedValue(error);

      await controller.initialize(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Error initializing WhatsApp',
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect WhatsApp successfully', async () => {
      mockWhatsappService.closeSession.mockResolvedValue();

      await controller.disconnect(mockRequest as Request, mockResponse as Response);

      expect(mockWhatsappService.closeSession).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        message: 'WhatsApp disconnected successfully',
      });
    });

    it('should handle disconnect error gracefully', async () => {
      const error = new Error('Disconnect failed');
      mockWhatsappService.closeSession.mockRejectedValue(error);

      await controller.disconnect(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        message: 'WhatsApp disconnected successfully (forced)',
      });
    });
  });

  describe('reconnect', () => {
    it('should reconnect successfully when start session succeeds', async () => {
      mockWhatsappService.closeSession.mockResolvedValue();
      mockWhatsappService.startSession.mockResolvedValue();

      await controller.reconnect(mockRequest as Request, mockResponse as Response);

      expect(mockWhatsappService.closeSession).toHaveBeenCalled();
      expect(mockWhatsappService.startSession).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'WhatsApp reconnection requested',
      });
    });

    it('should handle start session failure gracefully', async () => {
      mockWhatsappService.closeSession.mockResolvedValue();
      mockWhatsappService.startSession.mockRejectedValue(new Error('Start failed'));

      await controller.reconnect(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(202);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Session start requested',
        note: 'Await QR/status',
      });
    });

    it('should handle overall reconnect error', async () => {
      const error = new Error('Reconnect failed');
      mockWhatsappService.closeSession.mockRejectedValue(error);

      await controller.reconnect(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Error reconnecting WhatsApp',
      });
    });
  });

  describe('getStatus', () => {
    it('should return WhatsApp status successfully', async () => {
      const mockStatus = {
        connected: true,
        qrCode: null,
        phone: '5511999999999',
      };
      mockWhatsappService.getStatus.mockResolvedValue(mockStatus);

      await controller.getStatus(mockRequest as Request, mockResponse as Response);

      expect(mockWhatsappService.getStatus).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(mockStatus);
    });

    it('should use cache for rapid polling', async () => {
      const mockStatus = {
        connected: false,
        qrCode: 'data:image/png;base64,test',
        phone: null,
      };
      mockWhatsappService.getStatus.mockResolvedValue(mockStatus);

      // First call
      await controller.getStatus(mockRequest as Request, mockResponse as Response);
      expect(mockWhatsappService.getStatus).toHaveBeenCalledTimes(1);

      // Second call within cache duration should use cache
      await controller.getStatus(mockRequest as Request, mockResponse as Response);
      expect(mockWhatsappService.getStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle status error', async () => {
      const error = new Error('Status check failed');
      mockWhatsappService.getStatus.mockRejectedValue(error);

      await controller.getStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Error getting WhatsApp status',
      });
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      mockRequest.body = {
        phone: '5511999999999',
        message: 'Test message',
      };
      const mockResult = { success: true, messageId: '123' };
      mockWhatsappService.sendMessage.mockResolvedValue(mockResult);

      await controller.sendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '5511999999999',
        'Test message'
      );
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return 400 when phone is missing', async () => {
      mockRequest.body = {
        message: 'Test message',
      };

      await controller.sendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Phone and message are required',
      });
    });

    it('should return 400 when message is missing', async () => {
      mockRequest.body = {
        phone: '5511999999999',
      };

      await controller.sendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Phone and message are required',
      });
    });

    it('should handle send message error', async () => {
      mockRequest.body = {
        phone: '5511999999999',
        message: 'Test message',
      };
      const error = new Error('Send failed');
      mockWhatsappService.sendMessage.mockRejectedValue(error);

      await controller.sendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Error sending message',
      });
    });
  });

  describe('sendImage', () => {
    it('should return not implemented', async () => {
      await controller.sendImage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(501);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Not implemented',
      });
    });
  });

  describe('webhook', () => {
    it('should process text message webhook successfully', async () => {
      mockRequest.body = {
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

      await controller.webhook(mockRequest as Request, mockResponse as Response);

      expect(mockWhatsAppMessageService.processIncomingMessage).toHaveBeenCalledWith({
        phone: '5511999999999',
        message: 'novo chamado',
        messageType: 'text',
        timestamp: 1640995200,
      });
      expect(mockJson).toHaveBeenCalledWith({
        status: 'received',
      });
    });

    it('should ignore non-text messages', async () => {
      mockRequest.body = {
        event: 'messages.upsert',
        data: {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
          },
          message: {
            imageMessage: {
              caption: 'Image message',
            },
          },
        },
      };

      await controller.webhook(mockRequest as Request, mockResponse as Response);

      expect(mockWhatsAppMessageService.processIncomingMessage).not.toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        status: 'received',
      });
    });

    it('should ignore non-message events', async () => {
      mockRequest.body = {
        event: 'connection.update',
        data: {
          state: 'CONNECTED',
        },
      };

      await controller.webhook(mockRequest as Request, mockResponse as Response);

      expect(mockWhatsAppMessageService.processIncomingMessage).not.toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        status: 'received',
      });
    });

    it('should handle webhook processing errors gracefully', async () => {
      mockRequest.body = {
        event: 'messages.upsert',
        data: {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
          },
          message: {
            conversation: 'test message',
          },
        },
      };
      mockWhatsAppMessageService.processIncomingMessage.mockRejectedValue(
        new Error('Processing failed')
      );

      await controller.webhook(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        status: 'received',
      });
    });

    it('should handle webhook errors', async () => {
      mockRequest.body = null;
      const error = new Error('Invalid webhook data');

      await controller.webhook(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Webhook processing error',
      });
    });
  });

  describe('getMessageHistory', () => {
    it('should get message history by callId', async () => {
      mockRequest.query = { callId: '1' };
      const mockMessages = [
        { id: 1, callId: 1, message: 'Test message' },
      ];
      mockWhatsAppMessageService.getCallMessageHistory.mockResolvedValue(mockMessages as any);

      await controller.getMessageHistory(mockRequest as Request, mockResponse as Response);

      expect(mockWhatsAppMessageService.getCallMessageHistory).toHaveBeenCalledWith(1);
      expect(mockJson).toHaveBeenCalledWith({
        messages: mockMessages,
      });
    });

    it('should get message history by phone', async () => {
      mockRequest.query = { phone: '5511999999999' };
      const mockMessages = [
        { id: 1, phone: '5511999999999', message: 'Test message' },
      ];
      mockWhatsAppMessageService.getPhoneMessageHistory.mockResolvedValue(mockMessages as any);

      await controller.getMessageHistory(mockRequest as Request, mockResponse as Response);

      expect(mockWhatsAppMessageService.getPhoneMessageHistory).toHaveBeenCalledWith('5511999999999');
      expect(mockJson).toHaveBeenCalledWith({
        messages: mockMessages,
      });
    });

    it('should return 400 when neither callId nor phone provided', async () => {
      mockRequest.query = {};

      await controller.getMessageHistory(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'callId or phone parameter required',
      });
    });

    it('should handle message history error', async () => {
      mockRequest.query = { callId: '1' };
      const error = new Error('History fetch failed');
      mockWhatsAppMessageService.getCallMessageHistory.mockRejectedValue(error);

      await controller.getMessageHistory(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Error getting message history',
      });
    });
  });
});
