export interface WhatsAppMessage {
  from: string;
  body: string;
  type: string;
  timestamp: number;
  id?: string;
  mediaKey?: string;
  directPath?: string;
  mimetype?: string;
  // Keep the original event payload fields when available
  [key: string]: unknown;
}

export interface WhatsAppConnectionStatus {
  isConnected: boolean;
  hasQRCode: boolean;
  qrCode?: string;
}

export interface SessionInfo {
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'QR_CODE' | 'STARTING' | 'UNKNOWN';
  phone: string | null;
}
