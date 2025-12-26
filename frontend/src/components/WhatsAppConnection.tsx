import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button, Typography, message, Spin } from 'antd';
import { DisconnectOutlined, SyncOutlined } from '@ant-design/icons';
import api from '../config/axios';

const { Text } = Typography;

interface WhatsAppConnectionProps {
  /** Optional session name. If not provided, uses the default session. */
  session?: string;
}

const WhatsAppConnection: React.FC<WhatsAppConnectionProps> = ({ session }) => {
  // Build the API path prefix based on session
  const getApiPath = useCallback((endpoint: string) => {
    if (session) {
      return `/whatsapp/sessions/${session}/${endpoint}`;
    }
    return `/whatsapp/${endpoint}`;
  }, [session]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  // Separar flags para evitar bloqueio entre status <> qr
  const inFlightStatusRef = useRef(false);
  const inFlightQrRef = useRef(false);

  // mountedRef para evitar setState após unmount
  const mountedRef = useRef(false);

  // Stop polling
  const stopPolling = useCallback(() => {
    console.log('🛑 Parando polling');
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Request QR Code (usa inFlightQrRef)
  const requestQrCode = useCallback(async () => {
    if (inFlightQrRef.current) {
      return null;
    }
    inFlightQrRef.current = true;
    try {
      const response = await api.get(getApiPath('qrcode'), { validateStatus: () => true });
      if (response.status === 202) {
        if (mountedRef.current) setQrCode(null);
        return null;
      }
      if (response.status >= 400) {
        throw new Error(`QR code request failed with status ${response.status}`);
      }

      const qrCodeData = response?.data?.qrCode ?? null;

      if (!mountedRef.current) return null; // componente desmontado, abortar

      if (!qrCodeData) {
        setQrCode(null);
        return null;
      }
      if (String(qrCodeData).startsWith('data:image')) {
        setQrCode(String(qrCodeData));
        return String(qrCodeData);
      }
      // Back-compat: treat long strings as base64 payloads
      const formattedQr = `data:image/png;base64,${String(qrCodeData)}`;
      setQrCode(formattedQr);
      return formattedQr;
    } catch (error) {
      if (mountedRef.current) message.error('Erro ao gerar QR Code');
      setQrCode(null);
      return null;
    } finally {
      inFlightQrRef.current = false;
    }
  }, [getApiPath]);

  // Check status - retorna um objeto com resultado para uso pelos chamadores
  const checkStatus = useCallback(async (): Promise<{ connected: boolean; phone: string | null } | null> => {
    if (inFlightStatusRef.current) {
      return null;
    }
    inFlightStatusRef.current = true;
    try {
      const response = await api.get(getApiPath('status'));
      const { connected = false, phone = null } = response?.data ?? {};

      if (!mountedRef.current) return { connected, phone };

      if (connected) {
        setIsConnected(true);
        setConnectedPhone(phone);
        setQrCode(null);
        stopPolling();
        message.success('WhatsApp conectado com sucesso!');
      } else {
        setIsConnected(false);
        setConnectedPhone(null);
        await requestQrCode();
      }

      return { connected, phone };
    } catch (error) {
      if (mountedRef.current) message.error('Erro ao verificar status do WhatsApp');
      return null;
    } finally {
      inFlightStatusRef.current = false;
      if (mountedRef.current) setCheckingStatus(false);
    }
  }, [getApiPath, requestQrCode, stopPolling]);

  // Start polling with 10 second interval
  const startPolling = useCallback(() => {
    stopPolling(); // Clear any existing interval

    pollingRef.current = setInterval(() => {
      // Não aguardamos aqui; checkStatus já protege concorrência
      void checkStatus();
    }, 10000); // 10 segundos
  }, [checkStatus, stopPolling, isConnected, qrCode]);

  const disconnectWhatsApp = async () => {
    setLoading(true);
    try {
      await api.post(getApiPath('disconnect'));

      // Forçar atualização de estado a partir do resultado real
      const status = await checkStatus();
      // use o retorno para decidir iniciar polling
      if (!status?.connected) {
        // iniciar polling para obter novo QR
        startPolling();
      }

      if (mountedRef.current) {
        setIsConnected(false);
        setQrCode(null);
        setConnectedPhone(null);
        message.success('WhatsApp desconectado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      if (mountedRef.current) message.error('Erro ao desconectar o WhatsApp');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const reconnectWhatsApp = async () => {
    setLoading(true);
    if (mountedRef.current) setCheckingStatus(true);
    try {
      const status = await checkStatus();
      // Decida com base no retorno (evita depender de isConnected stale)
      if (!status?.connected) {
        startPolling();
      }
    } catch (error) {
      console.error('Erro ao reconectar:', error);
      if (mountedRef.current) message.error('Erro ao reconectar o WhatsApp');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // Initial mount: verificar status e iniciar polling automático
  useEffect(() => {
    mountedRef.current = true;

    // Reset state when session changes
    setQrCode(null);
    setIsConnected(false);
    setConnectedPhone(null);
    setCheckingStatus(true);

    (async () => {
      const status = await checkStatus();
      if (!status?.connected) {
        startPolling();
      }
    })();

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [session]); // Re-run when session changes  // eslint-disable-line react-hooks/exhaustive-deps

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

      {!isConnected && !qrCode && (
        <div className="text-center my-5">
          <div className="flex justify-center items-center my-5">
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md aspect-square border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-100">
              <div className="text-center px-4">
                <Spin size="large" />
                <p className="mt-4 text-gray-600 text-sm sm:text-base">Gerando QR Code...</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-2">Aguarde enquanto o QR Code é gerado</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isConnected && qrCode && (
        <div className="text-center my-5 px-4">
          <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm sm:text-base">Escaneie este código QR com o WhatsApp para conectar</p>
          <div className="flex justify-center items-center my-5">
            <div className="bg-gray-100 p-4 sm:p-6 md:p-8 rounded-xl shadow-2xl border-2 sm:border-4 border-gray-400 inline-block max-w-full">
              {/* Container externo com fundo contrastante */}
              <div className="bg-white p-3 sm:p-4 md:p-6 border-2 sm:border-4 border-black rounded-lg shadow-lg">
                {/* Margem interna para criar "quiet zone" do QR code */}
                <div className="flex justify-center items-center">
                  <img
                    src={qrCode}
                    alt="Código QR do WhatsApp"
                    className="w-full max-w-[200px] sm:max-w-[240px] md:max-w-[260px] h-auto aspect-square"
                    style={{
                      imageRendering: 'crisp-edges',
                      filter: 'contrast(1.8) brightness(1.2)',
                      border: 'solid',
                      borderRadius: '2px'
                    }}
                    onLoad={() => console.log('📱 QR Code image loaded successfully')}
                    onError={() => console.error('❌ QR Code image failed to load')}
                  />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 mt-3 sm:mt-4 font-semibold">📱 Aponte a câmera do WhatsApp para o código acima</p>
              <p className="text-xs text-gray-500 mt-1">Certifique-se de que o código está bem iluminado e visível</p>
            </div>
          </div>
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
          <Text type="success" className="text-lg">✅ WhatsApp está conectado{connectedPhone ? `: ${connectedPhone}` : '!'}</Text>
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
