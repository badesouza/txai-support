import { Request, Response } from 'express';
import { whatsappService } from '../services/whatsapp/whatsapp.service';
import { WhatsAppMessageRepository } from '../repositories';
import { storage } from '../storage/storage';
import { createLogger } from '../utils/logger';

const logger = createLogger('WhatsAppController');

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
      logger.warn('Session-scoped endpoint called without session param', {
        path: req.path,
        method: req.method,
      });
      res.status(400).json({ error: 'Session name is required' });
      return null;
    }

    return session;
  }

  async initialize(req: Request, res: Response) {
    try {
      logger.info('Initializing default WhatsApp session');
      await whatsappService.initialize();
      res.json({ success: true, message: 'WhatsApp initialization requested' });
    } catch (error) {
      logger.error('Failed to initialize default WhatsApp session', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Error initializing WhatsApp' });
    }
  }

  async disconnect(req: Request, res: Response) {
    try {
      logger.info('Disconnecting default WhatsApp session');
      await whatsappService.disconnect();
      res.json({ message: 'WhatsApp disconnected successfully' });
    } catch (error) {
      logger.warn('Disconnect failed but API returned forced success', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Always return success to force state reset
      res.json({ message: 'WhatsApp disconnected successfully (forced)' });
    }
  }

  async reconnect(req: Request, res: Response) {
    try {
      logger.info('Reconnecting default WhatsApp session');
      try {
        await whatsappService.disconnect();
      } catch (error) {
        // Best-effort disconnect: WPPConnect-Server can return errors when no session exists yet.
        logger.warn('Best-effort disconnect failed during reconnect', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      await whatsappService.initialize();
      return res.json({ success: true, message: 'WhatsApp reconnection requested' });
    } catch (error) {
      logger.error('Failed to reconnect default WhatsApp session', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.debug('Returning WhatsApp status', { connected: status, hasQRCode: !!qrCode });
      const response = { connected: status, qrCode: qrCode || null, phone };
      this.statusCache = response;
      this.lastStatusCheck = now;
      res.json(response);
    } catch (error) {
      logger.error('Failed to fetch WhatsApp status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Error getting WhatsApp status' });
    }
  }

  async getQrCode(req: Request, res: Response) {
    try {
      const now = Date.now();
      logger.debug('QR code requested', { millisSinceLastRequest: now - this.lastQrCodeRequest });
      
      // Primeiro verificar se já está conectado (antes de qualquer cache/debounce)
      const { isConnected: connected } = await whatsappService.getConnectionStatus();
      const phone = null;
      
      if (connected) {
        this.lastQrCodeGenerated = null; // Limpar cache
        return res.json({ connected: true, qrCode: null, phone });
      }
      
      // DEBOUNCE: Se a última requisição foi há menos de 5 segundos, retornar o QR code em cache
      if (this.lastQrCodeGenerated && (now - this.lastQrCodeRequest) < this.QR_CODE_DEBOUNCE) {
        logger.debug('Returning cached QR code due to debounce window', {
          millisSinceLastRequest: now - this.lastQrCodeRequest,
        });
        return res.json({ connected: false, qrCode: this.lastQrCodeGenerated, phone: null });
      }
      
      logger.info('Generating a new QR code for default session');
      this.lastQrCodeRequest = now;
      
      // Get QR code from the direct service
      const qrCode = await whatsappService.getQrCode();
      if (qrCode === null) {
        // Not connected, but QR isn't ready yet.
        return res.status(202).json({ connected: false, qrCode: null, phone: null, state: 'GENERATING_QR' });
      }
      
      logger.debug('QR code generated successfully', {
        preview: qrCode.substring(0, 50),
      });
      this.lastQrCodeGenerated = qrCode; // Salvar em cache
      return res.json({ connected: false, qrCode, phone: null, state: 'QR_READY' });
      
    } catch (error) {
      logger.error('Failed to generate QR code', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.error('Failed to send WhatsApp message', {
        phone: req.body?.phone,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Error sending message' });
    }
  }

  async webhook(req: Request, res: Response) {
    try {
      const token = String(req.query.token ?? req.header('x-webhook-token') ?? '');
      const expected = String(process.env.WPPCONNECT_WEBHOOK_SECRET ?? '');

      if (!expected || token !== expected) {
        logger.warn('Rejected WhatsApp webhook due to invalid token');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await whatsappService.handleWebhookEvent(req.body);
      return res.json({ ok: true });
    } catch (error) {
      logger.error('Failed to handle WhatsApp webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.error('Failed to fetch WhatsApp message history', {
        callId: req.query.callId,
        phone: req.query.phone,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.debug('Listing WhatsApp sessions');
      const result = await whatsappService.listSessions();
      res.json(result);
    } catch (error) {
      logger.error('Failed to list WhatsApp sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.info('Created WhatsApp session', { session: name });
      res.json({ success: true, session });
    } catch (error) {
      logger.error('Failed to create WhatsApp session', {
        session: req.body?.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.info('Deleted WhatsApp session', { session });
      res.json({ success: true, message: `Session ${session} deleted` });
    } catch (error) {
      logger.error('Failed to delete WhatsApp session', {
        session: req.params.session,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.error('Failed to fetch WhatsApp session info', {
        session: req.params.session,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.error('Failed to fetch QR code for WhatsApp session', {
        session: req.params.session,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.error('Failed to fetch WhatsApp session status', {
        session: req.params.session,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.info('Initialized WhatsApp session', { session });
      res.json({ success: true, message: `Session ${session} initialization requested` });
    } catch (error) {
      logger.error('Failed to initialize WhatsApp session', {
        session: req.params.session,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.info('Disconnected WhatsApp session', { session });
      res.json({ success: true, message: `Session ${session} disconnected` });
    } catch (error) {
      logger.error('Failed to disconnect WhatsApp session', {
        session: req.params.session,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.info('Sent WhatsApp session-scoped message', { session, phone });
      res.json({ success: true, message: 'Message sent successfully', session });
    } catch (error) {
      logger.error('Failed to send message via WhatsApp session', {
        session: req.params.session,
        phone: req.body?.phone,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Error sending message' });
    }
  }
}
