import axios, { AxiosRequestConfig } from 'axios';

export interface WhatsAppStatus {
  connected: boolean;
  qrCode: string | null;
  phone: string | null;
}

class WppconnectHttpService {
  private readonly baseUrl: string;
  private readonly session: string;
  private readonly secretKey: string;

  constructor() {
    this.baseUrl = process.env.WPPCONNECT_URL || 'http://wppconnect:21465';
    this.session = process.env.WPPCONNECT_SESSION || 'txai-whatsapp';
    this.secretKey = process.env.WPPCONNECT_SECRET_KEY || 'THISISMYSECURETOKEN';
  }

  private async getToken(): Promise<string> {
    const url = `${this.baseUrl}/api/${this.session}/${this.secretKey}/generate-token`;
    console.log('🔑 Generating token from:', url);
    try {
      const { data } = await axios.post(url);
      console.log('🔑 Token response:', data);
      if (!data?.token) throw new Error('Failed to generate WPP token');
      return data.token as string;
    } catch (error: any) {
      console.error('🔑 Token generation error:', error.response?.data || error.message);
      throw error;
    }
  }

  private async request<T = any>(method: 'GET' | 'POST', path: string, body?: any): Promise<T> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${path}`;
    const config: AxiosRequestConfig = { headers: { Authorization: `Bearer ${token}` } };
    const resp = method === 'GET' ? await axios.get(url, config) : await axios.post(url, body, config);
    return resp.data as T;
  }

  // Public API used by controller
  async startSession(): Promise<void> {
    console.log('🚀 Starting WhatsApp session...');
    try {
      await this.request('POST', `/api/${this.session}/start-session`, {
        waitQrCode: true,
      });
      console.log('✅ WhatsApp session started successfully');
    } catch (error: any) {
      console.error('❌ Error starting WhatsApp session:', error.response?.data || error.message);
      throw error;
    }
  }

  async closeSession(): Promise<void> {
    await this.request('POST', `/api/${this.session}/closeSession`);
  }

  async checkConnection(): Promise<{ connected: boolean; phone: string | null }> {
    try {
      const data = await this.request<any>('GET', `/api/${this.session}/check-connection-session`);
      console.log('📡 Connection check response:', data);
      const connected = data?.status === 'CONNECTED' || data?.connected === true || data?.state === 'CONNECTED';
      const phone = typeof data?.me === 'string' ? data.me : data?.phone || null;
      return { connected: !!connected, phone: phone ?? null };
    } catch (err: any) {
      console.error('📡 Connection check error:', err.response?.data || err.message);
      if (err?.response?.status === 400 || err?.response?.status === 404) {
        // session may not exist; try to start it and report not connected
        console.log('📡 Session not found, attempting to start...');
        await this.startSession().catch(() => {});
        return { connected: false, phone: null };
      }
      throw err;
    }
  }

  async getQrCode(): Promise<string | null> {
    try {
      const token = await this.getToken();
      const url = `${this.baseUrl}/api/${this.session}/qrcode-session`;
      const config: AxiosRequestConfig = { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer' // Para receber dados binários
      };
      
      const response = await axios.get(url, config);
      console.log('📱 QR Code response type:', response.headers['content-type']);
      
      // Converter arraybuffer para base64
      const base64 = Buffer.from(response.data).toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      
      console.log('📱 QR Code generated successfully');
      return dataUrl;
    } catch (err: any) {
      console.error('📱 QR Code error:', err.response?.data || err.message);
      if (err?.response?.status === 400 || err?.response?.status === 404) {
        console.log('📱 QR Code not available, attempting to start session...');
        await this.startSession().catch(() => {});
        return null;
      }
      throw err;
    }
  }

  async getStatus(): Promise<WhatsAppStatus> {
    const { connected, phone } = await this.checkConnection();
    if (connected) return { connected: true, phone, qrCode: null };
    const qr = await this.getQrCode();
    return { connected: false, phone: null, qrCode: qr };
  }

  async sendMessage(phone: string, message: string): Promise<any> {
    console.log('📤 Sending message to:', phone);
    try {
      const data = await this.request('POST', `/api/${this.session}/send-message`, {
        phone: phone,
        message: message
      });
      console.log('✅ Message sent successfully');
      return data;
    } catch (error: any) {
      console.error('❌ Error sending message:', error.response?.data || error.message);
      throw error;
    }
  }
}

export const whatsappService = new WppconnectHttpService();