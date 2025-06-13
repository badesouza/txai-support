import React, { useEffect, useState } from 'react';
import { Button, Typography, message, Spin } from 'antd';
import { DisconnectOutlined, SyncOutlined } from '@ant-design/icons';
import api from '../config/axios';

const { Text } = Typography;

const WhatsAppConnection: React.FC = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const checkStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await api.get('/whatsapp/status');
      console.log('WhatsApp Status Response:', response.data);
      
      // Only update states if they're different to avoid unnecessary re-renders
      if (response.data.qrCode !== qrCode) {
        setQrCode(response.data.qrCode);
      }
      if (response.data.connected !== isConnected) {
        setIsConnected(response.data.connected);
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      // Don't show error message on initial load
      if (!checkingStatus) {
        message.error('Erro ao verificar status do WhatsApp');
      }
    } finally {
      setCheckingStatus(false);
    }
  };

  const disconnectWhatsApp = async () => {
    setLoading(true);
    try {
      // First disconnect
      await api.post('/whatsapp/disconnect');
      setIsConnected(false);
      setQrCode(null);
      message.success('WhatsApp desconectado com sucesso');
      
      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then reconnect to get new QR code
      await api.post('/whatsapp/reconnect');
      message.success('Gerando novo código QR...');
      
      // Wait a moment for the QR code to be generated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check status to get the new QR code
      await checkStatus();
    } catch (error) {
      console.error('Erro ao desconectar/reconectar:', error);
      message.error('Erro ao desconectar o WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const reconnectWhatsApp = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/reconnect');
      message.success('Reconexão do WhatsApp iniciada');
      await checkStatus();
    } catch (error) {
      message.error('Erro ao reconectar o WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('WhatsAppConnection mounted');
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (checkingStatus) {
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
      {!isConnected && !qrCode && (
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

      {isConnected && (
        <div className="text-center my-5">
          <Text type="success" className="text-lg">WhatsApp está conectado!</Text>
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