import { 
  CallRepository, 
  UserRepository, 
  CallMessageRepository,
  CallAttachmentRepository,
} from '../../repositories';
import { storage } from '../../storage/storage';
import type { WhatsAppMessage } from './whatsapp.types';

interface MediaDownloadResult {
  base64?: string;
  mimetype?: string;
}

interface WhatsAppMessageProcessorDeps {
  downloadMediaByMessageId: (messageId: string) => Promise<MediaDownloadResult | null>;
  sendText: (phone: string, message: string) => Promise<void>;
  sessionName?: string;
}

export class WhatsAppMessageProcessor {
  private readonly pendingCallLocations: Map<string, { userId: string; timestamp: number }> = new Map();
  private readonly sessionName: string;

  constructor(private readonly deps: WhatsAppMessageProcessorDeps) {
    this.sessionName = deps.sessionName || process.env.WPPCONNECT_SESSION || 'txai-whatsapp';
  }

  /** Handle an inbound WhatsApp message and apply the call automation rules. */
  async handleIncomingMessage(message: WhatsAppMessage): Promise<void> {
    try {
      console.log('📨 [WhatsAppMessageProcessor] Incoming message received:');
      console.log(`   - Raw "from" field: "${message.from}"`);
      console.log(`   - Message type: "${message.type}"`);
      console.log(`   - Message body preview: "${String(message.body ?? '').slice(0, 50)}..."`);
      console.log(`   - Session: "${this.sessionName}"`);

      const phone = message.from.replace('@c.us', '');
      console.log(`   - Extracted phone (after removing @c.us): "${phone}"`);

      console.log('🔍 [WhatsAppMessageProcessor] Looking up user by phone...');
      const user = await UserRepository.findByPhone(phone);
      const userExists = Boolean(user);

      console.log(`👤 [WhatsAppMessageProcessor] User lookup result:`);
      console.log(`   - User exists: ${userExists}`);
      if (user) {
        console.log(`   - User ID: ${user.id}`);
        console.log(`   - User name: ${user.name}`);
        console.log(`   - User phone in DB: "${user.phone}"`);
      } else {
        console.log(`   ⚠️ No user found for phone "${phone}" - message will be processed without user association`);
      }

      await this.processMessage(message, userExists, user?.id);
    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
    }
  }

  /** Process a message by type and route it to the correct handler. */
  private async processMessage(message: WhatsAppMessage, userExists: boolean, userId?: string): Promise<void> {
    try {
      const phone = message.from.replace('@c.us', '');

      switch (message.type) {
        case 'text':
        case 'chat':
          await this.handleTextMessage(phone, String(message.body ?? ''), userExists, userId);
          return;
        case 'image':
          await this.handleImageMessage(phone, userExists, userId, message);
          return;
        case 'video':
          await this.handleVideoMessage(phone, userExists, userId, message);
          return;
        case 'document': {
          const mimetype = typeof message.mimetype === 'string' ? message.mimetype : undefined;
          const isImageDocument = mimetype?.startsWith('image/');
          const isVideoDocument = mimetype?.startsWith('video/');
          if (isImageDocument) {
            await this.handleImageMessage(phone, userExists, userId, message);
          } else if (isVideoDocument) {
            await this.handleVideoMessage(phone, userExists, userId, message);
          }
          return;
        }
        default:
          await this.handleTextMessage(phone, String(message.body ?? ''), userExists, userId);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  }

  /** Handle text messages (create call flow + attach messages to latest call). */
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

  /** Handle image messages and link the image to the user's last active call. */
  private async handleImageMessage(phone: string, userExists: boolean, userId?: string, message?: WhatsAppMessage): Promise<void> {
    try {
      console.log('🖼️ [handleImageMessage] Processing image message:');
      console.log(`   - Phone: ${phone}`);
      console.log(`   - User exists: ${userExists}`);
      console.log(`   - User ID: ${userId}`);
      console.log(`   - Message ID: ${message?.id}`);

      if (!userExists || !userId || !message) {
        console.log('ℹ️ Image ignored: user not registered or invalid message.');
        return;
      }

      const lastCall = await CallRepository.findActiveCallForUser(userId);
      if (!lastCall) {
        console.log('❌ No active call found for user');
        return;
      }
      console.log(`   - Found active call: ${lastCall.id} (${lastCall.title})`);

      const saved = await this.downloadAndSaveMedia(message, lastCall.id, 'image');
      console.log(`   - Media saved result:`, saved);

      // Create attachment and message in subcollections
      let attachmentId: string | undefined;
      if (saved) {
        attachmentId = await this.createAttachmentInSubcollection(lastCall.id, saved, 'image');
        console.log(`   - Created attachment in subcollection: ${attachmentId}`);
      } else {
        console.log(`   ⚠️ No media saved - attachment will be empty`);
      }

      const messageDoc = await CallMessageRepository.create(lastCall.id, {
        content: '[Imagem]',
        messageType: 'image',
        source: 'whatsapp',
        sessionName: this.sessionName,
        direction: 'inbound',
        senderPhone: phone,
        attachmentId,
        externalMessageId: typeof message.id === 'string' ? message.id : undefined,
      });
      console.log(`   - Created message in subcollection: ${messageDoc.id}`);

      await CallRepository.incrementMessageCount(lastCall.id, '[Imagem]');
      console.log('✅ Image processed and linked to call:', lastCall.id);
    } catch (error) {
      console.error('❌ Error handling image message:', error);
    }
  }

  /** Handle video messages and link the video to the user's last active call. */
  private async handleVideoMessage(phone: string, userExists: boolean, userId?: string, message?: WhatsAppMessage): Promise<void> {
    try {
      if (!userExists || !userId || !message) {
        console.log('ℹ️ Video ignored: user not registered or invalid message.');
        return;
      }

      const lastCall = await CallRepository.findActiveCallForUser(userId);
      if (!lastCall) {
        console.log('❌ No active call found for user');
        return;
      }

      const saved = await this.downloadAndSaveMedia(message, lastCall.id, 'video');

      // Create attachment and message in subcollections
      const attachmentId = saved ? await this.createAttachmentInSubcollection(lastCall.id, saved, 'video') : undefined;
      await CallMessageRepository.create(lastCall.id, {
        content: '[Vídeo]',
        messageType: 'video',
        source: 'whatsapp',
        sessionName: this.sessionName,
        direction: 'inbound',
        senderPhone: phone,
        attachmentId,
        externalMessageId: typeof message.id === 'string' ? message.id : undefined,
      });
      await CallRepository.incrementMessageCount(lastCall.id, '[Vídeo]');

      console.log('✅ Video processed and linked to call:', lastCall.id);
    } catch (error) {
      console.error('❌ Error handling video message:', error);
    }
  }

  /** Download media and persist it via the storage layer, linking it to the given call. */
  private async downloadAndSaveMedia(
    message: WhatsAppMessage,
    callId: string,
    kind: 'image' | 'video'
  ): Promise<{ relativePath: string; filename: string; mimetype: string } | null> {
    try {
      const messageId = typeof message.id === 'string' ? message.id : undefined;
      if (!messageId) {
        console.log(`⚠️ ${kind} message missing id; cannot download media`);
        return null;
      }

      let mediaData: Buffer | undefined;
      let mimetype: string | undefined = typeof message.mimetype === 'string' ? message.mimetype : undefined;

      const downloadedMedia = await this.deps.downloadMediaByMessageId(messageId);
      if (downloadedMedia?.base64) {
        let base64Data = downloadedMedia.base64;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1] ?? '';
        }
        base64Data = base64Data.trim().replace(/\s/g, '');
        mediaData = Buffer.from(base64Data, 'base64');
        mimetype = downloadedMedia.mimetype || mimetype;
      } else if (typeof message.body === 'string' && message.body.trim().length > 0) {
        // Fallback: sometimes the payload includes base64 in body
        const cleanedBody = message.body.trim().replace(/\s/g, '');
        mediaData = Buffer.from(cleanedBody, 'base64');
      }

      if (!mediaData || mediaData.length === 0) {
        console.log(`⚠️ ${kind} data is empty or invalid`);
        return null;
      }

      const timestamp = Date.now();
      const extension = this.getMediaExtension(mimetype || (kind === 'video' ? 'video/mp4' : 'image/jpeg'));
      const filename = `whatsapp-${timestamp}.${extension}`;

      const { relativePath } = await storage.saveBuffer({
        buffer: mediaData,
        filename,
        contentType: mimetype || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      });

      console.log(`✅ ${kind} saved:`, filename);
      return {
        relativePath,
        filename,
        mimetype: mimetype || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      };
    } catch (error) {
      console.error(`❌ Error downloading and saving ${kind}:`, error);
      return null;
    }
  }

  /** Return a safe file extension for a given mimetype (image/video). */
  private getMediaExtension(mimetype: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
      'video/3gpp': '3gp',
    };
    if (extensions[mimetype]) return extensions[mimetype];
    if (mimetype.startsWith('video/')) return 'mp4';
    return 'jpg';
  }

  /** Remove stale pending states for the "create call" flow. */
  private cleanExpiredPendingStates(): void {
    const now = Date.now();
    const EXPIRATION_TIME = 10 * 60 * 1000;

    for (const [phone, data] of this.pendingCallLocations.entries()) {
      if (now - data.timestamp > EXPIRATION_TIME) {
        this.pendingCallLocations.delete(phone);
      }
    }
  }

  /** Start the "create call" flow by asking for the location. */
  private async initiateCallCreationFlow(phone: string, userId: string): Promise<void> {
    try {
      this.pendingCallLocations.set(phone, { userId, timestamp: Date.now() });
      await this.sendAutoReply(phone, 'Qual o local do chamado?');
      console.log('✅ Call creation flow initiated, awaiting location');
    } catch (error) {
      console.error('❌ Error initiating call creation flow:', error);
    }
  }

  /** Finalize call creation with the given location. */
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
        userPhone: user?.phone,
      });

      await this.sendAutoReply(phone, `Novo chamado de número #${call.id.substring(0, 8)}`, {
        callId: call.id,
        userId,
      });

      // Create message in subcollection
      await CallMessageRepository.create(call.id, {
        content: location,
        messageType: 'text',
        source: 'whatsapp',
        sessionName: this.sessionName,
        direction: 'inbound',
        senderPhone: phone,
        senderName: user?.name,
      });
      await CallRepository.incrementMessageCount(call.id, location);

      console.log('✅ Call created with location:', location);
    } catch (error) {
      console.error('❌ Error handling call location response:', error);
    }
  }

  /** Attach a user message to the most recent active call. */
  private async updateLastCallWithMessage(phone: string, messageBody: string, userId: string): Promise<void> {
    try {
      const lastCall = await CallRepository.findActiveCallForUser(userId);
      if (!lastCall) {
        console.log('ℹ️ No active call found for user');
        return;
      }

      // Create message in subcollection
      const user = await UserRepository.findById(userId);
      await CallMessageRepository.create(lastCall.id, {
        content: messageBody,
        messageType: 'text',
        source: 'whatsapp',
        sessionName: this.sessionName,
        direction: 'inbound',
        senderPhone: phone,
        senderName: user?.name,
      });
      await CallRepository.incrementMessageCount(lastCall.id, messageBody);

      console.log('✅ Call updated with new message:', lastCall.id);
    } catch (error) {
      console.error('❌ Error updating last call with message:', error);
    }
  }

  /** Send an auto-reply message back to the user and persist it. */
  private async sendAutoReply(
    phone: string,
    message: string,
    meta?: { callId?: string; userId?: string }
  ): Promise<void> {
    try {
      await this.deps.sendText(phone, message);

      // Create message in subcollection if callId is present
      if (meta?.callId) {
        await CallMessageRepository.create(meta.callId, {
          content: message,
          messageType: 'text',
          source: 'system',
          sessionName: this.sessionName,
          direction: 'outbound',
        });
        await CallRepository.incrementMessageCount(meta.callId, message);
      }

      console.log('✅ Auto-reply sent successfully');
    } catch (error) {
      console.error('❌ Error sending auto-reply:', error);
    }
  }

  /** Helper to create an attachment in the new subcollection. */
  private async createAttachmentInSubcollection(
    callId: string,
    saved: { relativePath: string; filename: string; mimetype: string },
    _kind: 'image' | 'video'
  ): Promise<string> {
    const attachment = await CallAttachmentRepository.create(callId, {
      filename: saved.filename,
      path: saved.relativePath,
      mimetype: saved.mimetype,
      source: 'whatsapp',
      sessionName: this.sessionName,
    });
    await CallRepository.incrementAttachmentCount(callId);
    return attachment.id;
  }
}
