import { create, Whatsapp, StatusFind } from '@wppconnect-team/wppconnect';
import { EventEmitter } from 'events';
import { PrismaClient, Profile } from '@prisma/client';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

class WhatsAppService {
  private client: Whatsapp | null = null;
  private eventEmitter: EventEmitter;
  private qrCode: string | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  async initialize() {
    try {
      this.client = await create(
        'txai-whatsapp',
        (base64QrCode) => {
          this.qrCode = base64QrCode;
          this.eventEmitter.emit('qr', base64QrCode);
        },
        (statusSession) => {
          this.isConnected = statusSession === 'inChat';
          this.eventEmitter.emit('status', statusSession);
        },
        undefined,
        undefined,
        {
          folderNameToken: 'tokens',
          mkdirFolderToken: '',
          headless: true,
          devtools: false,
          useChrome: true,
          debug: false,
          logQR: true,
          browserWS: '',
          browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-translate',
            '--disable-sync',
            '--disable-background-networking',
            '--metrics-recording-only',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-component-extensions-with-background-pages',
            '--disable-features=TranslateUI,BlinkGenPropertyTrees',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--enable-features=NetworkService,NetworkServiceInProcess',
            '--force-color-profile=srgb',
            '--hide-scrollbars',
            '--mute-audio'
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
              '--disable-extensions',
              '--disable-default-apps',
              '--disable-translate',
              '--disable-sync',
              '--disable-background-networking',
              '--metrics-recording-only',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-breakpad',
              '--disable-component-extensions-with-background-pages',
              '--disable-features=TranslateUI,BlinkGenPropertyTrees',
              '--disable-ipc-flooding-protection',
              '--disable-renderer-backgrounding',
              '--enable-features=NetworkService,NetworkServiceInProcess',
              '--force-color-profile=srgb',
              '--hide-scrollbars',
              '--mute-audio'
            ],
            executablePath: process.env.CHROME_PATH || undefined,
            timeout: 60000
          },
          disableWelcome: true,
          updatesLog: true,
          autoClose: 0,
          createPathFileToken: true,
        }
      );

      this.client.onMessage(async (message: any) => {
        try {
          // Log message type first
          this.logMessageType(message);

          // Check for group messages using both isGroup flag and @g.us suffix
          const isGroupMessage = message.isGroup || message.from.endsWith('@g.us');
          if (isGroupMessage) {
            return;
          }

          // Check for status messages
          if (message.from === 'status@broadcast') {
            return;
          }

          // Get user by phone
          const user = await this.findUserByPhone(message.from);
          if (!user) {
            console.log('👤 Usuário não encontrado:', message.from);
            return;
          }

          // Get user's last call
          const lastCall = await prisma.call.findFirst({
            where: { userId: user.id },
            orderBy: { id: 'desc' },
          });

          let call;

          // Check if message is a new call request
          if (message.type === 'chat' && this.isNewCallMessage(message.body)) {
            console.log('📝 Iniciando novo chamado para usuário:', user.id);
            call = await prisma.call.create({
              data: {
                title: '',
                description: `(${new Date().toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })})`,
                status: 'OPEN',
                priority: 'MEDIUM',
                userId: user.id
              }
            });
            console.log('✅ Novo chamado criado:', call.id);
            
            // Send confirmation message
            try {
              await this.client?.sendText(message.from, 'Qual o local do chamado?');
              console.log('✅ Mensagem de confirmação enviada');
            } catch (error) {
              console.error('❌ Erro ao enviar mensagem de confirmação:', error);
            }
            return;
          }

          if (lastCall) {
            if (lastCall.title === '' && message.type === 'chat') {
              call = await prisma.call.update({
                where: { id: lastCall.id },
                data: { title: message.body }
              });
              try {
                await this.client?.sendText(message.from, 'Chamado #' + lastCall.id + ' iniciado...');
                console.log('✅ Mensagem de descricao de chamado enviada');
              } catch (error) {
                console.error('❌ Erro ao enviar mensagem de confirmação:', error);
              }
              return;
            }

            if (message.type === 'chat') {
              // Update existing call description with just a line break
              const newDescription = `${lastCall.description}\n${message.body || 'Mídia enviada'}`;
              call = await prisma.call.update({
                where: { id: lastCall.id },
                data: { description: newDescription }
              });
              console.log('📝 Chamado atualizado:', call.id);            
            }

            // Handle media files
            if (message.type === 'image' || message.type === 'video' || message.type === 'document') {
              try {
                if (!lastCall) {
                  console.log('⚠️ Nenhum chamado encontrado para anexar a mídia');
                  return;
                }

                console.log('📎 Anexando mídia ao chamado:', lastCall.id);

                // Download media using the correct method
                const media = await this.client?.downloadMedia(message);
                if (!media) {
                  throw new Error('Failed to download media');
                }

                // Extract base64 data from the data URL if present
                let base64Data = media;
                if (media.startsWith('data:')) {
                  const matches = media.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                  if (matches && matches.length === 3) {
                    base64Data = matches[2];
                  }
                }

                // Get the correct file extension based on mimetype
                let fileExtension = 'jpg'; // default extension
                if (message.mimetype) {
                  const mimeParts = message.mimetype.split('/');
                  if (mimeParts.length > 1) {
                    const ext = mimeParts[1].toLowerCase();
                    // Map common image types to their extensions
                    switch (ext) {
                      case 'jpeg':
                      case 'jpg':
                        fileExtension = 'jpg';
                        break;
                      case 'png':
                        fileExtension = 'png';
                        break;
                      case 'gif':
                        fileExtension = 'gif';
                        break;
                      case 'webp':
                        fileExtension = 'webp';
                        break;
                      default:
                        fileExtension = ext;
                    }
                  }
                }

                // Convert base64 to buffer
                const buffer = Buffer.from(base64Data, 'base64');
                
                // Create uploads directory if it doesn't exist
                const uploadsDir = path.join(__dirname, '../../uploads');
                await fs.mkdir(uploadsDir, { recursive: true });

                // Generate unique filename with proper extension
                const filename = `${Date.now()}-${message.filename || `media.${fileExtension}`}`;
                const filepath = path.join(uploadsDir, filename);

                // Save file
                await fs.writeFile(filepath, buffer);

                // Create call image record
                await prisma.callImage.create({
                  data: {
                    filename: filename,
                    path: `/uploads/${filename}`,
                    callId: lastCall.id
                  }
                });
                console.log('📎 Mídia salva:', filename, 'Tipo:', message.mimetype);
              } catch (error) {
                console.error('Erro ao salvar mídia:', error);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      });

      return true;
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        // First logout from WhatsApp
        await this.client.logout();
        
        // Clear the client
        this.client = null;
        this.isConnected = false;
        this.qrCode = null;

        // Delete the session tokens
        const tokenPath = path.join(__dirname, '../../tokens');
        try {
          await fs.rm(tokenPath, { recursive: true, force: true });
          console.log('✅ Tokens de sessão removidos com sucesso');
        } catch (error) {
          console.error('Erro ao remover tokens:', error);
        }
      } catch (error) {
        console.error('Erro ao desconectar:', error);
        throw error;
      }
    }
  }

  async reconnect() {
    await this.disconnect();
    return this.initialize();
  }

  getQRCode() {
    return this.qrCode;
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  onQR(callback: (qr: string) => void) {
    this.eventEmitter.on('qr', callback);
  }

  onStatus(callback: (status: StatusFind) => void) {
    this.eventEmitter.on('status', callback);
  }

  onMessage(callback: (message: any) => void) {
    this.eventEmitter.on('message', callback);
  }

  private logMessageType(message: any) {
    // Check for group messages
    const isGroupMessage = message.isGroup || message.from.endsWith('@g.us');
    if (isGroupMessage) {
      console.log('👥 Ignorando mensagem de grupo:', message.groupName || message.from);
      return;
    }

    // Define message types
    type MessageType = 'chat' | 'image' | 'video' | 'document' | 'audio' | 'sticker' | 
                      'location' | 'contact' | 'order' | 'revoked' | 'buttons_response' | 
                      'list_response' | 'template';

    // Log message type with emoji
    const typeEmoji: Record<MessageType, string> = {
      'chat': '💬',
      'image': '🖼️',
      'video': '🎥',
      'document': '📄',
      'audio': '🎵',
      'sticker': '🎯',
      'location': '📍',
      'contact': '👤',
      'order': '🛍️',
      'revoked': '🗑️',
      'buttons_response': '🔘',
      'list_response': '📋',
      'template': '📝'
    };

    const messageType = message.type as MessageType;
    const emoji = typeEmoji[messageType] || '❓';

    console.log(`${emoji} Nova mensagem recebida:`, {
      from: message.from,
      author: message.notifyName || message.sender?.pushname || message.sender?.name || message.sender?.shortName || message.pushName || 'Desconhecido',
      type: message.type,
      body: message.body || 'Mídia enviada',
      timestamp: new Date(message.timestamp * 1000).toLocaleString()
    });
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const numbers = phone.replace(/\D/g, '');
    
    // If it's a WhatsApp number (contains @c.us), remove it
    const cleanNumber = numbers.split('@')[0];
    
    // Handle Brazilian phone numbers
    if (cleanNumber.length >= 10) {
      // Remove country code if present (55)
      const withoutCountryCode = cleanNumber.length > 10 ? cleanNumber.slice(2) : cleanNumber;
      
      // Format as (DD) XXXXX-XXXX
      const ddd = withoutCountryCode.slice(0, 2);
      const firstPart = withoutCountryCode.slice(2, 6);
      const secondPart = withoutCountryCode.slice(6, 10);
      
      return `(${ddd}) 9${firstPart}-${secondPart}`;
    }
    
    return cleanNumber;
  }

  private isNewCallMessage(message: string): boolean {
    const normalizedMessage = message.toLowerCase().trim();
    return normalizedMessage === 'novo' || normalizedMessage === 'novo chamado';
  }

  private async findUserByPhone(phone: string) {
    const formattedPhone = this.formatPhoneNumber(phone);
    console.log('📱 Procurando usuário com número:', formattedPhone);

    // Try to find user with exact formatted phone
    let user = await prisma.user.findFirst({
      where: { phone: formattedPhone }
    });

    if (user) {
      console.log('✅ Usuário encontrado com número exato:', user.id);
      return user;
    }
    return console.log('❌ Nenhum usuário encontrado com o número:', formattedPhone);
  }

  async sendMessage(to: string, message: string) {
    if (!this.client || !this.isConnected) {
      throw new Error('WhatsApp client is not connected');
    }
    return this.client.sendText(to, message);
  }

  async sendImage(to: string, imagePath: string, caption?: string) {
    if (!this.client || !this.isConnected) {
      throw new Error('WhatsApp client is not connected');
    }
    return this.client.sendImage(to, imagePath, 'image', caption);
  }
}

export const whatsappService = new WhatsAppService(); 