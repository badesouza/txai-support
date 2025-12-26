import type { WhatsAppConnectionStatus, SessionInfo } from './whatsapp.types';
import { sessionManager, SessionManager } from './session-manager.service';

export interface WhatsAppService {
  /** Initialize the WhatsApp provider (start session, prepare token, etc). */
  initialize: (session?: string) => Promise<void>;
  /** Disconnect current session/provider. */
  disconnect: (session?: string) => Promise<void>;
  /** Send a text message. */
  sendMessage: (phone: string, message: string, session?: string) => Promise<void>;
  /** Get a QR code data URL (or null if connected / not ready). */
  getQrCode: (session?: string) => Promise<string | null>;
  /** Get connection status. */
  getConnectionStatus: (session?: string) => WhatsAppConnectionStatus | Promise<WhatsAppConnectionStatus>;
  /** Handle inbound webhook events (no-op for direct driver). */
  handleWebhookEvent: (payload: unknown, session?: string) => Promise<void>;
  
  // Multi-session management
  /** List all sessions. */
  listSessions: () => Promise<{ sessions: SessionInfo[]; defaultSession: string }>;
  /** Create a new session. */
  createSession: (name: string) => Promise<SessionInfo>;
  /** Delete a session. */
  deleteSession: (name: string) => Promise<void>;
  /** Get session info. */
  getSessionInfo: (name: string) => Promise<SessionInfo>;
  /** Get the session manager instance. */
  getSessionManager: () => SessionManager;
}

function createWhatsAppService(): WhatsAppService {
  // WhatsApp integration is handled by an external WPPConnect-Server.
  // Backend is only an HTTP client + webhook receiver (no direct driver, no local sessions).
  // The sessionManager handles multiple sessions.
  
  const getSession = (name?: string) => {
    return name ? sessionManager.getOrCreateSession(name) : sessionManager.getDefaultSession();
  };

  return {
    initialize: (session) => getSession(session).initialize(),
    disconnect: (session) => getSession(session).disconnect(),
    sendMessage: (phone, message, session) => getSession(session).sendMessage(phone, message),
    getQrCode: (session) => getSession(session).getQrCode(),
    getConnectionStatus: (session) => getSession(session).getConnectionStatus(),
    handleWebhookEvent: (payload, session) => sessionManager.handleWebhookEvent(payload, session),
    
    // Multi-session management
    listSessions: () => sessionManager.listSessions(),
    createSession: (name) => sessionManager.createSession(name),
    deleteSession: (name) => sessionManager.deleteSession(name),
    getSessionInfo: (name) => sessionManager.getSessionInfo(name),
    getSessionManager: () => sessionManager,
  };
}

export const whatsappService = createWhatsAppService();

