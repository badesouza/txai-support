import { WhatsAppMessage as PrismaWhatsAppMessage } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface WhatsAppMessageAttributes {
  id: number;
  callId?: number;
  userId?: number;
  phone: string;
  message: string;
  messageType: string;
  isFromUser: boolean;
  createdAt?: Date;
}

export interface WhatsAppMessageCreationAttributes {
  callId?: number;
  userId?: number;
  phone: string;
  message: string;
  messageType?: string;
  isFromUser?: boolean;
}

export const WhatsAppMessageModel = {
  async create(messageData: WhatsAppMessageCreationAttributes): Promise<PrismaWhatsAppMessage> {
    return prisma.whatsAppMessage.create({
      data: {
        ...messageData,
        messageType: messageData.messageType || 'text',
        isFromUser: messageData.isFromUser !== undefined ? messageData.isFromUser : true,
      },
    });
  },

  async findById(id: number): Promise<PrismaWhatsAppMessage | null> {
    return prisma.whatsAppMessage.findUnique({
      where: { id },
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
  },

  async findByCallId(callId: number): Promise<PrismaWhatsAppMessage[]> {
    return prisma.whatsAppMessage.findMany({
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
  },

  async findByPhone(phone: string, limit = 10): Promise<PrismaWhatsAppMessage[]> {
    return prisma.whatsAppMessage.findMany({
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
  },

  async findAll(): Promise<PrismaWhatsAppMessage[]> {
    return prisma.whatsAppMessage.findMany({
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
  },

  async delete(id: number): Promise<boolean> {
    try {
      await prisma.whatsAppMessage.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  },
};
