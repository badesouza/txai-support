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
  const wasConnectedRef = useRef(false);

  // mountedRef para evitar setState após unmount
  const mountedRef = useRef(false);

  const POLL_INTERVAL_MS = 3000;

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
        return null;
      }
      if (response.status >= 400) {
        throw new Error(`QR code request failed with status ${response.status}`);
      }

      const qrCodeData = response?.data?.qrCode ?? null;

      if (!mountedRef.current) return null;

      if (!qrCodeData) {
        return null;
      }

      const formattedQr = String(qrCodeData).startsWith('data:image')
        ? String(qrCodeData)
        : `data:image/png;base64,${String(qrCodeData)}`;

      setQrCode((current) => (current === formattedQr ? current : formattedQr));
      return formattedQr;
    } catch (error) {
      if (mountedRef.current) {
        console.error('Erro ao gerar QR Code:', error);
      }
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
      const { connected = false, phone = null, qrCode: statusQrCode = null } = response?.data ?? {};

      if (!mountedRef.current) return { connected, phone };

      if (connected) {
        setIsConnected(true);
        setConnectedPhone(phone);
        setQrCode(null);
        stopPolling();
        if (!wasConnectedRef.current) {
          wasConnectedRef.current = true;
          message.success('WhatsApp conectado com sucesso!');
        }
      } else {
        wasConnectedRef.current = false;
        setIsConnected(false);
        setConnectedPhone(null);

        if (statusQrCode) {
          const formattedQr = String(statusQrCode).startsWith('data:image')
            ? String(statusQrCode)
            : `data:image/png;base64,${String(statusQrCode)}`;
          setQrCode((current) => (current === formattedQr ? current : formattedQr));
        } else {
          await requestQrCode();
        }
      }

      return { connected, phone };
    } catch (error) {
      if (mountedRef.current) {
        console.error('Erro ao verificar status do WhatsApp:', error);
      }
      return null;
    } finally {
      inFlightStatusRef.current = false;
      if (mountedRef.current) setCheckingStatus(false);
    }
  }, [getApiPath, requestQrCode, stopPolling]);

  // Start polling until connected
  const startPolling = useCallback(() => {
    stopPolling();

    pollingRef.current = setInterval(() => {
      void checkStatus();
    }, POLL_INTERVAL_MS);
  }, [checkStatus, stopPolling]);

  const initializeSession = useCallback(async () => {
    try {
      await api.post(getApiPath('initialize'));
    } catch (error) {
      console.warn('Falha ao inicializar sessão WhatsApp (continuando):', error);
    }
  }, [getApiPath]);

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
    if (mountedRef.current) {
      setCheckingStatus(true);
      setQrCode(null);
    }
    try {
      await initializeSession();
      const status = await checkStatus();
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

  // Initial mount: inicializar sessão, verificar status e iniciar polling
  useEffect(() => {
    mountedRef.current = true;
    wasConnectedRef.current = false;

    setQrCode(null);
    setIsConnected(false);
    setConnectedPhone(null);
    setCheckingStatus(true);

    (async () => {
      await initializeSession();
      const status = await checkStatus();
      if (!status?.connected) {
        startPolling();
      }
    })();

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [session, checkStatus, startPolling, stopPolling, initializeSession]);

  if (checkingStatus) {
    return (
      <div className="py-8 text-center">
        <Spin size="large" />
        <p className="mt-4 text-gray-400">Verificando status do WhatsApp...</p>
      </div>
    );
  }

  return (
    <div>
      {!isConnected && !qrCode && (
        <div className="my-5 text-center">
          <Text className="text-gray-400">Inicializando conexão do WhatsApp...</Text>
        </div>
      )}

      {!isConnected && !qrCode && (
        <div className="my-5 text-center">
          <div className="my-5 flex items-center justify-center">
            <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] sm:max-w-sm md:max-w-md">
              <div className="px-4 text-center">
                <Spin size="large" />
                <p className="mt-4 text-sm text-gray-400 sm:text-base">Gerando QR Code...</p>
                <p className="mt-2 text-xs text-gray-500 sm:text-sm">Aguarde enquanto o QR Code é gerado</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isConnected && qrCode && (
        <div className="my-5 px-4 text-center">
          <p className="mb-4 text-sm text-gray-400 sm:text-base">Escaneie este código QR com o WhatsApp para conectar</p>
          <p className="mb-2 text-xs text-gray-500">O código é atualizado automaticamente a cada poucos segundos</p>
          <div className="my-5 flex items-center justify-center">
            <div className="inline-block max-w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:p-6 md:p-8">
              <div className="rounded-lg border-2 border-black bg-white p-3 shadow-lg sm:p-4 md:p-6">
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
              <p className="mt-3 text-xs font-semibold text-gray-400 sm:mt-4 sm:text-sm">Aponte a câmera do WhatsApp para o código acima</p>
              <p className="mt-1 text-xs text-gray-500">Certifique-se de que o código está bem iluminado e visível</p>
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
