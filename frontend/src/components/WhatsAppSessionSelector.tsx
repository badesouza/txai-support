import React, { useEffect, useState, useCallback } from 'react';
import { Select, Button, Modal, Input, message, Tag, Spin, Tooltip, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, PhoneOutlined } from '@ant-design/icons';
import api from '../config/axios';

interface SessionInfo {
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'QR_CODE' | 'STARTING' | 'UNKNOWN';
  phone: string | null;
}

interface SessionsResponse {
  sessions: SessionInfo[];
  defaultSession: string;
}

interface WhatsAppSessionSelectorProps {
  onSessionChange?: (sessionName: string) => void;
  selectedSession?: string;
}

const statusColors: Record<SessionInfo['status'], string> = {
  CONNECTED: 'green',
  DISCONNECTED: 'red',
  QR_CODE: 'orange',
  STARTING: 'blue',
  UNKNOWN: 'default',
};

const statusLabels: Record<SessionInfo['status'], string> = {
  CONNECTED: 'Conectado',
  DISCONNECTED: 'Desconectado',
  QR_CODE: 'Aguardando QR',
  STARTING: 'Iniciando',
  UNKNOWN: 'Desconhecido',
};

const WhatsAppSessionSelector: React.FC<WhatsAppSessionSelectorProps> = ({
  onSessionChange,
  selectedSession: externalSelectedSession,
}) => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [defaultSession, setDefaultSession] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<SessionsResponse>('/whatsapp/sessions');
      const { sessions: sessionList, defaultSession: defSession } = response.data;
      
      setSessions(sessionList);
      setDefaultSession(defSession);
      
      // Set initial selection if not already set
      if (!selectedSession && defSession) {
        setSelectedSession(defSession);
        onSessionChange?.(defSession);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      message.error('Erro ao carregar sessões');
    } finally {
      setLoading(false);
    }
  }, [onSessionChange, selectedSession]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Sync with external selected session
  useEffect(() => {
    if (externalSelectedSession && externalSelectedSession !== selectedSession) {
      setSelectedSession(externalSelectedSession);
    }
  }, [externalSelectedSession, selectedSession]);

  const handleSessionChange = (value: string) => {
    setSelectedSession(value);
    onSessionChange?.(value);
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      message.warning('Por favor, insira um nome para a sessão');
      return;
    }

    // Validate session name
    if (!/^[a-zA-Z0-9_-]+$/.test(newSessionName)) {
      message.error('Nome da sessão deve conter apenas letras, números, hífens e underscores');
      return;
    }

    try {
      setCreating(true);
      await api.post('/whatsapp/sessions', { name: newSessionName });
      message.success(`Sessão "${newSessionName}" criada com sucesso`);
      setNewSessionName('');
      setCreateModalVisible(false);
      await fetchSessions();
      
      // Select the new session
      setSelectedSession(newSessionName);
      onSessionChange?.(newSessionName);
    } catch (error) {
      console.error('Error creating session:', error);
      message.error('Erro ao criar sessão');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSession = async (sessionName: string) => {
    if (sessionName === defaultSession) {
      message.warning('Não é possível excluir a sessão padrão');
      return;
    }

    Modal.confirm({
      title: 'Excluir Sessão',
      content: `Tem certeza que deseja excluir a sessão "${sessionName}"? Esta ação não pode ser desfeita.`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          setDeleting(sessionName);
          await api.delete(`/whatsapp/sessions/${sessionName}`);
          message.success(`Sessão "${sessionName}" excluída`);
          
          // If deleted session was selected, switch to default
          if (selectedSession === sessionName) {
            setSelectedSession(defaultSession);
            onSessionChange?.(defaultSession);
          }
          
          await fetchSessions();
        } catch (error) {
          console.error('Error deleting session:', error);
          message.error('Erro ao excluir sessão');
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  const renderSessionOption = (session: SessionInfo) => (
    <div className="flex items-center justify-between w-full">
      <span className="flex items-center gap-2">
        <span>{session.name}</span>
        {session.name === defaultSession && (
          <Tag color="blue" className="text-xs">Padrão</Tag>
        )}
      </span>
      <span className="flex items-center gap-2">
        <Tag color={statusColors[session.status]} className="text-xs">
          {statusLabels[session.status]}
        </Tag>
        {session.phone && (
          <Tooltip title={session.phone}>
            <PhoneOutlined className="text-green-500" />
          </Tooltip>
        )}
      </span>
    </div>
  );

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Spin size="small" />
        <span className="text-gray-500">Carregando sessões...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-700 dark:text-gray-300 font-medium">Sessão:</span>
        <Select
          value={selectedSession}
          onChange={handleSessionChange}
          style={{ minWidth: 200 }}
          loading={loading}
          placeholder="Selecione uma sessão"
          optionLabelProp="label"
        >
          {sessions.map((session) => (
            <Select.Option 
              key={session.name} 
              value={session.name}
              label={session.name}
            >
              {renderSessionOption(session)}
            </Select.Option>
          ))}
        </Select>

        <Space>
          <Tooltip title="Atualizar lista">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchSessions}
              loading={loading}
            />
          </Tooltip>
          
          <Tooltip title="Nova sessão">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Nova Sessão
            </Button>
          </Tooltip>
          
          {selectedSession && selectedSession !== defaultSession && (
            <Tooltip title="Excluir sessão">
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteSession(selectedSession)}
                loading={deleting === selectedSession}
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* Session status summary */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>
          Total: <strong>{sessions.length}</strong> sessões
        </span>
        <span>
          Conectadas: <strong className="text-green-600">
            {sessions.filter(s => s.status === 'CONNECTED').length}
          </strong>
        </span>
        <span>
          Aguardando: <strong className="text-orange-500">
            {sessions.filter(s => s.status === 'QR_CODE').length}
          </strong>
        </span>
      </div>

      {/* Create Session Modal */}
      <Modal
        title="Criar Nova Sessão"
        open={createModalVisible}
        onOk={handleCreateSession}
        onCancel={() => {
          setCreateModalVisible(false);
          setNewSessionName('');
        }}
        confirmLoading={creating}
        okText="Criar"
        cancelText="Cancelar"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Crie uma nova sessão para conectar uma conta WhatsApp adicional.
            Cada sessão pode ser conectada a um número de telefone diferente.
          </p>
          <Input
            placeholder="Nome da sessão (ex: suporte, vendas)"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            onPressEnter={handleCreateSession}
            maxLength={50}
          />
          <p className="text-xs text-gray-400 mt-2">
            Use apenas letras minúsculas, números, hífens e underscores.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default WhatsAppSessionSelector;

