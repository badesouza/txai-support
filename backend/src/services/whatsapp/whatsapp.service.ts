import type { WhatsAppConnectionStatus } from './whatsapp.types';
import { WPPConnectServerService } from './wppconnect-server.service';

export interface WhatsAppService {
  /** Initialize the WhatsApp provider (start session, prepare token, etc). */
  initialize: () => Promise<void>;
  /** Disconnect current session/provider. */
  disconnect: () => Promise<void>;
  /** Send a text message. */
  sendMessage: (phone: string, message: string) => Promise<void>;
  /** Get a QR code data URL (or null if connected / not ready). */
  getQrCode: () => Promise<string | null>;
  /** Get connection status. */
  getConnectionStatus: () => WhatsAppConnectionStatus | Promise<WhatsAppConnectionStatus>;
  /** Handle inbound webhook events (no-op for direct driver). */
  handleWebhookEvent: (payload: unknown) => Promise<void>;
}

function createWhatsAppService(): WhatsAppService {
  // WhatsApp integration is handled by an external WPPConnect-Server.
  // Backend is only an HTTP client + webhook receiver (no direct driver, no local sessions).
  const server = new WPPConnectServerService();
  return {
    initialize: () => server.initialize(),
    disconnect: () => server.disconnect(),
    sendMessage: (phone, message) => server.sendMessage(phone, message),
    getQrCode: () => server.getQrCode(),
    getConnectionStatus: () => server.getConnectionStatus(),
    handleWebhookEvent: (payload) => server.handleWebhookEvent(payload),
  };
}

export const whatsappService = createWhatsAppService();


