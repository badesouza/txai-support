import { WhatsAppMessageModel } from '../../../src/models/WhatsAppMessage';
import { prisma } from '../../../src/lib/prisma';

// Mock do Prisma
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    whatsAppMessage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('WhatsAppMessageModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new WhatsApp message with default values', async () => {
      const messageData = {
        phone: '5511999999999',
        message: 'Test message',
        userId: 1,
        callId: 1,
      };

      const expectedMessage = {
        id: 1,
        phone: '5511999999999',
        message: 'Test message',
        messageType: 'text',
        isFromUser: true,
        userId: 1,
        callId: 1,
        createdAt: new Date(),
      };

      mockPrisma.whatsAppMessage.create.mockResolvedValue(expectedMessage as any);

      const result = await WhatsAppMessageModel.create(messageData);

      expect(mockPrisma.whatsAppMessage.create).toHaveBeenCalledWith({
        data: {
          ...messageData,
          messageType: 'text',
          isFromUser: true,
        },
      });
      expect(result).toEqual(expectedMessage);
    });

    it('should create a message with custom messageType and isFromUser', async () => {
      const messageData = {
        phone: '5511999999999',
        message: 'Test message',
        messageType: 'image',
        isFromUser: false,
        userId: 1,
      };

      const expectedMessage = {
        id: 1,
        ...messageData,
        createdAt: new Date(),
      };

      mockPrisma.whatsAppMessage.create.mockResolvedValue(expectedMessage as any);

      const result = await WhatsAppMessageModel.create(messageData);

      expect(mockPrisma.whatsAppMessage.create).toHaveBeenCalledWith({
        data: messageData,
      });
      expect(result).toEqual(expectedMessage);
    });
  });

  describe('findById', () => {
    it('should find a message by id with relations', async () => {
      const messageId = 1;
      const expectedMessage = {
        id: 1,
        phone: '5511999999999',
        message: 'Test message',
        messageType: 'text',
        isFromUser: true,
        userId: 1,
        callId: 1,
        call: { id: 1, title: 'Test Call' },
        user: { id: 1, name: 'Test User', email: 'test@example.com', phone: '5511999999999' },
      };

      mockPrisma.whatsAppMessage.findUnique.mockResolvedValue(expectedMessage as any);

      const result = await WhatsAppMessageModel.findById(messageId);

      expect(mockPrisma.whatsAppMessage.findUnique).toHaveBeenCalledWith({
        where: { id: messageId },
        include: {
          call: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });
      expect(result).toEqual(expectedMessage);
    });

    it('should return null when message not found', async () => {
      mockPrisma.whatsAppMessage.findUnique.mockResolvedValue(null);

      const result = await WhatsAppMessageModel.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByCallId', () => {
    it('should find messages by call id ordered by creation date', async () => {
      const callId = 1;
      const expectedMessages = [
        { id: 1, callId: 1, message: 'First message', createdAt: new Date('2023-01-01') },
        { id: 2, callId: 1, message: 'Second message', createdAt: new Date('2023-01-02') },
      ];

      mockPrisma.whatsAppMessage.findMany.mockResolvedValue(expectedMessages as any);

      const result = await WhatsAppMessageModel.findByCallId(callId);

      expect(mockPrisma.whatsAppMessage.findMany).toHaveBeenCalledWith({
        where: { callId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(expectedMessages);
    });
  });

  describe('findByPhone', () => {
    it('should find messages by phone with limit', async () => {
      const phone = '5511999999999';
      const limit = 5;
      const expectedMessages = [
        { id: 1, phone, message: 'Latest message', createdAt: new Date() },
      ];

      mockPrisma.whatsAppMessage.findMany.mockResolvedValue(expectedMessages as any);

      const result = await WhatsAppMessageModel.findByPhone(phone, limit);

      expect(mockPrisma.whatsAppMessage.findMany).toHaveBeenCalledWith({
        where: { phone },
        include: {
          call: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      expect(result).toEqual(expectedMessages);
    });

    it('should use default limit of 10 when not provided', async () => {
      const phone = '5511999999999';
      mockPrisma.whatsAppMessage.findMany.mockResolvedValue([]);

      await WhatsAppMessageModel.findByPhone(phone);

      expect(mockPrisma.whatsAppMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });

  describe('findAll', () => {
    it('should find all messages ordered by creation date', async () => {
      const expectedMessages = [
        { id: 1, message: 'Latest message', createdAt: new Date() },
        { id: 2, message: 'Older message', createdAt: new Date() },
      ];

      mockPrisma.whatsAppMessage.findMany.mockResolvedValue(expectedMessages as any);

      const result = await WhatsAppMessageModel.findAll();

      expect(mockPrisma.whatsAppMessage.findMany).toHaveBeenCalledWith({
        include: {
          call: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(expectedMessages);
    });
  });

  describe('delete', () => {
    it('should delete a message successfully', async () => {
      const messageId = 1;
      mockPrisma.whatsAppMessage.delete.mockResolvedValue({} as any);

      const result = await WhatsAppMessageModel.delete(messageId);

      expect(mockPrisma.whatsAppMessage.delete).toHaveBeenCalledWith({
        where: { id: messageId },
      });
      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      const messageId = 1;
      mockPrisma.whatsAppMessage.delete.mockRejectedValue(new Error('Delete failed'));

      const result = await WhatsAppMessageModel.delete(messageId);

      expect(result).toBe(false);
    });
  });
});
