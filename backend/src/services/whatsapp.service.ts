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
          // Check for group messages using both isGroup flag and @g.us suffix
          const isGroupMessage = message.isGroup || message.from.endsWith('@g.us');
          if (isGroupMessage) {
            console.log('Ignorando mensagem de grupo:', message.groupName || message.from);
            return;
          }

          // Check for status messages
          if (message.from === 'status@broadcast') {
            console.log('📱 Status recebido:', {
              type: message.type,
              timestamp: message.timestamp,
              body: message.body || 'Mídia de status'
            });
            return;
          }

          console.log('📨 Nova mensagem recebida:', {
            from: message.from,
            author: message.notifyName || message.sender?.pushname || message.sender?.name || message.sender?.shortName || message.pushName || 'Desconhecido',
            body: message.body,
            type: message.type,
            timestamp: message.timestamp,
            isGroup: message.isGroup,
            groupName: message.groupName
          });

          // Get or create user
          let user = await prisma.user.findFirst({
            where: { phone: message.from }
          });

          if (!user) {
            console.log('👤 Criando novo usuário para:', message.from);
            
            // Format phone numbers for comparison
            const cleanDbPhone = (phone: string) => phone.replace(/[^0-9]/g, '');
            const cleanWhatsAppPhone = (phone: string) => {
              // Remove @c.us or @g.us and any non-numeric characters
              const clean = phone.split('@')[0].replace(/[^0-9]/g, '');
              // Remove first digit (country code) if it exists
              const withoutCountryCode = clean.length > 10 ? clean.slice(2) : clean;
              // Add '9' after DDD if it's a mobile number (8 digits after DDD)
              if (withoutCountryCode.length === 10) {
                return withoutCountryCode.slice(0, 2) + '9' + withoutCountryCode.slice(2);
              }
              return withoutCountryCode;
            };

            // Try to find user with formatted phone number
            const formattedWhatsAppPhone = cleanWhatsAppPhone(message.from);
            console.log('📱 Comparando números:', {
              whatsapp: formattedWhatsAppPhone,
              original: message.from
            });
            
            // Get all users and find matching phone
            const allUsers = await prisma.user.findMany({
              where: {
                phone: {
                  not: ''
                }
              }
            });

            // Find user with matching formatted phone number
            const existingUser = allUsers.find(dbUser => 
              cleanDbPhone(dbUser.phone) === formattedWhatsAppPhone
            );

            if (existingUser) {
              console.log('✅ Usuário encontrado com número formatado:', existingUser.id);
              user = existingUser;
            } else {
              // Create new user if no match found
              const cleanPhone = message.from.replace(/[^0-9]/g, '');
              const userName = message.pushName;
              
              user = await prisma.user.create({
                data: {
                  name: userName || 'Usuário WhatsApp',
                  email: `wa_${cleanPhone}@txai.com`,
                  phone: message.from,
                  profile: 'USER' as Profile,
                  password: 'whatsapp123'
                }
              });
              console.log('✅ Novo usuário criado:', user.id);
            }
          }

          // Get user's last call
          const lastCall = await prisma.call.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
          });

          const now = new Date();
          let call;

          if (lastCall) {
            const timeDiff = now.getTime() - new Date(lastCall.createdAt).getTime();
            const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

            if (timeDiff < fiveMinutes) {
              // Update existing call description with just a line break
              const newDescription = `${lastCall.description}\n${message.body || 'Mídia enviada'}`;

              call = await prisma.call.update({
                where: { id: lastCall.id },
                data: { description: newDescription }
              });
              console.log('📝 Chamado atualizado:', call.id);
            } else {
              // Create new call
              call = await prisma.call.create({
                data: {
                  title: message.type !== 'chat' ? 'Chamado criado por imagem' : message.body.substring(0, 100),
                  description: message.type !== 'chat' ? 'Chamado criado por imagem' : message.body,
                  status: 'OPEN',
                  priority: 'MEDIUM',
                  userId: user.id
                }
              });
              console.log('📝 Novo chamado criado:', call.id);
            }
          } else {
            // Create new call
            call = await prisma.call.create({
              data: {
                title: message.type !== 'chat' ? 'Chamado criado por imagem' : message.body.substring(0, 100),
                description: message.type !== 'chat' ? 'Chamado criado por imagem' : message.body,
                status: 'OPEN',
                priority: 'MEDIUM',
                userId: user.id
              }
            });
            console.log('📝 Novo chamado criado:', call.id);
          }

          // Handle media files
          if (message.type === 'image' || message.type === 'video' || message.type === 'document') {
            try {
              if (!call) {
                console.log('⚠️ Nenhum chamado encontrado para anexar a mídia');
                return;
              }

              console.log('📎 Anexando mídia ao chamado:', call.id);

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
                  callId: call.id
                }
              });
              console.log('📎 Mídia salva:', filename, 'Tipo:', message.mimetype);
            } catch (error) {
              console.error('Erro ao salvar mídia:', error);
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

  // Método para debug de mensagens
  private logMessageDetails(message: any) {
    console.log('\n🔍 Detalhes completos da mensagem:');
    console.log('----------------------------------------');
    Object.entries(message).forEach(([key, value]) => {
      if (typeof value !== 'function') {
        console.log(`${key}:`, value);
      }
    });
    console.log('----------------------------------------\n');
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