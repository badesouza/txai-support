import { create, SocketState, Whatsapp } from '@wppconnect-team/wppconnect';
import { WhatsAppMessageModel } from '../models/WhatsAppMessage';

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
      
      // Save incoming message to database
      await WhatsAppMessageModel.create({
        phone,
        message: message.body,
        messageType: message.type,
        isFromUser: true,
      });

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
          await this.handleImageMessage(phone, userExists);
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
      
      let replyMessage = '';
      
      if (userExists) {
        // Usuário cadastrado - resposta personalizada
        replyMessage = `Olá! Recebi sua mensagem: "${messageBody}". Como posso ajudá-lo hoje?`;
      } else {
        // Usuário não cadastrado - resposta padrão
        replyMessage = `Olá! Você não está cadastrado em nosso sistema. Para receber atendimento, entre em contato conosco.`;
      }
      
      await this.sendAutoReply(phone, replyMessage);
    } catch (error) {
      console.error('❌ Error handling text message:', error);
    }
  }

  /**
   * Handle image messages
   */
  private async handleImageMessage(phone: string, userExists: boolean): Promise<void> {
    try {
      console.log('🖼️ Processando mensagem de imagem');
      
      let replyMessage = '';
      
      if (userExists) {
        replyMessage = 'Recebi sua imagem! Como posso ajudá-lo com ela?';
      } else {
        replyMessage = 'Recebi sua imagem, mas você não está cadastrado em nosso sistema.';
      }
      
      await this.sendAutoReply(phone, replyMessage);
    } catch (error) {
      console.error('❌ Error handling image message:', error);
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
