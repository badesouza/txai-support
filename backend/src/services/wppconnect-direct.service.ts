import { create, SocketState, Whatsapp } from '@wppconnect-team/wppconnect';
import { WhatsAppMessageModel } from '../models/WhatsAppMessage';
import { WhatsAppMessageService } from './whatsapp-message.service';

export interface WhatsAppMessage {
  from: string;
  body: string;
  type: string;
  timestamp: number;
}

export class WPPConnectDirectService {
  private client: Whatsapp | null = null;
  private sessionName: string = 'txai-whatsapp';
  private isConnected: boolean = false;
  private qrCode: string | null = null;
  private isInitializing: boolean = false;
  private lastQrCodeTime: number = 0;
  private pendingCallLocations: Map<string, { userId: number; timestamp: number }> = new Map();

  /**
   * Initialize WPPConnect and start WhatsApp session
   */
  async initialize(): Promise<void> {
    if (this.isInitializing) {
      console.log('⚠️ WPPConnect is already initializing...');
      return;
    }

    this.isInitializing = true;
    
    try {
      console.log('🚀 Initializing WPPConnect Direct Service...');
      
      this.client = await create({
        session: this.sessionName,
        headless: true,
        devtools: false,
        useChrome: true,
        debug: false,
        logQR: false, // Evitar logs no terminal, usar catchQR
        autoClose: 0, // Disable auto close
        folderNameToken: this.sessionName, // Persiste token em pasta específica
        catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
          // base64Qrimg já vem no formato data:image/png;base64,AAA...
          console.log('📸 Received QR from WPPConnect (catchQR). attempts:', attempts);
          if (!base64Qrimg) return;
          
          // normalize: garante prefix data:image...
          const qr = String(base64Qrimg).startsWith('data:image') ? String(base64Qrimg) : `data:image/png;base64,${String(base64Qrimg)}`;
          this.qrCode = qr;
          this.lastQrCodeTime = Date.now();
          console.log('📱 QR Code captured and stored:', qr.substring(0, 50) + '...');
          console.log('📱 QR Code size:', qr.length, 'characters');
          console.log('📱 QR Code format:', qr.substring(0, 30));
        },
        browserArgs: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--force-device-scale-factor=1',
          '--high-dpi-support=1'
        ],
        puppeteerOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--force-device-scale-factor=1',
            '--high-dpi-support=1'
          ],
          defaultViewport: {
            width: 1280,
            height: 720,
            deviceScaleFactor: 1
          }
        }
      });

      console.log('✅ WPPConnect client created successfully');

      // Set up message event listener
      this.client.onMessage(async (message: any) => {
        console.log('📱 Message received:', message);
        await this.handleIncomingMessage({
          from: message.from,
          body: message.body || '',
          type: message.type || 'text',
          timestamp: message.timestamp || Date.now()
        });
      });

      // Set up connection state listener
      this.client.onStateChange((state: SocketState) => {
        console.log('📱 WhatsApp connection state changed:', state);
        // Consider states like MAIN (NORMAL) and SYNCING as connected too
        const normalized = String(state).toUpperCase();
        const connectedStates = ['CONNECTED', 'MAIN', 'NORMAL', 'SYNCING'];
        const wasConnected = this.isConnected;
        this.isConnected = connectedStates.some((s) => normalized.includes(s));

        if (this.isConnected) {
          if (this.qrCode) {
            this.qrCode = null;
            console.log('✅ WhatsApp connected - QR code cleared');
          }
        } else {
          // se caiu e consegue gerar novo QR, catchQR irá preencher
          if (normalized.includes('UNPAIRED')) {
            console.log('🔔 Session requires QR or is unpaired - waiting for catchQR...');
          }
        }
      });

      console.log('✅ WPPConnect Direct Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing WPPConnect Direct Service:', error);
      this.isInitializing = false;
      
      // Retry initialization after a delay
      setTimeout(() => {
        console.log('🔄 Retrying WPPConnect initialization...');
        this.initialize().catch(err => {
          console.error('❌ Retry failed:', err);
        });
      }, 5000);
      
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Handle incoming WhatsApp messages
   */
  private async handleIncomingMessage(message: WhatsAppMessage): Promise<void> {
    try {
      console.log('📱 ===== INCOMING MESSAGE =====');
      console.log('📱 From:', message.from);
      console.log('📱 Body:', message.body);
      console.log('📱 Type:', message.type);
      console.log('📱 ============================');

      // Extract phone number (remove @c.us suffix)
      const phone = message.from.replace('@c.us', '');
      
      // Check if user exists in database
      const userExists = await this.checkUserExists(phone);
      console.log('👤 Usuário existe no banco:', userExists);
      
      // Message will be saved later in the processing logic

      // Process message based on type and user existence
      await this.processMessage(message, userExists);

      console.log('✅ Message processed and auto-reply sent');
      
    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
    }
  }

  /**
   * Check if user exists in database
   */
  private async checkUserExists(phone: string): Promise<boolean> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      // Normalizar o telefone para busca (remover formatação e garantir formato 55XXXXXXXXX)
      const normalizedPhone = this.normalizePhoneForSearch(phone);
      
      const user = await prisma.user.findFirst({
        where: {
          phone: normalizedPhone
        }
      });
      
      // Log para debug
      console.log('🔍 checkUserExists - Original Phone:', phone);
      console.log('🔍 checkUserExists - Normalized Phone:', normalizedPhone);
      console.log('🔍 checkUserExists - User found:', user ? 'YES' : 'NO');
      if (user) {
        console.log('🔍 checkUserExists - User details:', {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          profile: user.profile
        });
      }
      
      await prisma.$disconnect();
      
      return !!user;
    } catch (error) {
      console.error('❌ Error checking user existence:', error);
      return false;
    }
  }

  /**
   * Process message based on type and user existence
   */
  private async processMessage(message: WhatsAppMessage, userExists: boolean): Promise<void> {
    try {
      console.log('🔄 Processando mensagem - Tipo:', message.type, 'Usuário existe:', userExists);
      
      const phone = message.from.replace('@c.us', '');
      
      switch (message.type) {
        case 'text':
        case 'chat':
          await this.handleTextMessage(phone, message.body || '', userExists);
          break;
        case 'image':
          await this.handleImageMessage(phone, userExists, message);
          break;
        case 'video':
          await this.handleVideoMessage(phone, userExists);
          break;
        default:
          console.log('⚠️ Tipo de mensagem não suportado:', message.type);
          await this.handleTextMessage(phone, message.body || '', userExists);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  }

  /**
   * Handle text messages
   */
  private async handleTextMessage(phone: string, messageBody: string, userExists: boolean): Promise<void> {
    try {
      console.log('📝 Processando mensagem de texto');
      
      // Limpar estados pendentes expirados (mais de 10 minutos)
      this.cleanExpiredPendingStates();

      // Verificar se é resposta para local do chamado
      if (userExists && this.pendingCallLocations.has(phone)) {
        await this.handleCallLocationResponse(phone, messageBody);
        return;
      }

      // Fluxo profissional: se mensagem for "novo" ou "novo chamado"
      const lower = (messageBody || '').toLowerCase().trim();
      const isNewCall = lower.includes('novo chamado') || lower === 'novo';

      if (isNewCall) {
        if (!userExists) {
          // Requisito: número não cadastrado → não fazer nada
          console.log('ℹ️ Mensagem de novo chamado ignorada: usuário não cadastrado.');
          return;
        }

        // Iniciar fluxo de criação de chamado com local
        await this.initiateCallCreationFlow(phone, messageBody);
        return; // Não enviar auto-reply genérico
      }

      // Demais casos: buscar último chamado do usuário e atualizar
      if (userExists) {
        await this.updateLastCallWithMessage(phone, messageBody);
      } else {
        // Usuário não cadastrado - não fazer nada
        console.log('ℹ️ Mensagem ignorada: usuário não cadastrado.');
      }
    } catch (error) {
      console.error('❌ Error handling text message:', error);
    }
  }

  /**
   * Handle image messages
   */
  private async handleImageMessage(phone: string, userExists: boolean, message?: any): Promise<void> {
    try {
      console.log('🖼️ Processando mensagem de imagem');
      console.log('🖼️ Phone:', phone);
      console.log('🖼️ User exists:', userExists);
      console.log('🖼️ Message object:', message);
      
      if (!userExists) {
        console.log('ℹ️ Imagem ignorada: usuário não cadastrado.');
        return;
      }

      // Processar imagem para último chamado do usuário
      console.log('🖼️ Chamando processImageForLastCall...');
      try {
        await this.processImageForLastCall(phone, message);
        console.log('🖼️ processImageForLastCall finalizado');
      } catch (error) {
        console.error('❌ Erro em processImageForLastCall:', error);
        console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      }
      
    } catch (error) {
      console.error('❌ Error handling image message:', error);
    }
  }

  /**
   * Processa imagem para o último chamado do usuário
   */
  private async processImageForLastCall(phone: string, message: any): Promise<void> {
    try {
      console.log('🖼️ Processando imagem para último chamado');
      console.log('🖼️ Message ID:', message?.id);
      console.log('🖼️ Message object keys:', message ? Object.keys(message) : 'null');
      console.log('🖼️ Message type:', message?.type);
      console.log('🖼️ Message body exists:', !!message?.body);
      console.log('🖼️ Message body length:', message?.body ? message.body.length : 'null');
      console.log('🖼️ Message body preview:', message?.body ? message.body.substring(0, 50) + '...' : 'null');
      
    // Verificar se message é válido
    if (!message) {
      console.log('❌ Message é null ou undefined');
      return;
    }
    
    // Gerar um ID único se não existir (WPPConnect às vezes não fornece message.id)
    if (!message.id) {
      message.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 Gerado ID único para a mensagem:', message.id);
    }
      
      // Buscar usuário pelo telefone
      console.log('🔍 Buscando usuário pelo telefone:', phone);
      const user = await this.findUserByPhone(phone);
      if (!user) {
        console.log('❌ Usuário não encontrado para processar imagem');
        return;
      }
      console.log('✅ Usuário encontrado:', user.id, user.name);

      // Buscar o último chamado do usuário
      console.log('🔍 Buscando último chamado do usuário:', user.id);
      const lastCall = await this.getLastCallByUserId(user.id);
      if (!lastCall) {
        console.log('❌ Nenhum chamado encontrado para o usuário');
        return;
      }
      console.log('✅ Último chamado encontrado:', lastCall.id);

      // Baixar e salvar a imagem
      if (message && message.id) {
        console.log('📥 Iniciando download da imagem...');
        console.log('📥 Message ID:', message.id);
        console.log('📥 Call ID:', lastCall.id);
        console.log('📥 Message body length:', message.body ? message.body.length : 'null');
        await this.downloadAndSaveImage(message, lastCall.id);

        // Salvar mensagem de imagem no histórico
        await WhatsAppMessageModel.create({
          phone,
          message: '[Imagem]',
          messageType: 'image',
          userId: user.id,
          callId: lastCall.id,
          isFromUser: true,
        });

        console.log('✅ Imagem processada e vinculada ao chamado:', lastCall.id);
      } else {
        console.log('❌ Message ou message.id não encontrado');
        console.log('❌ Message:', message);
      }
      
    } catch (error) {
      console.error('❌ Error processing image for last call:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    }
  }

  /**
   * Baixa e salva a imagem do WhatsApp
   */
  private async downloadAndSaveImage(message: any, callId: number): Promise<void> {
    try {
      console.log('📥 Iniciando download da imagem original...');
      console.log('📥 Message ID:', message.id);
      console.log('📥 Call ID:', callId);
      console.log('📥 Message keys:', Object.keys(message));
      console.log('📥 Message filehash:', message.filehash);
      console.log('📥 Message mediaKey:', message.mediaKey);
      
      // Usar downloadMedia do WPPConnect para baixar a imagem original
      let mediaData: Buffer;
      
      try {
        console.log('📥 Baixando mídia via WPPConnect downloadMedia...');
        console.log('📥 Message para downloadMedia:', JSON.stringify({
          id: message.id,
          filehash: message.filehash,
          mediaKey: message.mediaKey,
          mimetype: message.mimetype,
          type: message.type
        }, null, 2));
        
        if (!this.client) {
          throw new Error('WPPConnect client is not initialized');
        }
        const downloadedData = await this.client.downloadMedia(message);
        if (!downloadedData) {
          throw new Error('Downloaded data is null or undefined');
        }
        mediaData = Buffer.from(downloadedData);
        console.log('✅ Mídia original baixada com sucesso, tamanho:', mediaData.length, 'bytes');
      } catch (downloadError) {
        console.log('⚠️ Erro ao baixar via downloadMedia, tentando fallback com body...');
        console.log('⚠️ Download error:', downloadError);
        
        // Fallback: usar o body se downloadMedia falhar
        if (!message.body || typeof message.body !== 'string') {
          console.log('❌ Message body não contém dados válidos');
          return;
        }

        // Verificar se é base64 válido
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(message.body)) {
          console.log('❌ Body não é base64 válido');
          return;
        }

        mediaData = Buffer.from(message.body, 'base64');
        console.log('📥 Usando fallback com body (miniatura), tamanho:', mediaData.length, 'bytes');
      }
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const extension = this.getImageExtension(message.mimetype || 'image/jpeg');
      const filename = `whatsapp-${timestamp}.${extension}`;
      const path = `/uploads/${filename}`;

      console.log('📥 Salvando arquivo:', filename);

      // Salvar arquivo
      const fs = require('fs');
      fs.writeFileSync(`./uploads/${filename}`, mediaData);

      // Salvar referência na tabela call_images
      await this.saveCallImage(callId, filename, path);

      console.log('✅ Imagem original salva com sucesso:', filename);
      
    } catch (error) {
      console.error('❌ Error downloading and saving image:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    }
  }

  /**
   * Obtém extensão da imagem baseada no mimetype
   */
  private getImageExtension(mimetype: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };
    
    return extensions[mimetype] || 'jpg';
  }

  /**
   * Salva referência da imagem na tabela call_images
   */
  private async saveCallImage(callId: number, filename: string, path: string): Promise<void> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.callImage.create({
        data: {
          filename,
          path,
          callId
        }
      });
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('❌ Error saving call image:', error);
    }
  }

  /**
   * Handle video messages
   */
  private async handleVideoMessage(phone: string, userExists: boolean): Promise<void> {
    try {
      console.log('🎥 Processando mensagem de vídeo');
      
      let replyMessage = '';
      
      if (userExists) {
        replyMessage = 'Recebi seu vídeo! Como posso ajudá-lo com ele?';
      } else {
        replyMessage = 'Recebi seu vídeo, mas você não está cadastrado em nosso sistema.';
      }
      
      await this.sendAutoReply(phone, replyMessage);
    } catch (error) {
      console.error('❌ Error handling video message:', error);
    }
  }

  /**
   * Limpa estados pendentes expirados
   */
  private cleanExpiredPendingStates(): void {
    const now = Date.now();
    const EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutos

    for (const [phone, data] of this.pendingCallLocations.entries()) {
      if (now - data.timestamp > EXPIRATION_TIME) {
        this.pendingCallLocations.delete(phone);
        console.log('🧹 Limpando estado pendente expirado para:', phone);
      }
    }
  }

  /**
   * Inicia o fluxo de criação de chamado perguntando o local
   */
  private async initiateCallCreationFlow(phone: string, messageBody: string): Promise<void> {
    try {
      console.log('🔄 Iniciando fluxo de criação de chamado');
      
      // Buscar usuário pelo telefone
      const user = await this.findUserByPhone(phone);
      if (!user) {
        console.log('❌ Usuário não encontrado para iniciar criação de chamado');
        return;
      }

      // Salvar estado pendente
      this.pendingCallLocations.set(phone, {
        userId: user.id,
        timestamp: Date.now()
      });

      // Perguntar o local do chamado
      await this.sendAutoReply(phone, 'Qual o local do chamado?');

      console.log('✅ Fluxo de criação iniciado, aguardando local do chamado');
      
    } catch (error) {
      console.error('❌ Error initiating call creation flow:', error);
    }
  }

  /**
   * Processa a resposta com o local do chamado
   */
  private async handleCallLocationResponse(phone: string, location: string): Promise<void> {
    try {
      console.log('📍 Processando resposta do local do chamado:', location);
      
      const pendingData = this.pendingCallLocations.get(phone);
      if (!pendingData) {
        console.log('❌ Dados pendentes não encontrados para o telefone:', phone);
        return;
      }

      // Remover do estado pendente
      this.pendingCallLocations.delete(phone);

      // Criar chamado com o local como título
      const call = await this.createCallWithLocation(pendingData.userId, location, phone);

      // Responder com número do chamado
      await this.sendAutoReply(phone, `Novo chamado de número #${call.id}`);

      // Salvar mensagem inicial no histórico
      await WhatsAppMessageModel.create({
        phone,
        message: location,
        messageType: 'text',
        userId: pendingData.userId,
        callId: call.id,
        isFromUser: true,
      });

      console.log('✅ Chamado criado com local:', location, 'ID:', call.id);
      
    } catch (error) {
      console.error('❌ Error handling call location response:', error);
    }
  }

  /**
   * Cria um chamado com o local como título
   */
  private async createCallWithLocation(userId: number, location: string, phone: string): Promise<any> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const call = await prisma.call.create({
        data: {
          title: location, // Local como título
          description: `Chamado criado via WhatsApp - ${phone}`,
          status: 'OPEN',
          priority: 'MEDIUM',
          userId,
        },
      });
      
      await prisma.$disconnect();
      return call;
    } catch (error) {
      console.error('❌ Error creating call with location:', error);
      throw error;
    }
  }

  /**
   * Atualiza o último chamado do usuário com a nova mensagem
   */
  private async updateLastCallWithMessage(phone: string, messageBody: string): Promise<void> {
    try {
      console.log('🔄 Atualizando último chamado com nova mensagem');
      
      // Buscar usuário pelo telefone
      const user = await this.findUserByPhone(phone);
      if (!user) {
        console.log('❌ Usuário não encontrado para atualizar chamado');
        return;
      }

      // Buscar o último chamado do usuário
      const lastCall = await this.getLastCallByUserId(user.id);
      if (!lastCall) {
        console.log('ℹ️ Nenhum chamado encontrado para o usuário');
        return;
      }

      // Atualizar descrição do chamado concatenando com a nova mensagem (apenas para texto)
      const timestamp = new Date().toLocaleString('pt-BR');
      const updatedDescription = `${lastCall.description}\n[${timestamp}] ${messageBody}`;
      
      await this.updateCallDescription(lastCall.id, updatedDescription);

      // Salvar mensagem na tabela whatsapp_messages
      await WhatsAppMessageModel.create({
        phone,
        message: messageBody,
        messageType: 'text',
        userId: user.id,
        callId: lastCall.id,
        isFromUser: true,
      });

      console.log('✅ Chamado atualizado com nova mensagem:', lastCall.id);
      
    } catch (error) {
      console.error('❌ Error updating last call with message:', error);
    }
  }

  /**
   * Busca usuário pelo telefone
   */
  private async findUserByPhone(phone: string): Promise<any> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const normalizedPhone = this.normalizePhoneForSearch(phone);
      
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: phone },
            { phone: normalizedPhone },
            { phone: `+${normalizedPhone}` },
            { phone: `55${normalizedPhone}` },
          ]
        }
      });
      
      await prisma.$disconnect();
      return user;
    } catch (error) {
      console.error('❌ Error finding user by phone:', error);
      return null;
    }
  }

  /**
   * Busca o último chamado do usuário
   */
  private async getLastCallByUserId(userId: number): Promise<any> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const lastCall = await prisma.call.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      
      await prisma.$disconnect();
      return lastCall;
    } catch (error) {
      console.error('❌ Error getting last call by user ID:', error);
      return null;
    }
  }

  /**
   * Atualiza a descrição do chamado
   */
  private async updateCallDescription(callId: number, newDescription: string): Promise<void> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.call.update({
        where: { id: callId },
        data: { description: newDescription }
      });
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('❌ Error updating call description:', error);
    }
  }

  /**
   * Send auto-reply message
   */
  private async sendAutoReply(phone: string, message: string): Promise<void> {
    try {
      if (!this.client || !this.isConnected) {
        console.log('⚠️ WhatsApp client not connected, cannot send message');
        return;
      }

      console.log('📤 Sending auto-reply:', message);
      console.log('📤 To:', phone);

      // Send message via WPPConnect
      await this.client.sendText(`${phone}@c.us`, message);

      // Save sent message to database
      await WhatsAppMessageModel.create({
        phone,
        message,
        messageType: 'text',
        isFromUser: false,
      });

      console.log('✅ Auto-reply sent successfully');
      
    } catch (error) {
      console.error('❌ Error sending auto-reply:', error);
    }
  }

  /**
   * Send a message to a specific phone number
   */
  async sendMessage(phone: string, message: string): Promise<void> {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('WhatsApp client not connected');
      }

      console.log('📤 Sending message:', message);
      console.log('📤 To:', phone);

      await this.client.sendText(`${phone}@c.us`, message);

      // Save sent message to database
      await WhatsAppMessageModel.create({
        phone,
        message,
        messageType: 'text',
        isFromUser: false,
      });

      console.log('✅ Message sent successfully');
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { isConnected: boolean; hasQRCode: boolean; qrCode?: string } {
    return {
      isConnected: this.isConnected,
      hasQRCode: !this.isConnected && this.qrCode !== null,
      qrCode: this.qrCode || undefined
    };
  }

  /**
   * Get QR code for connection
   */
  async getQrCode(): Promise<string | null> {
    if (this.isConnected) {
      console.log('📱 WhatsApp is connected, no QR code needed');
      return null; // No QR code needed when connected
    }
    
    const now = Date.now();
    console.log('📱 getQrCode called - isConnected:', this.isConnected, 'hasQrCode:', !!this.qrCode, 'lastQrCodeTime:', this.lastQrCodeTime);
    
    // Double-check runtime connection state from client to avoid stale flags
    if (this.client && !this.isConnected) {
      try {
        const anyClient: any = this.client as any;
        const logged: boolean | undefined = typeof anyClient.isLoggedIn === 'function' ? await anyClient.isLoggedIn() : undefined;
        const state: string | undefined = typeof anyClient.getConnectionState === 'function' ? await anyClient.getConnectionState() : undefined;
        const normalized = String(state ?? '').toUpperCase();
        const looksConnected = logged === true || ['CONNECTED', 'MAIN', 'NORMAL', 'SYNCING'].some((s) => normalized.includes(s));
        if (looksConnected) {
          this.isConnected = true;
          if (this.qrCode) this.qrCode = null;
          console.log('✅ Detected logged-in state via runtime check; marking as connected');
          return null;
        }
      } catch (e) {
        console.log('⚠️ Runtime connection check failed:', e);
      }
    }
    
    // se já temos qr válido nos ultimos 30s, devolve (reduzido para forçar atualização)
    if (this.qrCode && (now - this.lastQrCodeTime) < 30000) {
      console.log('📱 Returning cached QR code:', this.qrCode.substring(0, 50) + '...');
      return this.qrCode;
    }
    
    // se não tivermos QR, forçar criação / reinicializar client para gerar QR
    if (!this.client && !this.isInitializing) {
      // iniciar cliente se não iniciado
      console.log('📱 Client not initialized, starting...');
      await this.initialize();
      // aguardar um pouco para catchQR rodar (apenas se necessário)
      // não bloqueie muito tempo no request HTTP; use polling no frontend
      return 'QR_CODE_GENERATING';
    }
    
    // se cache expirou, limpar QR antigo para forçar novo
    if (this.qrCode && (now - this.lastQrCodeTime) >= 30000) {
      console.log('📱 QR cache expired, clearing old QR to force new generation');
      this.qrCode = null;
      this.lastQrCodeTime = 0;
      return 'QR_CODE_GENERATING';
    }
    
    // se client existe, mas qrCode ainda n foi gerado, sinalizar que está gerando
    if (this.client && !this.qrCode) {
      console.log('📱 Client exists but QR code not generated yet');
      return 'QR_CODE_GENERATING';
    }
    
    console.log('📱 Final return - qrCode:', this.qrCode ? 'exists' : 'null');
    return this.qrCode ?? 'QR_CODE_GENERATING';
  }


  /**
   * Normalize phone number for database search
   */
  private normalizePhoneForSearch(phone: string): string {
    // Remove todos os caracteres não numéricos
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Se começar com 55, mantém como está
    if (digitsOnly.startsWith('55')) {
      return digitsOnly;
    }
    
    // Se não começar com 55, adiciona 55 no início
    return '55' + digitsOnly;
  }

  /**
   * Disconnect WhatsApp session
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.isConnected = false;
        console.log('✅ WhatsApp session disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting WhatsApp session:', error);
    }
  }
}

// Export singleton instance
export const wppConnectDirectService = new WPPConnectDirectService();
