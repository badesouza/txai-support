import { wppConnectDirectService } from './wppconnect-direct.service';
import { UserRepository, CallRepository, WhatsAppMessageRepository } from '../repositories';

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
        await this.sendCallNumberResponse(webhookMessage.phone, call.id, user.id);
        
        console.log('✅ New call created:', call.id);
      } else {
        // Passo 4: Adicionar mensagem ao histórico do último chamado ativo
        await this.addMessageToActiveCall(user.id, webhookMessage);
      }

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
    return UserRepository.findByPhone(phone);
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
  private static async createCallFromWhatsApp(userId: string, webhookMessage: WhatsAppWebhookMessage) {
    const title = `Chamado via WhatsApp - ${webhookMessage.phone}`;
    const description = `Mensagem: ${webhookMessage.message}`;

    const user = await UserRepository.findById(userId);

    return CallRepository.create({
      title,
      description,
      status: 'OPEN',
      priority: 'MEDIUM',
      userId,
      userName: user?.name,
      userEmail: user?.email,
      userPhone: user?.phone
    });
  }

  /**
   * Envia resposta com o número do chamado
   */
  private static async sendCallNumberResponse(phone: string, callId: string, userId: string) {
    try {
      const responseMessage = `Novo chamado de número #${callId.substring(0, 8)}`;
      await wppConnectDirectService.sendMessage(phone, responseMessage);
      
      // Salvar mensagem de resposta no histórico
      await WhatsAppMessageRepository.create({
        phone,
        message: responseMessage,
        messageType: 'text',
        callId,
        userId,
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
  private static async addMessageToActiveCall(userId: string, webhookMessage: WhatsAppWebhookMessage) {
    try {
      // Buscar o último chamado ativo do usuário
      const activeCall = await CallRepository.findActiveCallForUser(userId);

      if (activeCall) {
        // Atualizar descrição do chamado com a nova mensagem
        const updatedDescription = `${activeCall.description}\n\n[${new Date().toLocaleString()}] ${webhookMessage.message}`;
        
        await CallRepository.update(activeCall.id, {
          description: updatedDescription
        });

        // Salvar mensagem vinculada ao chamado
        await WhatsAppMessageRepository.create({
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
  static async getCallMessageHistory(callId: string) {
    return WhatsAppMessageRepository.findByCallId(callId);
  }

  /**
   * Obtém histórico de mensagens de um telefone
   */
  static async getPhoneMessageHistory(phone: string, limit = 20) {
    return WhatsAppMessageRepository.findByPhone(phone, limit);
  }
}
