import type { WhatsAppConnectionStatus, WhatsAppMessage } from './whatsapp.types';
import { WhatsAppMessageProcessor } from './whatsapp-message-processor';

interface JsonRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeDataUrl(base64OrDataUrl: string): string {
  return base64OrDataUrl.startsWith('data:image') ? base64OrDataUrl : `data:image/png;base64,${base64OrDataUrl}`;
}

function extractToken(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === 'string') return payload.trim().length > 0 ? payload.trim() : null;
  if (!isRecord(payload)) return null;

  const direct = payload['token'];
  if (typeof direct === 'string' && direct.trim().length > 0) return direct.trim();

  const response = payload['response'];
  if (isRecord(response)) {
    const token = response['token'];
    if (typeof token === 'string' && token.trim().length > 0) return token.trim();
  }

  return null;
}

function extractWebhookMessage(payload: unknown): WhatsAppMessage | null {
  if (!isRecord(payload)) return null;

  const candidates: unknown[] = [
    payload,
    payload['data'],
    payload['message'],
    isRecord(payload['data']) ? (payload['data'] as JsonRecord)['message'] : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const from = candidate['from'];
    if (typeof from !== 'string' || from.trim().length === 0) continue;

    const body = typeof candidate['body'] === 'string' ? candidate['body'] : '';
    const type = typeof candidate['type'] === 'string' ? candidate['type'] : 'text';
    const timestamp =
      typeof candidate['timestamp'] === 'number'
        ? candidate['timestamp']
        : typeof candidate['t'] === 'number'
          ? candidate['t']
          : Date.now();
    const id =
      typeof candidate['id'] === 'string'
        ? candidate['id']
        : typeof candidate['msgId'] === 'string'
          ? candidate['msgId']
          : typeof candidate['messageId'] === 'string'
            ? candidate['messageId']
            : undefined;
    const mimetype = typeof candidate['mimetype'] === 'string' ? candidate['mimetype'] : undefined;

    return { from, body, type, timestamp, id, mimetype, ...candidate };
  }

  return null;
}

export class WPPConnectServerService {
  private readonly baseUrl: string;
  private readonly session: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  private token: string | null = null;
  private isStarting = false;
  private lastStartAttemptAt = 0;
  private readonly START_DEBOUNCE_MS = 15_000;

  private readonly processor: WhatsAppMessageProcessor;

  constructor() {
    this.baseUrl = process.env.WPPCONNECT_BASE_URL || 'http://localhost:21465';
    this.session = process.env.WPPCONNECT_SESSION || 'txai-whatsapp';
    this.secretKey = process.env.WPPCONNECT_SECRET_KEY || 'THISISMYSECURETOKEN';
    this.webhookSecret = process.env.WPPCONNECT_WEBHOOK_SECRET || 'txai-webhook-secret';

    this.processor = new WhatsAppMessageProcessor({
      downloadMediaByMessageId: async (messageId) => this.getMediaByMessageId(messageId),
      sendText: async (phone, message) => this.sendMessage(phone, message),
    });
  }

  /** Ensure the server session is started and we have a bearer token. */
  async initialize(): Promise<void> {
    if (this.isStarting) return;
    this.isStarting = true;

    try {
      await this.ensureToken();
      // Don't restart sessions on every initialize call.
      // If already connected or a QR is already available, we just return.
      const { isConnected, qrCode } = await this.getConnectionStatus();
      if (isConnected || qrCode) return;

      // Debounce start attempts to avoid generating a new QR code on rapid polling/refresh.
      const now = Date.now();
      if (now - this.lastStartAttemptAt < this.START_DEBOUNCE_MS) return;
      this.lastStartAttemptAt = now;

      await this.startSessionWithWebhook();
    } finally {
      this.isStarting = false;
    }
  }

  /** Return connection status + cached/derived QR state. */
  async getConnectionStatus(): Promise<WhatsAppConnectionStatus> {
    await this.ensureToken();

    // Prefer the explicit connection endpoint.
    const connectionPayload = await this.requestJson(`/api/${encodeURIComponent(this.session)}/check-connection-session`, {
      method: 'GET',
      auth: true,
    });

    const isConnected = isRecord(connectionPayload) && connectionPayload['status'] === true;
    if (isConnected) {
      return { isConnected: true, hasQRCode: false };
    }

    // If disconnected, try to read an existing QR code without restarting the session.
    const statusPayload = await this.requestJson(`/api/${encodeURIComponent(this.session)}/status-session`, {
      method: 'GET',
      auth: true,
    });

    if (isRecord(statusPayload)) {
      const status = typeof statusPayload['status'] === 'string' ? statusPayload['status'] : '';
      const qr =
        typeof statusPayload['qrcode'] === 'string'
          ? statusPayload['qrcode']
          : typeof statusPayload['qrCode'] === 'string'
            ? statusPayload['qrCode']
            : null;

      if (status.toUpperCase() === 'QRCODE' && qr) {
        return { isConnected: false, hasQRCode: true, qrCode: normalizeDataUrl(qr) };
      }
    }

    return { isConnected: false, hasQRCode: true };
  }

  /** Return a QR code data URL, or null if connected / not ready yet. */
  async getQrCode(): Promise<string | null> {
    const status = await this.getConnectionStatus();
    if (status.isConnected) return null;
    if (status.qrCode) return status.qrCode;

    // Ensure session is started so QR can be generated (debounced inside initialize).
    await this.initialize();

    // Some server versions return JSON with base64; others return the PNG bytes directly.
    const bytes = await this.requestBytes(`/api/${encodeURIComponent(this.session)}/qrcode-session`, {
      method: 'GET',
      auth: true,
    });

    if (bytes.contentType.includes('application/json')) {
      const text = bytes.buffer.toString('utf8');
      try {
        const parsed = JSON.parse(text) as unknown;
        if (typeof parsed === 'string') return normalizeDataUrl(parsed);
        if (isRecord(parsed)) {
          const qr =
            typeof parsed['qrCode'] === 'string'
              ? parsed['qrCode']
              : typeof parsed['qrcode'] === 'string'
                ? parsed['qrcode']
                : typeof parsed['base64'] === 'string'
                  ? parsed['base64']
                  : isRecord(parsed['response']) && typeof parsed['response']['qrcode'] === 'string'
                    ? (parsed['response']['qrcode'] as string)
                    : null;
          return qr ? normalizeDataUrl(qr) : null;
        }
      } catch {
        // fall through: treat as plain text
        return normalizeDataUrl(text);
      }
      return null;
    }

    // Default: binary PNG (or similar) → base64 data URL
    const base64 = bytes.buffer.toString('base64');
    return normalizeDataUrl(base64);
  }

  /** Send a text message (phone should be digits with country code). */
  async sendMessage(phone: string, message: string): Promise<void> {
    await this.initialize();

    await this.requestJson(`/api/${encodeURIComponent(this.session)}/send-message`, {
      method: 'POST',
      auth: true,
      body: {
        phone,
        isGroup: false,
        isNewsletter: false,
        isLid: false,
        message,
      },
    });
  }

  /** Close the current WhatsApp session on the server. */
  async disconnect(): Promise<void> {
    await this.initialize();
    await this.requestJson(`/api/${encodeURIComponent(this.session)}/close-session`, {
      method: 'POST',
      auth: true,
    });
  }

  /** Handle inbound webhook events from WPPConnect-Server. */
  async handleWebhookEvent(payload: unknown): Promise<void> {
    const message = extractWebhookMessage(payload);
    if (!message) return;
    await this.processor.handleIncomingMessage(message);
  }

  private async ensureToken(): Promise<void> {
    if (this.token) return;

    const path = `/api/${encodeURIComponent(this.session)}/${encodeURIComponent(this.secretKey)}/generate-token`;
    const res = await this.requestRaw(path, { method: 'POST', auth: false });

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(res.text);
    } catch {
      parsed = res.text;
    }

    const token = extractToken(parsed);
    if (!token) {
      throw new Error('Failed to obtain WPPConnect-Server token');
    }

    this.token = token;
  }

  private async startSessionWithWebhook(): Promise<void> {
    const publicBaseUrl =
      process.env.PUBLIC_BASE_URL ||
      process.env.PUBLIC_URL ||
      process.env.API_PUBLIC_URL ||
      '';

    const normalizedBaseUrl = publicBaseUrl.replace(/\/$/, '');

    // In Cloud Run we must provide a publicly reachable webhook URL.
    // Without this, WPPConnect-Server will send events to the wrong place.
    if (process.env.K_SERVICE && !normalizedBaseUrl) {
      throw new Error('PUBLIC_BASE_URL is required in Cloud Run when using WHATSAPP_DRIVER=server');
    }

    const webhookUrl = `${(normalizedBaseUrl || 'http://localhost:3001')}/api/whatsapp/webhook?token=${encodeURIComponent(this.webhookSecret)}`;

    await this.requestJson(`/api/${encodeURIComponent(this.session)}/start-session`, {
      method: 'POST',
      auth: true,
      body: {
        webhook: webhookUrl,
        waitQrCode: true,
      },
    });
  }

  private async getMediaByMessageId(messageId: string): Promise<{ base64?: string; mimetype?: string } | null> {
    await this.initialize();

    const payload = await this.requestJson(`/api/${encodeURIComponent(this.session)}/get-media-by-message/${encodeURIComponent(messageId)}`, {
      method: 'GET',
      auth: true,
    });

    if (typeof payload === 'string') return { base64: payload };
    if (!isRecord(payload)) return null;

    // Many versions respond with { base64, mimetype } or wrap inside response
    const base64 = typeof payload['base64'] === 'string' ? payload['base64'] : undefined;
    const mimetype = typeof payload['mimetype'] === 'string' ? payload['mimetype'] : undefined;
    if (base64) return { base64, mimetype };

    const response = payload['response'];
    if (isRecord(response)) {
      const b = typeof response['base64'] === 'string' ? response['base64'] : undefined;
      const m = typeof response['mimetype'] === 'string' ? response['mimetype'] : undefined;
      if (b) return { base64: b, mimetype: m };
    }

    return null;
  }

  private async requestJson(
    path: string,
    options: { method: 'GET' | 'POST'; auth: boolean; body?: unknown }
  ): Promise<unknown> {
    const res = await this.requestRaw(path, options);
    try {
      return JSON.parse(res.text);
    } catch {
      return res.text;
    }
  }

  private async requestRaw(
    path: string,
    options: { method: 'GET' | 'POST'; auth: boolean; body?: unknown }
  ): Promise<{ status: number; text: string }> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.auth) {
      await this.ensureToken();
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`WPPConnect-Server request failed (${response.status}) ${options.method} ${path}: ${text}`);
    }

    return { status: response.status, text };
  }

  private async requestBytes(
    path: string,
    options: { method: 'GET' | 'POST'; auth: boolean; body?: unknown }
  ): Promise<{ status: number; contentType: string; buffer: Buffer }> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: '*/*',
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.auth) {
      await this.ensureToken();
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!response.ok) {
      const text = buffer.toString('utf8');
      throw new Error(`WPPConnect-Server request failed (${response.status}) ${options.method} ${path}: ${text}`);
    }

    return { status: response.status, contentType, buffer };
  }
}


