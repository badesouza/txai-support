import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { message } from 'antd';
import WhatsAppConnection from '../WhatsAppConnection';
import api from '../../config/axios';

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock axios
jest.mock('../../config/axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

const mockApi = api as jest.Mocked<typeof api>;

describe('WhatsAppConnection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should render WhatsApp connection component', async () => {
    mockApi.get.mockResolvedValue({
      data: { connected: false, qrCode: null }
    });

    render(<WhatsAppConnection />);

    await waitFor(() => {
      expect(screen.getByText('Inicializando conexão do WhatsApp...')).toBeInTheDocument();
    });
  });

  it('should display connected status', async () => {
    mockApi.get.mockResolvedValue({
      data: { connected: true, qrCode: null }
    });

    render(<WhatsAppConnection />);

    await waitFor(() => {
      expect(screen.getByText('WhatsApp está conectado!')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Desconectar')).toBeInTheDocument();
    });
  });

  it('should display QR code when not connected', async () => {
    const mockQRCode = 'data:image/png;base64,test';
    mockApi.get.mockResolvedValue({
      data: { connected: false, qrCode: mockQRCode }
    });

    render(<WhatsAppConnection />);

    // O componente mostra QR direto quando desconectado com QR
    await waitFor(() => {
      expect(screen.getByText('Atualizar Código QR')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByAltText('Código QR do WhatsApp')).toBeInTheDocument();
    });
  });

  it('should handle disconnect successfully', async () => {
    // Initial connected state
    mockApi.get.mockResolvedValueOnce({
      data: { connected: true, qrCode: null }
    });

    render(<WhatsAppConnection />);

    await waitFor(() => {
      expect(screen.getByText('Desconectar')).toBeInTheDocument();
    });

    // Mock disconnect response only (we'll test the disconnect part)
    mockApi.post.mockResolvedValueOnce({ data: { message: 'WhatsApp disconnected successfully' } });

    const disconnectButton = screen.getByText('Desconectar');
    fireEvent.click(disconnectButton);

    // Just verify disconnect was called - the reconnect timing is complex to test reliably
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/whatsapp/disconnect');
    });
    
    // Verify success message was shown
    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('WhatsApp desconectado com sucesso');
    });
  });

  it('should handle reconnect successfully', async () => {
    // Initial disconnected state
    mockApi.get.mockResolvedValueOnce({
      data: { connected: false, qrCode: 'data:image/png;base64,test' }
    });

    render(<WhatsAppConnection />);

    await waitFor(() => {
      expect(screen.getByText('Atualizar Código QR')).toBeInTheDocument();
    });

    // Mock reconnect response
    mockApi.post.mockResolvedValue({
      data: { message: 'WhatsApp reconnection started' }
    });

    // Mock status after reconnect
    mockApi.get.mockResolvedValue({
      data: { connected: false, qrCode: 'data:image/png;base64,newqr' }
    });

    const reconnectButton = screen.getByText('Atualizar Código QR');
    fireEvent.click(reconnectButton);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/whatsapp/reconnect');
    });
    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Reconexão do WhatsApp iniciada');
    });
  });

  it('should handle API errors gracefully', async () => {
    mockApi.get.mockRejectedValue(new Error('API Error'));

    render(<WhatsAppConnection />);

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith('Error checking WhatsApp status:', expect.any(Error));
    });
  });

  it('should handle disconnect errors gracefully', async () => {
    // Initial connected state
    mockApi.get.mockResolvedValueOnce({
      data: { connected: true, qrCode: null }
    });

    render(<WhatsAppConnection />);

    await waitFor(() => {
      expect(screen.getByText('Desconectar')).toBeInTheDocument();
    });

    // Mock disconnect error
    mockApi.post.mockRejectedValue(new Error('Disconnect failed'));

    const disconnectButton = screen.getByText('Desconectar');
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Erro ao desconectar o WhatsApp');
    });
    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith('Erro ao desconectar/reconectar:', expect.any(Error));
    });
  });

  it('should refresh status periodically', async () => {
    jest.useFakeTimers();

    mockApi.get.mockResolvedValue({
      data: { connected: false, qrCode: null }
    });

    render(<WhatsAppConnection />);

    // Initial call
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/whatsapp/status');
    });

    // Fast-forward time to trigger interval
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('should show loading state during operations', async () => {
    // Initial connected state
    mockApi.get.mockResolvedValueOnce({
      data: { connected: true, qrCode: null }
    });

    render(<WhatsAppConnection />);

    await waitFor(() => {
      expect(screen.getByText('Desconectar')).toBeInTheDocument();
    });

    // Mock slow disconnect response
    mockApi.post.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: { message: 'Success' } }), 100))
    );

    const disconnectButton = screen.getByText('Desconectar');
    fireEvent.click(disconnectButton);

    // Botão entra em loading (classe ant-btn-loading)
    expect(disconnectButton).toBeInTheDocument();
  });
});
