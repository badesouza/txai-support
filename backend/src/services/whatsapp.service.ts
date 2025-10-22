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
      // Oficial: usa Bearer token em /api/:session/start-session
      const response = await this.request('POST', `/api/${this.session}/start-session`, { waitQrCode: true });
      console.log('✅ WhatsApp session started:', response.data);
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
      // Oficial: usa Bearer token em /api/:session/check-connection-session
      const data = await this.request('GET', `/api/${this.session}/check-connection-session`);
      console.log('📡 Connection check response:', data);
      // WPPConnect pode retornar: status: true/false OU status: 'CONNECTED'/'Disconnected'
      const connected = data?.status === true || data?.status === 'CONNECTED' || data?.connected === true || data?.state === 'CONNECTED' || data?.message === 'Connected';
      const phone = typeof data?.me === 'string' ? data.me : data?.phone || data?.wid?.user || null;
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
      // Fluxo oficial: chamar novamente start-session pode retornar o qrCode em base64
      // Tentativa 1: tentar via start-session para obter qrCode em JSON
      try {
        const result = await this.request<any>('POST', `/api/${this.session}/start-session`, { waitQrCode: true });
        const possible = result?.qrCode || result?.qrcode || result?.base64 || result?.image || null;
        if (possible) {
          console.log('📱 QR Code received via start-session');
          const code = String(possible);
          return code.startsWith('data:image') ? code : `data:image/png;base64,${code}`;
        }
      } catch (e) {
        // Se falhar, caímos para a rota de qrcode-session
        console.warn('📱 start-session did not return QR, falling back to qrcode-session');
      }

      // Tentativa 2: rota qrcode-session com Bearer
      const token = await this.getToken();
      const url = `${this.baseUrl}/api/${this.session}/qrcode-session`;
      const config: AxiosRequestConfig = {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${token}` }
      };
      const response = await axios.get(url, config);
      const contentType = response.headers['content-type'];
      console.log('📱 QR Code response type:', contentType);

      if (contentType?.includes('application/json')) {
        const jsonData = JSON.parse(Buffer.from(response.data).toString());
        console.log('📱 QR Code not ready yet:', jsonData.message || jsonData);
        if (jsonData.message?.includes('initialization') || jsonData.message?.includes('not started')) {
          console.log('📱 Starting session for the first time...');
          await this.startSession();
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.getQrCode();
        }
        return null;
      }

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
    
    // Format phone number for WhatsApp (Brazilian format)
    let formattedPhone = phone;
    
    // Check if phone already has @c.us suffix
    const hasSuffix = phone.includes('@c.us');
    const cleanPhone = phone.replace('@c.us', '');
    
    // Remove any non-numeric characters from the clean phone
    const numericPhone = cleanPhone.replace(/\D/g, '');
    
    // If it's a Brazilian number without country code, add it
    if (numericPhone.length === 11 && numericPhone.startsWith('55')) {
      // Already has country code, use as is
      formattedPhone = numericPhone;
    } else if (numericPhone.length === 11 && !numericPhone.startsWith('55')) {
      // Brazilian number without country code, add 55
      formattedPhone = '55' + numericPhone;
    } else if (numericPhone.length === 10) {
      // Brazilian number without country code and without area code, add 55
      formattedPhone = '55' + numericPhone;
    } else {
      formattedPhone = numericPhone;
    }
    
    // Add @c.us suffix if it was present in the original phone
    if (hasSuffix) {
      formattedPhone = formattedPhone + '@c.us';
    }
    
    console.log('📤 Formatted phone number:', formattedPhone);
    
    try {
      const data = await this.request('POST', `/api/${this.session}/send-message`, {
        phone: formattedPhone,
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