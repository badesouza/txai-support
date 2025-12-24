import { create, SocketState, Whatsapp } from '@wppconnect-team/wppconnect';
import { WhatsAppMessageRepository, UserRepository, CallRepository } from '../repositories';
import * as waJs from '@wppconnect/wa-js';
import { storage } from '../storage/storage';

export interface WhatsAppMessage {
  from: string;
  body: string;
  type: string;
  timestamp: number;
  id?: string;
  mediaKey?: string;
  directPath?: string;
  mimetype?: string;
  [key: string]: any;
}

export class WPPConnectDirectService {
  private client: Whatsapp | null = null;
  private sessionName: string = 'txai-whatsapp';
  private isConnected: boolean = false;
  private qrCode: string | null = null;
  private isInitializing: boolean = false;
  private lastQrCodeTime: number = 0;
  private pendingCallLocations: Map<string, { userId: string; timestamp: number }> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitializing) {
      console.log('⚠️ WPPConnect is already initializing...');
      return;
    }

    this.isInitializing = true;
    
    try {
      console.log('🚀 Initializing WPPConnect Direct Service...');
      
      const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || '/usr/bin/chromium-browser';
      const tokenStore = process.env.WHATSAPP_TOKEN_STORE || 'file';
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      console.log('🌐 Using Chrome Path:', chromePath);
      console.log('🌐 Session name:', this.sessionName);
      console.log('🌐 Token store:', tokenStore);
      console.log('🌐 Creating WPPConnect client...');

      const createOptions: any = {
        session: this.sessionName,
        headless: true,
        devtools: false,
        useChrome: false,
        debug: false,
        logQR: true,
        autoClose: false as any,
        disableWelcome: true,
        waitForLogin: false,
        updatesLog: false,
        catchQR: (base64Qrimg: string, asciiQR: string, attempts: number, urlCode: string) => {
          console.log('📸 ========== QR CODE CALLBACK TRIGGERED ==========');
          console.log('📸 Attempts:', attempts);
          console.log('📸 Has base64Qrimg:', !!base64Qrimg);
          
          if (!base64Qrimg) {
            console.error('❌ QR Code is empty!');
            return;
          }
          
          const qr = String(base64Qrimg).startsWith('data:image') ? String(base64Qrimg) : `data:image/png;base64,${String(base64Qrimg)}`;
          this.qrCode = qr;
          this.lastQrCodeTime = Date.now();
          console.log('✅ QR Code captured and stored successfully');
        },
        puppeteerOptions: {
          executablePath: chromePath,
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
            '--disable-breakpad',
            '--disable-extensions',
            '--no-default-browser-check',
            '--start-maximized',
            '--disable-infobars',
            '--window-size=1920,1080',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
          ],
          defaultViewport: null
        }
      };

      // Configure token storage based on environment
      if (tokenStore === 'redis') {
        console.log('📦 Using Redis for session storage');
        createOptions.tokenStore = 'redis';
        createOptions.redis = this.parseRedisUrl(redisUrl);
      } else {
        console.log('📁 Using file storage for sessions');
        createOptions.folderNameToken = 'tokens';
        createOptions.mkdirFolderToken = process.env.WHATSAPP_SESSION_PATH || './whatsapp-sessions';
      }

      this.client = await create(createOptions);

      console.log('✅ WPPConnect client created successfully');

      // Set up message event listener
      this.client.onMessage(async (message: any) => {
        console.log('📱 Message received');
        await this.handleIncomingMessage({
          from: message.from,
          body: message.body || '',
          type: message.type || 'text',
          timestamp: message.timestamp || Date.now(),
          id: message.id || message.msgId || message.messageId,
          mediaKey: message.mediaKey || message.mediaData?.mediaKey,
          directPath: message.directPath || message.mediaData?.directPath,
          mimetype: message.mimetype || message.mediaData?.mimetype,
          ...message
        });
      });

      // Set up connection state listener
      this.client.onStateChange((state: SocketState) => {
        console.log('📱 WhatsApp connection state changed:', state);
        const normalized = String(state).toUpperCase();
        const connectedStates = ['CONNECTED', 'MAIN', 'NORMAL', 'SYNCING'];
        this.isConnected = connectedStates.some((s) => normalized.includes(s));

        if (this.isConnected && this.qrCode) {
          this.qrCode = null;
          console.log('✅ WhatsApp connected - QR code cleared');
        }
      });

      console.log('✅ WPPConnect Direct Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing WPPConnect Direct Service:', error);
      this.isInitializing = false;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private parseRedisUrl(redisUrl: string) {
    try {
      const url = new URL(redisUrl);
      const config: any = {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        db: url.pathname ? parseInt(url.pathname.substring(1)) : 0,
      };

      if (url.protocol === 'rediss:') {
        config.tls = { rejectUnauthorized: false };
      }
      if (url.password) {
        config.password = url.password;
      }
      return config;
    } catch (error) {
      console.error('❌ Error parsing Redis URL:', error);
      throw error;
    }
  }

  private async handleIncomingMessage(message: WhatsAppMessage): Promise<void> {
    try {
      const phone = message.from.replace('@c.us', '');
      const user = await UserRepository.findByPhone(phone);
      const userExists = !!user;
      
      console.log('👤 User exists:', userExists);
      
      await this.processMessage(message, userExists, user?.id);
    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
    }
  }

  private async processMessage(message: WhatsAppMessage, userExists: boolean, userId?: string): Promise<void> {
    try {
      const phone = message.from.replace('@c.us', '');
      
      switch (message.type) {
        case 'text':
        case 'chat':
          await this.handleTextMessage(phone, message.body || '', userExists, userId);
          break;
        case 'image':
          await this.handleImageMessage(phone, userExists, userId, message);
          break;
        case 'document':
          const isImageDocument = message.mimetype?.startsWith('image/');
          if (isImageDocument) {
            await this.handleImageMessage(phone, userExists, userId, message);
          }
          break;
        default:
          await this.handleTextMessage(phone, message.body || '', userExists, userId);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  }

  private async handleTextMessage(phone: string, messageBody: string, userExists: boolean, userId?: string): Promise<void> {
    try {
      this.cleanExpiredPendingStates();

      if (userExists && userId && this.pendingCallLocations.has(phone)) {
        await this.handleCallLocationResponse(phone, messageBody, userId);
        return;
      }

      const lower = (messageBody || '').toLowerCase().trim();
      const isNewCall = lower.includes('novo chamado') || lower === 'novo';

      if (isNewCall) {
        if (!userExists || !userId) {
          console.log('ℹ️ New call message ignored: user not registered.');
          return;
        }
        await this.initiateCallCreationFlow(phone, userId);
        return;
      }

      if (userExists && userId) {
        await this.updateLastCallWithMessage(phone, messageBody, userId);
      }
    } catch (error) {
      console.error('❌ Error handling text message:', error);
    }
  }

  private async handleImageMessage(phone: string, userExists: boolean, userId?: string, message?: WhatsAppMessage): Promise<void> {
    try {
      if (!userExists || !userId || !message) {
        console.log('ℹ️ Image ignored: user not registered or invalid message.');
        return;
      }

      const lastCall = await CallRepository.findActiveCallForUser(userId);
      if (!lastCall) {
        console.log('❌ No active call found for user');
        return;
      }

      await this.downloadAndSaveImage(message, lastCall.id);

      await WhatsAppMessageRepository.create({
        phone,
        message: '[Imagem]',
        messageType: 'image',
        userId,
        callId: lastCall.id,
        isFromUser: true,
      });

      console.log('✅ Image processed and linked to call:', lastCall.id);
    } catch (error) {
      console.error('❌ Error handling image message:', error);
    }
  }

  private async downloadAndSaveImage(message: WhatsAppMessage, callId: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('WPPConnect client is not initialized');
      }

      let mediaData: Buffer | undefined;
      let mimetype: string | undefined = message.mimetype;

      try {
        const downloadedMedia: any = await (this.client as any).downloadMediaByMessageId(message.id);
        
        if (downloadedMedia?.base64) {
          let base64Data = downloadedMedia.base64;
          if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          base64Data = base64Data.trim().replace(/\s/g, '');
          mediaData = Buffer.from(base64Data, 'base64');
          mimetype = downloadedMedia.mimetype || message.mimetype;
        }
      } catch (downloadError) {
        if (message.body) {
          let cleanedBody = message.body.trim().replace(/\s/g, '');
          mediaData = Buffer.from(cleanedBody, 'base64');
        }
      }

      if (!mediaData || mediaData.length === 0) {
        throw new Error('Image data is empty or invalid');
      }

      const timestamp = Date.now();
      const extension = this.getImageExtension(mimetype || 'image/jpeg');
      const filename = `whatsapp-${timestamp}.${extension}`;

      const { relativePath } = await storage.saveBuffer({
        buffer: mediaData,
        filename,
        contentType: mimetype || 'image/jpeg',
      });

      await CallRepository.addImage({
        callId,
        filename,
        path: relativePath
      });

      console.log('✅ Image saved:', filename);
    } catch (error) {
      console.error('❌ Error downloading and saving image:', error);
    }
  }

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

  private cleanExpiredPendingStates(): void {
    const now = Date.now();
    const EXPIRATION_TIME = 10 * 60 * 1000;

    for (const [phone, data] of this.pendingCallLocations.entries()) {
      if (now - data.timestamp > EXPIRATION_TIME) {
        this.pendingCallLocations.delete(phone);
      }
    }
  }

  private async initiateCallCreationFlow(phone: string, userId: string): Promise<void> {
    try {
      this.pendingCallLocations.set(phone, {
        userId,
        timestamp: Date.now()
      });

      await this.sendAutoReply(phone, 'Qual o local do chamado?');
      console.log('✅ Call creation flow initiated, awaiting location');
    } catch (error) {
      console.error('❌ Error initiating call creation flow:', error);
    }
  }

  private async handleCallLocationResponse(phone: string, location: string, userId: string): Promise<void> {
    try {
      const pendingData = this.pendingCallLocations.get(phone);
      if (!pendingData) return;

      this.pendingCallLocations.delete(phone);

      const user = await UserRepository.findById(userId);
      const call = await CallRepository.create({
        title: location,
        description: `Chamado criado via WhatsApp - ${phone}`,
        status: 'OPEN',
        priority: 'MEDIUM',
        userId,
        userName: user?.name,
        userEmail: user?.email,
        userPhone: user?.phone
      });

      await this.sendAutoReply(phone, `Novo chamado de número #${call.id.substring(0, 8)}`);

      await WhatsAppMessageRepository.create({
        phone,
        message: location,
        messageType: 'text',
        userId,
        callId: call.id,
        isFromUser: true,
      });

      console.log('✅ Call created with location:', location);
    } catch (error) {
      console.error('❌ Error handling call location response:', error);
    }
  }

  private async updateLastCallWithMessage(phone: string, messageBody: string, userId: string): Promise<void> {
    try {
      const lastCall = await CallRepository.findActiveCallForUser(userId);
      if (!lastCall) {
        console.log('ℹ️ No active call found for user');
        return;
      }

      const timestamp = new Date().toLocaleString('pt-BR');
      const updatedDescription = `${lastCall.description}\n[${timestamp}] ${messageBody}`;
      
      await CallRepository.update(lastCall.id, { description: updatedDescription });

      await WhatsAppMessageRepository.create({
        phone,
        message: messageBody,
        messageType: 'text',
        userId,
        callId: lastCall.id,
        isFromUser: true,
      });

      console.log('✅ Call updated with new message:', lastCall.id);
    } catch (error) {
      console.error('❌ Error updating last call with message:', error);
    }
  }

  private async sendAutoReply(phone: string, message: string): Promise<void> {
    try {
      if (!this.client || !this.isConnected) {
        console.log('⚠️ WhatsApp client not connected, cannot send message');
        return;
      }

      await this.client.sendText(`${phone}@c.us`, message);

      await WhatsAppMessageRepository.create({
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

  async sendMessage(phone: string, message: string): Promise<void> {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('WhatsApp client not connected');
      }

      await this.client.sendText(`${phone}@c.us`, message);

      await WhatsAppMessageRepository.create({
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

  getConnectionStatus(): { isConnected: boolean; hasQRCode: boolean; qrCode?: string } {
    return {
      isConnected: this.isConnected,
      hasQRCode: !this.isConnected && this.qrCode !== null,
      qrCode: this.qrCode || undefined
    };
  }

  async getQrCode(): Promise<string | null> {
    if (this.isConnected) {
      return null;
    }
    
    const now = Date.now();
    
    if (this.qrCode && (now - this.lastQrCodeTime) < 45000) {
      return this.qrCode;
    }
    
    if (!this.client && !this.isInitializing) {
      this.initialize().catch(err => console.error('Error in lazy initialize:', err));
      return 'QR_CODE_GENERATING';
    }
    
    if (this.client && !this.qrCode) {
      return 'QR_CODE_GENERATING';
    }
    
    return this.qrCode ?? 'QR_CODE_GENERATING';
  }

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

export const wppConnectDirectService = new WPPConnectDirectService();
