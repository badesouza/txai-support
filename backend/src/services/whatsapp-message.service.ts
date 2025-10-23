import { prisma } from '../lib/prisma';
import { wppConnectDirectService } from './wppconnect-direct.service';
import { WhatsAppMessageModel } from '../models/WhatsAppMessage';

export interface WhatsAppWebhookMessage {
  phone: string;
  message: string;
  messageType?: string;
  timestamp?: number;
}

export class WhatsAppMessageService {
  /**
   * Processa uma mensagem recebida do WhatsApp
   */
  static async processIncomingMessage(webhookMessage: WhatsAppWebhookMessage) {
    console.log('📱 Processing WhatsApp message:', webhookMessage);
    
    try {
      // Passo 1: Verificar se o número do WhatsApp está na tabela user
      const user = await this.findUserByPhone(webhookMessage.phone);
      
      if (!user) {
        console.log('❌ User not found for phone:', webhookMessage.phone);
        return;
      }

      console.log('✅ User found:', user.name, user.email);

      // Passo 2: Verificar se a mensagem contém palavras-chave para novo chamado
      const isNewCallRequest = this.checkForNewCallKeywords(webhookMessage.message);
      
      if (isNewCallRequest) {
        // Passo 3: Criar novo chamado
        const call = await this.createCallFromWhatsApp(user.id, webhookMessage);
        
        // Responder com número do chamado
        await this.sendCallNumberResponse(webhookMessage.phone, call.id);
        
        console.log('✅ New call created:', call.id);
      } else {
        // Passo 4: Adicionar mensagem ao histórico do último chamado ativo
        await this.addMessageToActiveCall(user.id, webhookMessage);
      }

      // Message is already saved in wppconnect-direct.service.ts

      console.log('✅ Message processed successfully');
      
    } catch (error) {
      console.error('❌ Error processing WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Passo 1: Busca usuário pelo número de telefone
   */
  private static async findUserByPhone(phone: string) {
    // Normalizar o número de telefone (remover caracteres especiais)
    const normalizedPhone = phone.replace(/\D/g, '');
    
    return prisma.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          { phone: normalizedPhone },
          { phone: `+${normalizedPhone}` },
          { phone: `55${normalizedPhone}` }, // Brasil
        ]
      }
    });
  }

  /**
   * Passo 2: Verifica se a mensagem contém palavras-chave para novo chamado
   */
  private static checkForNewCallKeywords(message: string): boolean {
    const keywords = ['novo', 'novo chamado'];
    const lowerMessage = message.toLowerCase().trim();
    
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  /**
   * Passo 3: Cria um novo chamado a partir de uma mensagem do WhatsApp
   */
  private static async createCallFromWhatsApp(userId: number, webhookMessage: WhatsAppWebhookMessage) {
    const title = `Chamado via WhatsApp - ${webhookMessage.phone}`;
    const description = `Mensagem: ${webhookMessage.message}`;

    return prisma.call.create({
      data: {
        title,
        description,
        status: 'OPEN',
        priority: 'MEDIUM',
        userId,
      },
    });
  }

  /**
   * Envia resposta com o número do chamado
   */
  private static async sendCallNumberResponse(phone: string, callId: number) {
    try {
      const responseMessage = `Novo chamado de número #${callId}`;
      await wppConnectDirectService.sendMessage(phone, responseMessage);
      
      // Salvar mensagem de resposta no histórico
      await WhatsAppMessageModel.create({
        phone,
        message: responseMessage,
        messageType: 'text',
        callId,
        isFromUser: false,
      });
      
      console.log('✅ Call number response sent:', callId);
    } catch (error) {
      console.error('❌ Error sending call number response:', error);
    }
  }

  /**
   * Passo 4: Adiciona mensagem ao último chamado ativo do usuário
   */
  private static async addMessageToActiveCall(userId: number, webhookMessage: WhatsAppWebhookMessage) {
    try {
      // Buscar o último chamado ativo do usuário
      const activeCall = await prisma.call.findFirst({
        where: {
          userId,
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (activeCall) {
        // Atualizar descrição do chamado com a nova mensagem
        const updatedDescription = `${activeCall.description}\n\n[${new Date().toLocaleString()}] ${webhookMessage.message}`;
        
        await prisma.call.update({
          where: { id: activeCall.id },
          data: { description: updatedDescription }
        });

        // Salvar mensagem vinculada ao chamado
        await WhatsAppMessageModel.create({
          phone: webhookMessage.phone,
          message: webhookMessage.message,
          messageType: webhookMessage.messageType || 'text',
          userId,
          callId: activeCall.id,
          isFromUser: true,
        });

        console.log('✅ Message added to active call:', activeCall.id);
      } else {
        console.log('ℹ️ No active call found for user:', userId);
      }
    } catch (error) {
      console.error('❌ Error adding message to active call:', error);
    }
  }

  /**
   * Obtém histórico de mensagens de um chamado
   */
  static async getCallMessageHistory(callId: number) {
    return WhatsAppMessageModel.findByCallId(callId);
  }

  /**
   * Obtém histórico de mensagens de um telefone
   */
  static async getPhoneMessageHistory(phone: string, limit = 20) {
    return WhatsAppMessageModel.findByPhone(phone, limit);
  }
}
