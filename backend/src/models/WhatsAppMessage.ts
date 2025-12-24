import { WhatsAppMessageRepository } from '../repositories';
import { WhatsAppMessage } from '../types/models';

// Re-export types for backward compatibility
export interface WhatsAppMessageAttributes {
  id: string;
  callId?: string;
  userId?: string;
  phone: string;
  message: string;
  messageType: string;
  isFromUser: boolean;
  createdAt?: Date;
}

export interface WhatsAppMessageCreationAttributes {
  callId?: string;
  userId?: string;
  phone: string;
  message: string;
  messageType?: string;
  isFromUser?: boolean;
}

// Facade for backward compatibility - delegates to repository
export const WhatsAppMessageModel = {
  async create(messageData: WhatsAppMessageCreationAttributes): Promise<WhatsAppMessage> {
    return WhatsAppMessageRepository.create({
      ...messageData,
      messageType: messageData.messageType || 'text',
      isFromUser: messageData.isFromUser !== undefined ? messageData.isFromUser : true,
    });
  },

  async findById(id: string): Promise<WhatsAppMessage | null> {
    return WhatsAppMessageRepository.findById(id);
  },

  async findByCallId(callId: string): Promise<WhatsAppMessage[]> {
    return WhatsAppMessageRepository.findByCallId(callId);
  },

  async findByPhone(phone: string, limit = 10): Promise<WhatsAppMessage[]> {
    return WhatsAppMessageRepository.findByPhone(phone, limit);
  },

  async findByUserId(userId: string, limit = 100): Promise<WhatsAppMessage[]> {
    return WhatsAppMessageRepository.findByUserId(userId, limit);
  },

  async delete(id: string): Promise<boolean> {
    return WhatsAppMessageRepository.delete(id);
  },
};
