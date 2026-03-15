import { Request, Response } from 'express';
import { whatsappService } from '../services/whatsapp/whatsapp.service';
import { WhatsAppMessageRepository } from '../repositories';
import { storage } from '../storage/storage';

export class WhatsAppController {
  private lastStatusCheck = 0;
  private statusCache: { connected: boolean; qrCode: string | null; phone?: string | null } | null = null;
  private readonly CACHE_DURATION = 3000; // 3 seconds cache
  private lastQrCodeRequest = 0;
  private lastQrCodeGenerated: string | null = null;
  private readonly QR_CODE_DEBOUNCE = 5000; // 5 segundos entre requisições de QR Code

  private requireSessionParam(req: Request, res: Response): string | null {
    const { session } = req.params;
    if (!session) {
      res.status(400).json({ error: 'Session name is required' });
      return null;
    }

    return session;
  }

  async initialize(req: Request, res: Response) {
    try {
      await whatsappService.initialize();
      res.json({ success: true, message: 'WhatsApp initialization requested' });
    } catch (error) {
      res.status(500).json({ error: 'Error initializing WhatsApp' });
    }
  }

  async disconnect(req: Request, res: Response) {
    try {
      console.log('🔌 Controller: Iniciando desconexão do WhatsApp...');
      await whatsappService.disconnect();
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
      try {
        await whatsappService.disconnect();
      } catch (error) {
        // Best-effort disconnect: WPPConnect-Server can return errors when no session exists yet.
        console.warn('⚠️ Controller: Falha ao desconectar (continuando):', error);
      }
      await whatsappService.initialize();
      return res.json({ success: true, message: 'WhatsApp reconnection requested' });
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

      const { isConnected: status, hasQRCode: _hasQRCode, qrCode } = await whatsappService.getConnectionStatus();
      const phone = null;

      if (status) {
        this.lastQrCodeGenerated = null;
      }
      if (status || qrCode) {
        console.log('WhatsApp Status:', { status, hasQRCode: !!qrCode });
      }
      const response = { connected: status, qrCode: qrCode || null, phone };
      this.statusCache = response;
      this.lastStatusCheck = now;
      res.json(response);
    } catch (error) {
      console.error('Error getting WhatsApp status:', error);
      res.status(500).json({ error: 'Error getting WhatsApp status' });
    }
  }

  async getQrCode(req: Request, res: Response) {
    try {
      const now = Date.now();
      console.log(`📱 GET /qrcode - Solicitação recebida (última: ${now - this.lastQrCodeRequest}ms atrás)`);
      
      // Primeiro verificar se já está conectado (antes de qualquer cache/debounce)
      const { isConnected: connected } = await whatsappService.getConnectionStatus();
      const phone = null;
      
      if (connected) {
        console.log('✅ WhatsApp já conectado:', phone);
        this.lastQrCodeGenerated = null; // Limpar cache
        return res.json({ connected: true, qrCode: null, phone });
      }
      
      // DEBOUNCE: Se a última requisição foi há menos de 5 segundos, retornar o QR code em cache
      if (this.lastQrCodeGenerated && (now - this.lastQrCodeRequest) < this.QR_CODE_DEBOUNCE) {
        console.log(`⏭️ DEBOUNCE: Retornando QR Code em cache (${now - this.lastQrCodeRequest}ms < ${this.QR_CODE_DEBOUNCE}ms)`);
        return res.json({ connected: false, qrCode: this.lastQrCodeGenerated, phone: null });
      }
      
      console.log('📱 Não conectado - gerando NOVO QR Code...');
      this.lastQrCodeRequest = now;
      
      // Get QR code from the direct service
      const qrCode = await whatsappService.getQrCode();
      if (qrCode === null) {
        // Not connected, but QR isn't ready yet.
        return res.status(202).json({ connected: false, qrCode: null, phone: null, state: 'GENERATING_QR' });
      }
      
      // qr é um data URL completo (data:image/png;base64,...)
      console.log('✅ QR Code gerado com sucesso:', qrCode.substring(0, 50) + '...');
      this.lastQrCodeGenerated = qrCode; // Salvar em cache
      return res.json({ connected: false, qrCode, phone: null, state: 'QR_READY' });
      
    } catch (error) {
      console.error('❌ Erro ao gerar QR Code:', error);
      res.status(500).json({ error: 'Error generating QR code' });
    }
  }

  async sendMessage(req: Request, res: Response) {
    try {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
      }
      await whatsappService.sendMessage(phone, message);
      res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Error sending message' });
    }
  }

  async webhook(req: Request, res: Response) {
    try {
      const token = String(req.query.token ?? req.header('x-webhook-token') ?? '');
      const expected = String(process.env.WPPCONNECT_WEBHOOK_SECRET ?? '');

      if (!expected || token !== expected) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await whatsappService.handleWebhookEvent(req.body);
      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ Error handling WhatsApp webhook:', error);
      return res.status(500).json({ error: 'Error handling webhook' });
    }
  }

  async sendImage(req: Request, res: Response) {
    try {
      res.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      res.status(500).json({ error: 'Error sending image' });
    }
  }

  async getMessageHistory(req: Request, res: Response) {
    try {
      const { callId, phone } = req.query;
      
      if (callId) {
        const messages = await WhatsAppMessageRepository.findByCallId(String(callId));
        const hydrated = await Promise.all(
          messages.map(async (m) => {
            if (!m.mediaPath) return { ...m, mediaUrl: null };
            try {
              const mediaUrl = await storage.getFileUrl(m.mediaPath);
              return { ...m, mediaUrl };
            } catch {
              return { ...m, mediaUrl: null };
            }
          })
        );
        res.json({ messages: hydrated });
      } else if (phone) {
        const messages = await WhatsAppMessageRepository.findByPhone(String(phone));
        res.json({ messages });
      } else {
        res.status(400).json({ error: 'callId or phone parameter required' });
      }
    } catch (error) {
      console.error('Error getting message history:', error);
      res.status(500).json({ error: 'Error getting message history' });
    }
  }

  // ========================================
  // Multi-Session Management Endpoints
  // ========================================

  /**
   * List all WhatsApp sessions.
   * GET /api/whatsapp/sessions
   */
  async listSessions(req: Request, res: Response) {
    try {
      const result = await whatsappService.listSessions();
      res.json(result);
    } catch (error) {
      console.error('Error listing sessions:', error);
      res.status(500).json({ error: 'Error listing sessions' });
    }
  }

  /**
   * Create a new WhatsApp session.
   * POST /api/whatsapp/sessions
   * Body: { name: "session-name" }
   */
  async createSession(req: Request, res: Response) {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Session name is required' });
      }

      const session = await whatsappService.createSession(name);
      res.json({ success: true, session });
    } catch (error) {
      console.error('Error creating session:', error);
      const message = error instanceof Error ? error.message : 'Error creating session';
      res.status(500).json({ error: message });
    }
  }

  /**
   * Delete a WhatsApp session.
   * DELETE /api/whatsapp/sessions/:session
   */
  async deleteSession(req: Request, res: Response) {
    try {
      const session = this.requireSessionParam(req, res);
      if (!session) return;

      await whatsappService.deleteSession(session);
      res.json({ success: true, message: `Session ${session} deleted` });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ error: 'Error deleting session' });
    }
  }

  /**
   * Get info about a specific session.
   * GET /api/whatsapp/sessions/:session
   */
  async getSessionInfo(req: Request, res: Response) {
    try {
      const session = this.requireSessionParam(req, res);
      if (!session) return;

      const info = await whatsappService.getSessionInfo(session);
      res.json(info);
    } catch (error) {
      console.error('Error getting session info:', error);
      res.status(500).json({ error: 'Error getting session info' });
    }
  }

  /**
   * Get QR code for a specific session.
   * GET /api/whatsapp/sessions/:session/qrcode
   */
  async getSessionQrCode(req: Request, res: Response) {
    try {
      const session = this.requireSessionParam(req, res);
      if (!session) return;

      // First check connection status
      const { isConnected } = await whatsappService.getConnectionStatus(session);
      
      if (isConnected) {
        return res.json({ connected: true, qrCode: null, session });
      }

      const qrCode = await whatsappService.getQrCode(session);
      
      if (qrCode === null) {
        return res.status(202).json({ connected: false, qrCode: null, session, state: 'GENERATING_QR' });
      }
      
      res.json({ connected: false, qrCode, session, state: 'QR_READY' });
    } catch (error) {
      console.error('Error getting session QR code:', error);
      res.status(500).json({ error: 'Error getting QR code' });
    }
  }

  /**
   * Get status of a specific session.
   * GET /api/whatsapp/sessions/:session/status
   */
  async getSessionStatus(req: Request, res: Response) {
    try {
      const session = this.requireSessionParam(req, res);
      if (!session) return;

      const { isConnected, hasQRCode, qrCode } = await whatsappService.getConnectionStatus(session);
      res.json({ session, connected: isConnected, hasQRCode, qrCode: qrCode || null });
    } catch (error) {
      console.error('Error getting session status:', error);
      res.status(500).json({ error: 'Error getting session status' });
    }
  }

  /**
   * Initialize a specific session.
   * POST /api/whatsapp/sessions/:session/initialize
   */
  async initializeSession(req: Request, res: Response) {
    try {
      const session = this.requireSessionParam(req, res);
      if (!session) return;

      await whatsappService.initialize(session);
      res.json({ success: true, message: `Session ${session} initialization requested` });
    } catch (error) {
      console.error('Error initializing session:', error);
      res.status(500).json({ error: 'Error initializing session' });
    }
  }

  /**
   * Disconnect a specific session.
   * POST /api/whatsapp/sessions/:session/disconnect
   */
  async disconnectSession(req: Request, res: Response) {
    try {
      const session = this.requireSessionParam(req, res);
      if (!session) return;

      await whatsappService.disconnect(session);
      res.json({ success: true, message: `Session ${session} disconnected` });
    } catch (error) {
      console.error('Error disconnecting session:', error);
      res.status(500).json({ error: 'Error disconnecting session' });
    }
  }

  /**
   * Send message through a specific session.
   * POST /api/whatsapp/sessions/:session/send-message
   * Body: { phone: "...", message: "..." }
   */
  async sendMessageViaSession(req: Request, res: Response) {
    try {
      const session = this.requireSessionParam(req, res);
      const { phone, message } = req.body;
      if (!session) return;
      
      if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
      }

      await whatsappService.sendMessage(phone, message, session);
      res.json({ success: true, message: 'Message sent successfully', session });
    } catch (error) {
      console.error('Error sending message via session:', error);
      res.status(500).json({ error: 'Error sending message' });
    }
  }
}
