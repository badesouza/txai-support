import { WhatsAppMessageService } from '../../../src/services/whatsapp-message.service';
import { WhatsAppMessageModel } from '../../../src/models/WhatsAppMessage';
import { whatsappService } from '../../../src/services/whatsapp.service';
import { prisma } from '../../../src/lib/prisma';

// Mocks
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
    call: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../../src/models/WhatsAppMessage');
jest.mock('../../../src/services/whatsapp.service');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockWhatsAppMessageModel = WhatsAppMessageModel as jest.Mocked<typeof WhatsAppMessageModel>;
const mockWhatsappService = whatsappService as jest.Mocked<typeof whatsappService>;

describe('WhatsAppMessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processIncomingMessage', () => {
    const mockWebhookMessage = {
      phone: '5511999999999',
      message: 'novo chamado',
      messageType: 'text',
      timestamp: 1640995200,
    };

    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      phone: '5511999999999',
      profile: 'USER',
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should process new call request successfully', async () => {
      const mockCall = {
        id: 1,
        title: 'Chamado via WhatsApp - 5511999999999',
        description: 'Mensagem: novo chamado',
        status: 'OPEN',
        priority: 'MEDIUM',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockPrisma.call.create.mockResolvedValue(mockCall as any);
      mockWhatsappService.sendMessage.mockResolvedValue({});
      mockWhatsAppMessageModel.create.mockResolvedValue({} as any);

      await WhatsAppMessageService.processIncomingMessage(mockWebhookMessage);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { phone: '5511999999999' },
            { phone: '5511999999999' },
            { phone: '+5511999999999' },
            { phone: '55551199999999' },
          ],
        },
      });

      expect(mockPrisma.call.create).toHaveBeenCalledWith({
        data: {
          title: 'Chamado via WhatsApp - 5511999999999',
          description: 'Mensagem: novo chamado',
          status: 'OPEN',
          priority: 'MEDIUM',
          userId: 1,
        },
      });

      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '5511999999999',
        'Chamado criado com sucesso! Número do chamado: #1'
      );

      expect(mockWhatsAppMessageModel.create).toHaveBeenCalledWith({
        phone: '5511999999999',
        message: 'novo chamado',
        messageType: 'text',
        userId: 1,
        isFromUser: true,
      });
    });

    it('should not process message when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await WhatsAppMessageService.processIncomingMessage(mockWebhookMessage);

      expect(mockPrisma.user.findFirst).toHaveBeenCalled();
      expect(mockPrisma.call.create).not.toHaveBeenCalled();
      expect(mockWhatsappService.sendMessage).not.toHaveBeenCalled();
      expect(mockWhatsAppMessageModel.create).not.toHaveBeenCalled();
    });

    it('should add message to active call when not a new call request', async () => {
      const mockActiveCall = {
        id: 1,
        title: 'Existing Call',
        description: 'Previous messages',
        status: 'OPEN',
        priority: 'MEDIUM',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockWebhookMessageNormal = {
        phone: '5511999999999',
        message: 'Esta é uma mensagem normal',
        messageType: 'text',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockPrisma.call.findFirst.mockResolvedValue(mockActiveCall as any);
      mockPrisma.call.update.mockResolvedValue({} as any);
      mockWhatsAppMessageModel.create.mockResolvedValue({} as any);

      await WhatsAppMessageService.processIncomingMessage(mockWebhookMessageNormal);

      expect(mockPrisma.call.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 1,
          status: {
            in: ['OPEN', 'IN_PROGRESS'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(mockPrisma.call.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          description: expect.stringContaining('Esta é uma mensagem normal'),
        },
      });

      expect(mockWhatsAppMessageModel.create).toHaveBeenCalledWith({
        phone: '5511999999999',
        message: 'Esta é uma mensagem normal',
        messageType: 'text',
        userId: 1,
        callId: 1,
        isFromUser: true,
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(
        WhatsAppMessageService.processIncomingMessage(mockWebhookMessage)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getCallMessageHistory', () => {
    it('should get message history for a call', async () => {
      const callId = 1;
      const mockMessages = [
        { id: 1, callId: 1, message: 'First message' },
        { id: 2, callId: 1, message: 'Second message' },
      ];

      mockWhatsAppMessageModel.findByCallId.mockResolvedValue(mockMessages as any);

      const result = await WhatsAppMessageService.getCallMessageHistory(callId);

      expect(mockWhatsAppMessageModel.findByCallId).toHaveBeenCalledWith(callId);
      expect(result).toEqual(mockMessages);
    });
  });

  describe('getPhoneMessageHistory', () => {
    it('should get message history for a phone number', async () => {
      const phone = '5511999999999';
      const limit = 5;
      const mockMessages = [
        { id: 1, phone, message: 'Latest message' },
      ];

      mockWhatsAppMessageModel.findByPhone.mockResolvedValue(mockMessages as any);

      const result = await WhatsAppMessageService.getPhoneMessageHistory(phone, limit);

      expect(mockWhatsAppMessageModel.findByPhone).toHaveBeenCalledWith(phone, limit);
      expect(result).toEqual(mockMessages);
    });

    it('should use default limit when not provided', async () => {
      const phone = '5511999999999';
      mockWhatsAppMessageModel.findByPhone.mockResolvedValue([]);

      await WhatsAppMessageService.getPhoneMessageHistory(phone);

      expect(mockWhatsAppMessageModel.findByPhone).toHaveBeenCalledWith(phone, 20);
    });
  });

  describe('checkForNewCallKeywords', () => {
    it('should detect new call keywords', () => {
      const keywords = [
        'novo',
        'NOVO',
        'novo chamado',
        'Novo Chamado',
        'novo ticket',
        'abrir chamado',
        'criar chamado',
      ];

      keywords.forEach(keyword => {
        const result = (WhatsAppMessageService as any).checkForNewCallKeywords(keyword);
        expect(result).toBe(true);
      });
    });

    it('should not detect non-keyword messages', () => {
      const nonKeywords = [
        'olá',
        'como está?',
        'preciso de ajuda',
        'obrigado',
        'tchau',
      ];

      nonKeywords.forEach(message => {
        const result = (WhatsAppMessageService as any).checkForNewCallKeywords(message);
        expect(result).toBe(false);
      });
    });
  });

  describe('findUserByPhone', () => {
    it('should find user with different phone formats', async () => {
      const phone = '5511999999999';
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);

      await (WhatsAppMessageService as any).findUserByPhone(phone);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { phone: '5511999999999' },
            { phone: '5511999999999' },
            { phone: '+5511999999999' },
            { phone: '55551199999999' },
          ],
        },
      });
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await (WhatsAppMessageService as any).findUserByPhone('99999999999');

      expect(result).toBeNull();
    });
  });
});
