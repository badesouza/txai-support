import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Typography, message, Spin } from 'antd';
import { DisconnectOutlined, SyncOutlined } from '@ant-design/icons';
import api from '../config/axios';

const { Text } = Typography;

const WhatsAppConnection: React.FC = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [statusEnabled, setStatusEnabled] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const shouldPollRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastCheckRef = useRef(0);
  const pollingStartTime = useRef(0);

  const stopPolling = useCallback(() => {
    console.log('Stopping WhatsApp polling');
    shouldPollRef.current = false;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const checkStatus = useCallback(async () => {
    if (!statusEnabled) return; // hard guard: only check when enabled by user
    // throttle client-side checks to avoid rapid loops
    const now = Date.now();
    if (inFlightRef.current) return;
    if (now - lastCheckRef.current < 3000) return;
    try {
      inFlightRef.current = true;
      setCheckingStatus(true);
      const response = await api.get('/whatsapp/status');
      console.log('WhatsApp Status Response:', response.data);
      
      const { connected, qrCode: newQrCode, phone } = response.data as { connected: boolean; qrCode: string | null; phone?: string | null };
      
      // Only update states if they're different to avoid unnecessary re-renders
      if (newQrCode !== qrCode) {
        setQrCode(newQrCode);
      }
      if (connected !== isConnected) {
        setIsConnected(connected);
      }
      setConnectedPhone(phone ?? null);
      
      // Only show messages when status actually changes
      if (connected && !isConnected) {
        message.success('WhatsApp está conectado!');
      } else if (newQrCode && !qrCode) {
        message.info('Escaneie este código QR com o WhatsApp para conectar');
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      // Don't show error message on initial load or when not connected
      if (!checkingStatus && (isConnected || qrCode)) {
        message.error('Erro ao verificar status do WhatsApp');
      }
      // Reset states on error and stop polling
      setIsConnected(false);
      setQrCode(null);
      setConnectedPhone(null);
      stopPolling(); // Stop polling on error
    } finally {
      lastCheckRef.current = Date.now();
      inFlightRef.current = false;
      setCheckingStatus(false);
    }
  }, [qrCode, isConnected, checkingStatus, stopPolling, statusEnabled]);

  const disconnectWhatsApp = async () => {
    setLoading(true);
    try {
      // First disconnect
      await api.post('/whatsapp/disconnect');
      setIsConnected(false);
      setQrCode(null);
      message.success('WhatsApp desconectado com sucesso');
      
      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Then reconnect to get new QR code
      await api.post('/whatsapp/reconnect');
      message.success('Gerando novo código QR...');
      
      // Wait a moment for the QR code to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check status to get the new QR code
      await checkStatus();
    } catch (error) {
      console.error('Erro ao desconectar/reconectar:', error);
      message.error('Erro ao desconectar o WhatsApp');
      // Reset states on error
      setIsConnected(false);
      setQrCode(null);
    } finally {
      setLoading(false);
    }
  };

  const reconnectWhatsApp = async () => {
    setLoading(true);
    try {
      setStatusEnabled(true);
      await api.post('/whatsapp/reconnect');
      message.success('Reconexão do WhatsApp iniciada');
      
      // Wait a moment for the QR code to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check status to get the new QR code
      await checkStatus();
    } catch (error) {
      console.error('Erro ao reconectar:', error);
      message.error('Erro ao reconectar o WhatsApp');
      // Reset states on error
      setIsConnected(false);
      setQrCode(null);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    shouldPollRef.current = true;
    pollingStartTime.current = Date.now();
    console.log('Starting WhatsApp polling');
    
    pollingRef.current = setInterval(() => {
      if (!shouldPollRef.current) {
        return;
      }
      
      // Check if we've been polling for more than 2 minutes (120 seconds)
      const pollingDuration = Date.now() - pollingStartTime.current;
      if (pollingDuration > 120000) {
        console.log('Stopping WhatsApp polling - timeout after 2 minutes');
        message.warning('Timeout: Não foi possível conectar ao WhatsApp. Tente novamente.');
        stopPolling();
        return;
      }
      
      // Continue polling if status is enabled and not connected yet
      if (statusEnabled && !isConnected) {
        checkStatus();
      } else if (isConnected) {
        console.log('Stopping WhatsApp polling - connected');
        stopPolling();
      }
    }, 3000); // Poll every 3 seconds
  }, [qrCode, isConnected, checkStatus, statusEnabled, stopPolling]);

  

  useEffect(() => {
    console.log('WhatsAppConnection mounted');
    // enable status checks on load and perform one immediate check
    setStatusEnabled(true);
    void checkStatus();
    return () => {
      stopPolling();
    };
  }, [stopPolling, checkStatus]);

  useEffect(() => {
    // Start polling if status is enabled and not connected yet (waiting for QR code)
    if (statusEnabled && !isConnected) {
      console.log('Starting polling to wait for QR code or connection');
      startPolling();
    } else if (isConnected) {
      console.log('Stopping polling - connected');
      stopPolling();
    }
  }, [isConnected, startPolling, stopPolling, statusEnabled]);

  if (checkingStatus && statusEnabled) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center my-5">
          <Spin size="large" />
          <p className="mt-4 text-gray-700 dark:text-gray-300">Verificando status do WhatsApp...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {!isConnected && !qrCode && statusEnabled && (
        <div className="text-center my-5">
          <Text className="text-gray-700 dark:text-gray-300">Inicializando conexão do WhatsApp...</Text>
        </div>
      )}

      {qrCode && !isConnected && (
        <div className="text-center my-5">
          <p className="text-gray-700 dark:text-gray-300">Escaneie este código QR com o WhatsApp para conectar</p>
          {qrCode && (
            <div className="flex justify-center items-center my-5">
              <img 
                src={qrCode.startsWith('data:image/png;base64,') ? qrCode : `data:image/png;base64,${qrCode}`} 
                alt="Código QR do WhatsApp" 
                className="max-w-[300px] w-full h-auto" 
              />
            </div>
          )}
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={reconnectWhatsApp}
            loading={loading}
            className="mt-4"
          >
            Atualizar Código QR
          </Button>
        </div>
      )}

      {!isConnected && !qrCode && statusEnabled && (
        <div className="text-center my-5">
          <Text type="warning" className="text-lg">WhatsApp não está inicializado</Text>
          <br />
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={reconnectWhatsApp}
            loading={loading}
            className="mt-4"
          >
            Inicializar WhatsApp
          </Button>
        </div>
      )}

      {isConnected && (
        <div className="text-center my-5">
          <Text type="success" className="text-lg">WhatsApp está conectado{connectedPhone ? `: ${connectedPhone}` : '!'}</Text>
          <br />
          <Button
            className="mt-4 bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 text-white"
            icon={<DisconnectOutlined />}
            onClick={disconnectWhatsApp}
            loading={loading}
          >
            Desconectar
          </Button>
        </div>
      )}
    </div>
  );
};

export default WhatsAppConnection; 