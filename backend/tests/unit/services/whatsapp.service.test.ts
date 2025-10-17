import axios from 'axios';
import { whatsappService } from '../../../src/services/whatsapp.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WhatsApp Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      WPPCONNECT_URL: 'http://localhost:21465',
      WPPCONNECT_SESSION: 'test-session',
      WPPCONNECT_SECRET_KEY: 'test-secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getToken', () => {
    it('should generate token successfully', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      mockedAxios.post.mockResolvedValue(mockTokenResponse);

      const token = await (whatsappService as any).getToken();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:21465/api/test-session/test-secret/generate-token'
      );
      expect(token).toBe('test-token-123');
    });

    it('should throw error when token generation fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Token generation failed'));

      await expect((whatsappService as any).getToken()).rejects.toThrow('Token generation failed');
    });

    it('should throw error when no token in response', async () => {
      const mockResponse = {
        data: {
          message: 'Success',
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      await expect((whatsappService as any).getToken()).rejects.toThrow('Failed to generate WPP token');
    });
  });

  describe('request', () => {
    it('should make GET request with authorization header', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockDataResponse = {
        data: {
          status: 'CONNECTED',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockDataResponse);

      const result = await (whatsappService as any).request('GET', '/api/test-session/check-connection-session');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:21465/api/test-session/check-connection-session',
        {
          headers: {
            Authorization: 'Bearer test-token-123',
          },
        }
      );
      expect(result).toEqual({ status: 'CONNECTED' });
    });

    it('should make POST request with authorization header and body', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockDataResponse = {
        data: {
          success: true,
        },
      };
      mockedAxios.post
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockDataResponse);

      const requestBody = { waitQrCode: true };
      const result = await (whatsappService as any).request('POST', '/api/test-session/start-session', requestBody);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:21465/api/test-session/start-session',
        requestBody,
        {
          headers: {
            Authorization: 'Bearer test-token-123',
          },
        }
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('startSession', () => {
    it('should start WhatsApp session successfully', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockStartResponse = {
        data: {
          success: true,
          message: 'Session started',
        },
      };
      mockedAxios.post
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockStartResponse);

      await whatsappService.startSession();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:21465/api/test-session/start-session',
        { waitQrCode: true },
        {
          headers: {
            Authorization: 'Bearer test-token-123',
          },
        }
      );
    });

    it('should handle start session error', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      mockedAxios.post
        .mockResolvedValueOnce(mockTokenResponse)
        .mockRejectedValueOnce(new Error('Start session failed'));

      await expect(whatsappService.startSession()).rejects.toThrow('Start session failed');
    });
  });

  describe('closeSession', () => {
    it('should close WhatsApp session successfully', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockCloseResponse = {
        data: {
          success: true,
        },
      };
      mockedAxios.post
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockCloseResponse);

      await whatsappService.closeSession();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:21465/api/test-session/closeSession',
        undefined,
        {
          headers: {
            Authorization: 'Bearer test-token-123',
          },
        }
      );
    });
  });

  describe('checkConnection', () => {
    it('should return connected status when session is connected', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockConnectionResponse = {
        data: {
          status: 'CONNECTED',
          me: '5511999999999',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockConnectionResponse);

      const result = await whatsappService.checkConnection();

      expect(result).toEqual({
        connected: true,
        phone: '5511999999999',
      });
    });

    it('should return connected status with different response formats', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockConnectionResponse = {
        data: {
          connected: true,
          phone: '5511999999999',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockConnectionResponse);

      const result = await whatsappService.checkConnection();

      expect(result).toEqual({
        connected: true,
        phone: '5511999999999',
      });
    });

    it('should return connected status with state format', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockConnectionResponse = {
        data: {
          state: 'CONNECTED',
          phone: '5511999999999',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockConnectionResponse);

      const result = await whatsappService.checkConnection();

      expect(result).toEqual({
        connected: true,
        phone: '5511999999999',
      });
    });

    it('should return not connected when session is disconnected', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockConnectionResponse = {
        data: {
          status: 'DISCONNECTED',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockConnectionResponse);

      const result = await whatsappService.checkConnection();

      expect(result).toEqual({
        connected: false,
        phone: null,
      });
    });

    it('should handle 400/404 errors by attempting to start session', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockStartResponse = {
        data: {
          success: true,
        },
      };
      mockedAxios.post
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockStartResponse);
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 },
      });

      const result = await whatsappService.checkConnection();

      expect(result).toEqual({
        connected: false,
        phone: null,
      });
    });

    it('should throw error for other connection check errors', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockRejectedValueOnce(new Error('Server error'));

      await expect(whatsappService.checkConnection()).rejects.toThrow('Server error');
    });
  });

  describe('getQrCode', () => {
    it('should get QR code successfully', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockQrResponse = {
        data: Buffer.from('fake-png-data'),
        headers: {
          'content-type': 'image/png',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockQrResponse);

      const result = await whatsappService.getQrCode();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:21465/api/test-session/qrcode-session',
        {
          headers: {
            Authorization: 'Bearer test-token-123',
          },
          responseType: 'arraybuffer',
        }
      );
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should handle 400/404 errors by attempting to start session', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockStartResponse = {
        data: {
          success: true,
        },
      };
      mockedAxios.post
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockStartResponse);
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 },
      });

      const result = await whatsappService.getQrCode();

      expect(result).toBeNull();
    });

    it('should throw error for other QR code errors', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockRejectedValueOnce(new Error('QR code error'));

      await expect(whatsappService.getQrCode()).rejects.toThrow('QR code error');
    });
  });

  describe('getStatus', () => {
    it('should return connected status when connected', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockConnectionResponse = {
        data: {
          status: 'CONNECTED',
          me: '5511999999999',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockConnectionResponse);

      const result = await whatsappService.getStatus();

      expect(result).toEqual({
        connected: true,
        phone: '5511999999999',
        qrCode: null,
      });
    });

    it('should return QR code when not connected', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockConnectionResponse = {
        data: {
          status: 'DISCONNECTED',
        },
      };
      const mockQrResponse = {
        data: Buffer.from('fake-png-data'),
        headers: {
          'content-type': 'image/png',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get
        .mockResolvedValueOnce(mockConnectionResponse)
        .mockResolvedValueOnce(mockQrResponse);

      const result = await whatsappService.getStatus();

      expect(result).toEqual({
        connected: false,
        phone: null,
        qrCode: expect.stringMatching(/^data:image\/png;base64,/),
      });
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      const mockSendResponse = {
        data: {
          success: true,
          messageId: '123',
        },
      };
      mockedAxios.post
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockSendResponse);

      const result = await whatsappService.sendMessage('5511999999999', 'Test message');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:21465/api/test-session/send-message',
        {
          phone: '5511999999999',
          message: 'Test message',
        },
        {
          headers: {
            Authorization: 'Bearer test-token-123',
          },
        }
      );
      expect(result).toEqual({
        success: true,
        messageId: '123',
      });
    });

    it('should handle send message error', async () => {
      const mockTokenResponse = {
        data: {
          token: 'test-token-123',
        },
      };
      mockedAxios.post
        .mockResolvedValueOnce(mockTokenResponse)
        .mockRejectedValueOnce(new Error('Send failed'));

      await expect(whatsappService.sendMessage('5511999999999', 'Test message')).rejects.toThrow('Send failed');
    });
  });
});
