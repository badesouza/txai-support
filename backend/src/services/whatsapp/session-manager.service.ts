import { WPPConnectServerService, WPPConnectServerConfig } from './wppconnect-server.service';
import type { SessionInfo, WhatsAppConnectionStatus } from './whatsapp.types';

/**
 * SessionManager - Manages multiple WPPConnect sessions.
 * 
 * Each session corresponds to a separate WhatsApp account that can be
 * connected to the WPPConnect-Server running on the VM.
 */
export class SessionManager {
  private sessions: Map<string, WPPConnectServerService> = new Map();
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly defaultSessionName: string;

  constructor() {
    this.baseUrl = process.env.WPPCONNECT_BASE_URL ?? 'http://localhost:21465';
    this.secretKey = process.env.WPPCONNECT_SECRET_KEY ?? 'THISISMYSECURETOKEN';
    this.webhookSecret = process.env.WPPCONNECT_WEBHOOK_SECRET ?? 'txai-webhook-secret';
    this.defaultSessionName = process.env.WPPCONNECT_SESSION ?? 'txai-whatsapp';

    // Create the default session
    this.getOrCreateSession(this.defaultSessionName);
  }

  /**
   * Get an existing session or create a new one.
   */
  getOrCreateSession(name: string): WPPConnectServerService {
    const existing = this.sessions.get(name);
    if (existing) {
      return existing;
    }

    const config: WPPConnectServerConfig = {
      baseUrl: this.baseUrl,
      session: name,
      secretKey: this.secretKey,
      webhookSecret: this.webhookSecret,
    };

    const service = new WPPConnectServerService(config);
    this.sessions.set(name, service);
    return service;
  }

  /**
   * Get the default session.
   */
  getDefaultSession(): WPPConnectServerService {
    return this.getOrCreateSession(this.defaultSessionName);
  }

  /**
   * Get the default session name.
   */
  getDefaultSessionName(): string {
    return this.defaultSessionName;
  }

  /**
   * Get a specific session by name.
   * Returns undefined if the session doesn't exist locally.
   */
  getSession(name: string): WPPConnectServerService | undefined {
    return this.sessions.get(name);
  }

  /**
   * List all sessions from the WPPConnect-Server.
   * This queries the server directly to get the most up-to-date list.
   */
  async listSessions(): Promise<{ sessions: SessionInfo[]; defaultSession: string }> {
    try {
      const sessions = await WPPConnectServerService.listAllSessions(this.baseUrl, this.secretKey);
      
      // Ensure we have local instances for all known sessions
      for (const session of sessions) {
        if (!this.sessions.has(session.name)) {
          this.getOrCreateSession(session.name);
        }
      }

      return {
        sessions,
        defaultSession: this.defaultSessionName,
      };
    } catch (error) {
      console.error('Error listing sessions:', error);
      
      // Fall back to returning local sessions with their status
      const localSessions: SessionInfo[] = [];
      for (const [name, service] of this.sessions) {
        try {
          const info = await service.getSessionInfo();
          localSessions.push(info);
        } catch {
          localSessions.push({ name, status: 'UNKNOWN', phone: null });
        }
      }

      return {
        sessions: localSessions.length > 0 ? localSessions : [{ name: this.defaultSessionName, status: 'UNKNOWN', phone: null }],
        defaultSession: this.defaultSessionName,
      };
    }
  }

  /**
   * Create a new session.
   */
  async createSession(name: string): Promise<SessionInfo> {
    // Validate session name
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error('Invalid session name. Use only letters, numbers, underscores, and hyphens.');
    }

    const service = this.getOrCreateSession(name);
    
    // Start the session on the server
    return service.startNewSession();
  }

  /**
   * Delete/close a session.
   */
  async deleteSession(name: string): Promise<void> {
    const service = this.sessions.get(name);
    if (service) {
      await service.disconnect();
      this.sessions.delete(name);
    } else {
      // Try to close it on the server anyway
      const tempService = new WPPConnectServerService({
        baseUrl: this.baseUrl,
        session: name,
        secretKey: this.secretKey,
        webhookSecret: this.webhookSecret,
      });
      await tempService.disconnect();
    }
  }

  /**
   * Get session info for a specific session.
   */
  async getSessionInfo(name: string): Promise<SessionInfo> {
    const service = this.getOrCreateSession(name);
    return service.getSessionInfo();
  }

  /**
   * Get QR code for a specific session.
   */
  async getQrCode(name: string): Promise<string | null> {
    const service = this.getOrCreateSession(name);
    return service.getQrCode();
  }

  /**
   * Get connection status for a specific session.
   */
  async getConnectionStatus(name: string): Promise<WhatsAppConnectionStatus> {
    const service = this.getOrCreateSession(name);
    return service.getConnectionStatus();
  }

  /**
   * Initialize a specific session.
   */
  async initializeSession(name: string): Promise<void> {
    const service = this.getOrCreateSession(name);
    return service.initialize();
  }

  /**
   * Handle webhook event - route to appropriate session.
   * The session name can be extracted from the event payload.
   */
  async handleWebhookEvent(payload: unknown, sessionName?: string): Promise<void> {
    const name = sessionName ?? this.defaultSessionName;
    const service = this.getOrCreateSession(name);
    return service.handleWebhookEvent(payload);
  }

  /**
   * Send a message through a specific session.
   */
  async sendMessage(sessionName: string, phone: string, message: string): Promise<void> {
    const service = this.getOrCreateSession(sessionName);
    return service.sendMessage(phone, message);
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

