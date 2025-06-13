import { Request, Response } from 'express';
import { whatsappService } from '../services/whatsapp.service';

export class WhatsAppController {
  async initialize(req: Request, res: Response) {
    try {
      const success = await whatsappService.initialize();
      if (success) {
        res.json({ message: 'WhatsApp initialization started' });
      } else {
        res.status(500).json({ error: 'Failed to initialize WhatsApp' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error initializing WhatsApp' });
    }
  }

  async disconnect(req: Request, res: Response) {
    try {
      await whatsappService.disconnect();
      res.json({ message: 'WhatsApp disconnected successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error disconnecting WhatsApp' });
    }
  }

  async reconnect(req: Request, res: Response) {
    try {
      const success = await whatsappService.reconnect();
      if (success) {
        res.json({ message: 'WhatsApp reconnection started' });
      } else {
        res.status(500).json({ error: 'Failed to reconnect WhatsApp' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error reconnecting WhatsApp' });
    }
  }

  async getStatus(req: Request, res: Response) {
    try {
      const status = whatsappService.getConnectionStatus();
      const qrCode = whatsappService.getQRCode();
      console.log('WhatsApp Status:', { status, hasQRCode: !!qrCode });
      res.json({ connected: status, qrCode });
    } catch (error) {
      console.error('Error getting WhatsApp status:', error);
      res.status(500).json({ error: 'Error getting WhatsApp status' });
    }
  }

  async sendMessage(req: Request, res: Response) {
    try {
      const { to, message } = req.body;
      if (!to || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      await whatsappService.sendMessage(to, message);
      res.json({ message: 'Message sent successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error sending message' });
    }
  }

  async sendImage(req: Request, res: Response) {
    try {
      const { to, imagePath, caption } = req.body;
      if (!to || !imagePath) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      await whatsappService.sendImage(to, imagePath, caption);
      res.json({ message: 'Image sent successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error sending image' });
    }
  }
} 