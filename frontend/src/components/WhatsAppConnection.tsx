import React, { useEffect, useState, useRef, useCallback } from 'react';
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

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  // Separar flags para evitar bloqueio entre status <> qr
  const inFlightStatusRef = useRef(false);
  const inFlightQrRef = useRef(false);

  // mountedRef para evitar setState após unmount
  const mountedRef = useRef(false);

  // Debug: Log when qrCode state changes
  useEffect(() => {
    console.log('🔄 QR Code state changed:', qrCode ? 'HAS QR CODE' : 'NO QR CODE');
    if (qrCode) {
      console.log('🎯 Renderizando QR Code:', qrCode.substring(0, 50) + '...');
      console.log('🎯 Condições de renderização:', { isConnected, qrCode: !!qrCode, condition: !isConnected && qrCode });
    }
  }, [qrCode, isConnected]);

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
      console.log('⏭️ requestQrCode: Requisição já em andamento, pulando...');
      return null;
    }
    inFlightQrRef.current = true;
    try {
      console.log('📱 Solicitando QR Code ao backend...');
      const response = await api.get('/whatsapp/qrcode');
      const qrCodeData = response?.data?.qrCode ?? null;

      console.log('📱 Resposta do QR Code:', qrCodeData ? `Recebido (${String(qrCodeData).substring(0, 50)}...)` : 'null');
      console.log('📱 QR Code completo:', qrCodeData);

      if (!mountedRef.current) return null; // componente desmontado, abortar

      if (qrCodeData) {
        // Check if it's a placeholder or actual QR code
        if (String(qrCodeData) === 'QR_CODE_GENERATING' || String(qrCodeData).includes('QR_CODE_') || String(qrCodeData).includes('PLACEHOLDER')) {
          // It's a placeholder, keep loading screen active
          console.log('📱 QR Code ainda sendo gerado, mantendo loading...');
          setQrCode(null);
          return null;
        } else if (String(qrCodeData).startsWith('data:image')) {
          // It's already a properly formatted data URL
          console.log('📱 QR Code válido recebido!');
          console.log('📱 Setando QR Code no estado...');
          setQrCode(String(qrCodeData));
          console.log('📱 QR Code setado com sucesso!');
          return String(qrCodeData);
        } else {
          // Only format as base64 if it's actually base64 data, not placeholder text
          if (String(qrCodeData).length > 50 && !String(qrCodeData).includes('QR_CODE_')) {
            // It's a base64 string, format it properly
            const formattedQr = `data:image/png;base64,${String(qrCodeData)}`;
            console.log('📱 QR Code formatado como base64!');
            setQrCode(formattedQr);
            return formattedQr;
          } else {
            // It's a placeholder or short text, keep loading
            console.log('📱 Dados insuficientes para QR Code, mantendo loading...');
            setQrCode(null);
            return null;
          }
        }
      } else {
        console.log('📱 Nenhum QR Code recebido, mantendo loading...');
        setQrCode(null);
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao solicitar QR Code:', error);
      if (mountedRef.current) message.error('Erro ao gerar QR Code');
      setQrCode(null);
      return null;
    } finally {
      inFlightQrRef.current = false;
    }
  }, []);

  // Check status - retorna um objeto com resultado para uso pelos chamadores
  const checkStatus = useCallback(async (): Promise<{ connected: boolean; phone: string | null } | null> => {
    if (inFlightStatusRef.current) {
      console.log('⏭️ checkStatus: Requisição já em andamento, pulando...');
      return null;
    }
    inFlightStatusRef.current = true;
    try {
      console.log('🔍 Verificando status...');
      const response = await api.get('/whatsapp/status');
      const { connected = false, phone = null } = response?.data ?? {};

      console.log(`📊 Status recebido do backend: ${connected ? '✅ Conectado' : '❌ Desconectado'}`, { phone });

      if (!mountedRef.current) return { connected, phone };

      if (connected) {
        // Conectado: parar polling e mostrar sucesso
        console.log('✅ WhatsApp conectado! Parando polling...');
        setIsConnected(true);
        setConnectedPhone(phone);
        setQrCode(null);
        stopPolling();
        message.success('WhatsApp conectado com sucesso!');
      } else {
        // Desconectado: solicitar novo QR Code
        console.log('❌ WhatsApp desconectado, solicitando QR Code...');
        setIsConnected(false);
        setConnectedPhone(null);
        // Chama requestQrCode — agora sem ser bloqueado porque usamos flags separadas
        console.log('🔄 Chamando requestQrCode...');
        const qrResult = await requestQrCode();
        console.log('🔄 Resultado do requestQrCode:', qrResult ? 'SUCCESS' : 'FAILED');
      }

      return { connected, phone };
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      if (mountedRef.current) message.error('Erro ao verificar status do WhatsApp');
      return null;
    } finally {
      inFlightStatusRef.current = false;
      if (mountedRef.current) setCheckingStatus(false);
    }
  }, [requestQrCode, stopPolling]);

  // Start polling with 10 second interval
  const startPolling = useCallback(() => {
    stopPolling(); // Clear any existing interval

    console.log('▶️ Iniciando polling (10s)');
    pollingRef.current = setInterval(() => {
      console.log('⏰ Polling tick...');
      console.log('⏰ Estado atual - isConnected:', isConnected, 'qrCode:', !!qrCode);
      console.log('⏰ Executando checkStatus...');
      // Não aguardamos aqui; checkStatus já protege concorrência
      void checkStatus();
    }, 10000); // 10 segundos
  }, [checkStatus, stopPolling, isConnected, qrCode]);

  const disconnectWhatsApp = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/disconnect');

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
    if (mountedRef.current) return; // Prevent double execution
    mountedRef.current = true;

    console.log('🚀 WhatsAppConnection montado - COM POLLING AUTOMÁTICO (10s)');

    (async () => {
      console.log('🚀 Iniciando verificação inicial...');
      const status = await checkStatus();
      console.log('📊 Status inicial:', status);
      if (!status?.connected) {
        console.log('🔄 Iniciando polling...');
        startPolling();
      }
      console.log('✅ Verificação inicial completa - polling ajustado');
    })();

    return () => {
      console.log('🔚 WhatsAppConnection desmontado');
      mountedRef.current = false;
      stopPolling();
    };
    // Intencional: deps vazias para rodar apenas no mount
    // checkStatus está memoizado; se você preferir redeclarar ao mudar deps, ajuste aqui.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Debug log
  console.log('🔍 Estado do componente:', { isConnected, qrCode: !!qrCode, checkingStatus });
  console.log('🔍 Condições de renderização:', {
    '!isConnected': !isConnected,
    'qrCode': !!qrCode,
    '!isConnected && qrCode': !isConnected && qrCode,
    '!isConnected && !qrCode': !isConnected && !qrCode
  });

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
            <div className="w-[300px] h-[300px] border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Spin size="large" />
                <p className="mt-4 text-gray-600">Gerando QR Code...</p>
                <p className="text-sm text-gray-500 mt-2">Aguarde enquanto o QR Code é gerado</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isConnected && qrCode && (
        <div className="text-center my-5">
          <p className="text-gray-700 dark:text-gray-300 mb-4">Escaneie este código QR com o WhatsApp para conectar</p>
          <div className="flex justify-center items-center my-5">
            <div className="bg-gray-100 p-8 rounded-xl shadow-2xl border-4 border-gray-400 inline-block">
              {/* Container externo com fundo contrastante */}
              <div className="bg-white p-6 border-4 border-black rounded-lg shadow-lg">
                {/* Margem interna para criar "quiet zone" do QR code */}
                <div className="flex justify-center items-center">
                  <img
                    src={qrCode}
                    alt="Código QR do WhatsApp"
                    className="w-[260px] h-[260px]"
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
              <p className="text-sm text-gray-700 mt-4 font-semibold">📱 Aponte a câmera do WhatsApp para o código acima</p>
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
