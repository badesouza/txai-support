import { Request, Response } from 'express';
import { whatsappService } from '../services/whatsapp.service';
import { WhatsAppMessageService } from '../services/whatsapp-message.service';

export class WhatsAppController {
  private lastStatusCheck = 0;
  private statusCache: { connected: boolean; qrCode: string | null; phone?: string | null } | null = null;
  private readonly CACHE_DURATION = 3000; // 3 seconds cache

  async initialize(req: Request, res: Response) {
    try {
      await whatsappService.startSession();
      res.json({ success: true, message: 'WhatsApp initialization requested' });
    } catch (error) {
      res.status(500).json({ error: 'Error initializing WhatsApp' });
    }
  }

  async disconnect(req: Request, res: Response) {
    try {
      console.log('🔌 Controller: Iniciando desconexão do WhatsApp...');
      await whatsappService.closeSession();
      console.log('✅ Controller: WhatsApp desconectado');
      res.json({ message: 'WhatsApp disconnected successfully' });
    } catch (error) {
      console.error('❌ Controller: Erro ao desconectar WhatsApp:', error);
      // Always return success to force state reset
      res.json({ message: 'WhatsApp disconnected successfully (forced)' });
    }
  }

  async reconnect(req: Request, res: Response) {
    try {
      console.log('🔄 Controller: Recriando sessão...');
      await whatsappService.closeSession().catch((e: any) => {
        console.warn('closeSession warning:', e?.response?.status || e?.message);
      });
      try {
        await whatsappService.startSession();
        return res.json({ success: true, message: 'WhatsApp reconnection requested' });
      } catch (e: any) {
        console.warn('startSession warning:', e?.response?.status || e?.message);
        return res.status(202).json({ success: true, message: 'Session start requested', note: 'Await QR/status' });
      }
    } catch (error) {
      console.error('❌ Controller: Erro ao reconectar WhatsApp:', error);
      res.status(500).json({ error: 'Error reconnecting WhatsApp' });
    }
  }

  async getStatus(req: Request, res: Response) {
    try {
      // simple server-side cache to coalesce rapid polling
      const now = Date.now();
      if (this.statusCache && now - this.lastStatusCheck < this.CACHE_DURATION) {
        return res.json(this.statusCache);
      }

      const { connected: status, qrCode, phone } = await whatsappService.getStatus();
      
      // Only log when there's actual activity (connected or QR code available)
      if (status || qrCode) {
        console.log('WhatsApp Status:', { status, hasQRCode: !!qrCode });
      }
      // Always return JSON, even when not connected and no QR code
      const response = { connected: status, qrCode, phone };
      this.statusCache = response;
      this.lastStatusCheck = now;
      res.json(response);
    } catch (error) {
      console.error('Error getting WhatsApp status:', error);
      res.status(500).json({ error: 'Error getting WhatsApp status' });
    }
  }

  async sendMessage(req: Request, res: Response) {
    try {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
      }

      const result = await whatsappService.sendMessage(phone, message);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Error sending message' });
    }
  }

  async sendImage(req: Request, res: Response) {
    try {
      res.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      res.status(500).json({ error: 'Error sending image' });
    }
  }

  async webhook(req: Request, res: Response) {
    try {
      console.log('📱 WhatsApp webhook received:', req.body);
      
      // WPPConnect envia mensagens em diferentes formatos
      const webhookData = req.body;
      
      // Verificar se é uma mensagem de texto
      if (webhookData.event === 'messages.upsert' && webhookData.data) {
        const messageData = webhookData.data;
        
        if (messageData.message && messageData.message.conversation) {
          const message = {
            phone: messageData.key.remoteJid.replace('@s.whatsapp.net', ''),
            message: messageData.message.conversation,
            messageType: 'text',
            timestamp: messageData.messageTimestamp
          };
          
          // Processar a mensagem de forma assíncrona
          WhatsAppMessageService.processIncomingMessage(message).catch(error => {
            console.error('❌ Error processing webhook message:', error);
          });
        }
      }
      
      // Sempre retornar 200 para o WPPConnect
      res.status(200).json({ status: 'received' });
      
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing error' });
    }
  }

  async getMessageHistory(req: Request, res: Response) {
    try {
      const { callId, phone } = req.query;
      
      if (callId) {
        const messages = await WhatsAppMessageService.getCallMessageHistory(Number(callId));
        res.json({ messages });
      } else if (phone) {
        const messages = await WhatsAppMessageService.getPhoneMessageHistory(String(phone));
        res.json({ messages });
      } else {
        res.status(400).json({ error: 'callId or phone parameter required' });
      }
    } catch (error) {
      console.error('Error getting message history:', error);
      res.status(500).json({ error: 'Error getting message history' });
    }
  }
} 