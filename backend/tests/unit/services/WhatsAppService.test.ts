import { whatsappService } from '../../../src/services/whatsapp.service';

// Mock WPPConnect
jest.mock('@wppconnect-team/wppconnect', () => ({
  create: jest.fn()
}));

// Mock fs
jest.mock('fs/promises', () => ({
  rm: jest.fn(),
  mkdir: jest.fn().mockResolvedValue(undefined),
  access: jest.fn()
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

describe('WhatsAppService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConnectionStatus', () => {
    it('should return false when not connected', () => {
      const status = whatsappService.getConnectionStatus();
      expect(status).toBe(false);
    });

    it('should return true when connected', () => {
      // @ts-ignore - accessing private property for testing
      whatsappService.isConnected = true;
      const status = whatsappService.getConnectionStatus();
      expect(status).toBe(true);
    });
  });

  describe('getQRCode', () => {
    it('should return null when no QR code', () => {
      const qrCode = whatsappService.getQRCode();
      expect(qrCode).toBeNull();
    });

    it('should return QR code when available', () => {
      const mockQRCode = 'data:image/png;base64,test';
      // @ts-ignore - accessing private property for testing
      whatsappService.qrCode = mockQRCode;
      
      const qrCode = whatsappService.getQRCode();
      expect(qrCode).toBe(mockQRCode);
    });
  });

  describe('disconnect', () => {
    it('should clear connection state', async () => {
      // @ts-ignore - accessing private property for testing
      whatsappService.isConnected = true;
      // @ts-ignore - accessing private property for testing
      whatsappService.qrCode = 'test-qr-code';

      await whatsappService.disconnect();

      expect(whatsappService.getConnectionStatus()).toBe(false);
      expect(whatsappService.getQRCode()).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      // @ts-ignore - accessing private property for testing
      whatsappService.client = {
        logout: jest.fn().mockRejectedValue(new Error('Logout failed'))
      };

      await whatsappService.disconnect();

      // The disconnect method should handle errors and still clear state
      expect(whatsappService.getConnectionStatus()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should return false when initialization fails', async () => {
      const { create } = require('@wppconnect-team/wppconnect');
      create.mockRejectedValue(new Error('Initialization failed'));

      const result = await whatsappService.initialize();

      expect(result).toBe(false);
      expect(whatsappService.getConnectionStatus()).toBe(false);
      expect(create).toHaveBeenCalled();
    });

    it('should handle QR code generation', async () => {
      const mockClient = {
        onQR: jest.fn(),
        onStatusFind: jest.fn(),
        onMessage: jest.fn()
      };

      const { create } = require('@wppconnect-team/wppconnect');
      create.mockResolvedValue(mockClient);

      const result = await whatsappService.initialize();

      // The initialization should succeed
      expect(result).toBe(true);
      // The create function should be called
      expect(create).toHaveBeenCalled();
    });
  });

  describe('reconnect', () => {
    it('should disconnect and then initialize', async () => {
      const disconnectSpy = jest.spyOn(whatsappService, 'disconnect').mockResolvedValue(undefined);
      const initializeSpy = jest.spyOn(whatsappService, 'initialize').mockResolvedValue(true);

      const result = await whatsappService.reconnect();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(initializeSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  // Note: Event handlers are private methods and should not be tested directly
  // They are tested indirectly through the public methods that use them
});
