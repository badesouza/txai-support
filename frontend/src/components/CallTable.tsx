import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditOutlined, DeleteOutlined, EyeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Table, Input, Button, Space, Tag, Modal, Image, Tooltip, Timeline, Typography, Divider, Empty, Skeleton, Tabs } from 'antd';
import type { ColumnType } from 'antd/es/table';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';

interface Call {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  // Denormalized user fields
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  // Aggregated fields
  messageCount?: number;
  attachmentCount?: number;
  lastActivityAt?: string;
  lastMessagePreview?: string;
  // Subcollection data (when details=true)
  messages?: Array<{
    id: string;
    content: string;
    messageType: string;
    source: string;
    sessionName?: string;
    direction: string;
    senderPhone?: string;
    senderName?: string;
    createdAt: string;
  }>;
  attachments?: Array<{
    id: string;
    filename: string;
    path: string;
    mimetype: string;
    source: string;
    url?: string;
    createdAt: string;
  }>;
  history?: Array<{
    id: string;
    type: string;
    oldStatus?: string;
    newStatus?: string;
    userId: string;
    userName?: string;
    note?: string;
    createdAt: string;
  }>;
}

interface CallStatusHistoryEntry {
  id: string | number;
  callId: string | number;
  oldStatus: string;
  newStatus: string;
  userId?: string | number;
  userName?: string;
  createdAt: string | Date;
  user?: { id: string | number; name: string; email: string } | null;
}

interface WhatsAppHistoryMessage {
  id: string;
  callId?: string | number;
  phone: string;
  message: string;
  messageType: string;
  isFromUser: boolean;
  createdAt: string | Date;
  mediaUrl?: string | null;
}

export default function CallTable() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedImages, setSelectedImages] = useState<Array<{ id: string | number; path: string; filename?: string }> | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyEntries, setHistoryEntries] = useState<CallStatusHistoryEntry[]>([]);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
  const [historyCallId, setHistoryCallId] = useState<string | number | null>(null);
  const [waLoading, setWaLoading] = useState<boolean>(false);
  const [waErrorMessage, setWaErrorMessage] = useState<string | null>(null);
  const [waMessages, setWaMessages] = useState<WhatsAppHistoryMessage[]>([]);
  const [historyTab, setHistoryTab] = useState<'audit' | 'whatsapp'>('audit');
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const getStatusTimelineColor = (status: string): string => {
    // Map status to a strong, consistent visual language for the timeline.
    switch (status) {
      case 'OPEN':
        return '#f59e0b';
      case 'IN_PROGRESS':
        return '#0ea5e9';
      case 'CLOSED':
        return '#22c55e';
      default:
        return 'gray';
    }
  };

  const formatPtBrDateTime = (value: unknown): string => {
    // Format date/time for PT-BR, with a safe fallback.
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return 'Data/horário indisponível';
    return date.toLocaleString('pt-BR');
  };

  const formatPtBrDate = (value: unknown): string => {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return 'Data indisponível';
    return date.toLocaleDateString('pt-BR');
  };

  const formatPtBrTime = (value: unknown): string => {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const groupMessagesByDate = (messages: WhatsAppHistoryMessage[]) => {
    const groups = new Map<string, WhatsAppHistoryMessage[]>();
    for (const m of messages) {
      const key = formatPtBrDate(m.createdAt);
      const existing = groups.get(key) ?? [];
      existing.push(m);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).map(([dateLabel, items]) => ({
      dateLabel,
      items: items.slice().sort((a, b) => new Date(String(a.createdAt)).getTime() - new Date(String(b.createdAt)).getTime()),
    }));
  };

  const isMediaType = (type: string) => type === 'image' || type === 'video';

  const fetchWhatsAppHistory = async (callId: string | number) => {
    setWaLoading(true);
    setWaErrorMessage(null);
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.WHATSAPP + `/message-history?callId=${callId}`);
      const msgs = (response.data?.messages ?? []) as WhatsAppHistoryMessage[];
      setWaMessages(msgs);
    } catch (error) {
      console.error('Erro ao buscar histórico WhatsApp:', error);
      setWaErrorMessage('Não foi possível carregar a conversa do WhatsApp.');
      setWaMessages([]);
    } finally {
      setWaLoading(false);
    }
  };

  const getStatusChangeLabel = (oldStatus: string, newStatus: string): string => {
    // Provide a professional, human-readable label for common transitions.
    if (oldStatus === 'OPEN' && newStatus === 'IN_PROGRESS') return 'Início do atendimento';
    if (oldStatus === 'IN_PROGRESS' && newStatus === 'CLOSED') return 'Encerramento do chamado';
    if (oldStatus === 'CLOSED' && newStatus === 'IN_PROGRESS') return 'Reabertura para nova tratativa';
    if (oldStatus === newStatus) return 'Atualização registrada';
    return 'Atualização de status';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'warning';
      case 'IN_PROGRESS':
        return 'processing';
      case 'CLOSED':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'Aberto';
      case 'IN_PROGRESS':
        return 'Em Progresso';
      case 'CLOSED':
        return 'Fechado';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'Alta';
      case 'MEDIUM':
        return 'Média';
      case 'LOW':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await api.get(`${API_CONFIG.ENDPOINTS.CALLS}?${params.toString()}`);

      if (response.data && Array.isArray(response.data)) {
        setCalls(response.data);
        setTotalItems(response.data.length);
      } else if (response.data && response.data.calls && Array.isArray(response.data.calls)) {
        setCalls(response.data.calls);
        setTotalItems(response.data.pagination?.total || response.data.calls.length);
      } else {
        console.error('Formato de resposta inválido:', response.data);
        setCalls([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
      setCalls([]);
      setTotalItems(0);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao carregar lista de chamados.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCalls();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm]);

  const handleEdit = (callId: string | number) => {
    navigate(`/calls/edit/${callId}`);
  };

  const handleDelete = async (callId: string | number) => {
    const result = await Swal.fire({
      title: 'Tem certeza?',
      text: "Esta ação não poderá ser revertida!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(API_CONFIG.ENDPOINTS.CALL_BY_ID(callId));
        Swal.fire({
          title: 'Excluído!',
          text: 'Chamado excluído com sucesso.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        fetchCalls();
      } catch (error) {
        console.error('Erro ao excluir chamado:', error);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao excluir chamado. Tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    }
  };

  const handleViewStatusHistory = async (call: Pick<Call, 'id' | 'status'>) => {
    setHistoryCallId(call.id);
    setIsHistoryModalOpen(true);
    setHistoryEntries([]);
    setHistoryErrorMessage(null);
    setHistoryLoading(true);
    setWaMessages([]);
    setWaErrorMessage(null);
    setHistoryTab('whatsapp');

    try {
      const [historyResponse] = await Promise.all([
        api.get(API_CONFIG.ENDPOINTS.CALL_STATUS_HISTORY(call.id)),
        fetchWhatsAppHistory(call.id),
      ]);
      const entries = Array.isArray(historyResponse.data) ? (historyResponse.data as CallStatusHistoryEntry[]) : [];
      setHistoryEntries(entries);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      setHistoryErrorMessage('Não foi possível carregar o histórico agora. Tente novamente em instantes.');
      setHistoryEntries([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns: ColumnType<Call>[] = [
    {
      title: 'Número',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string | number) => `#${typeof id === 'string' ? id.substring(0, 8) : id}`,
      sorter: (a, b) => String(a.id).localeCompare(String(b.id)),
    },
    {
      title: 'Local',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => (
        <Tooltip title={title}>
          <span>{title}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Usuário',
      key: 'user',
      render: (_, record) => (
        <div>
          <div className="text-sm font-medium">{record.user?.name || record.userName || 'N/A'}</div>
          <div className="text-xs text-gray-500">{record.user?.email || record.userEmail || '-'}</div>
          <div className="text-xs text-gray-500">{record.user?.phone || record.userPhone || '-'}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
      filters: [
        { text: 'Aberto', value: 'OPEN' },
        { text: 'Em Progresso', value: 'IN_PROGRESS' },
        { text: 'Fechado', value: 'CLOSED' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Prioridade',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {getPriorityText(priority)}
        </Tag>
      ),
      filters: [
        { text: 'Alta', value: 'HIGH' },
        { text: 'Média', value: 'MEDIUM' },
        { text: 'Baixa', value: 'LOW' },
      ],
      onFilter: (value, record) => record.priority === value,
    },
    {
      title: 'Anexos',
      key: 'attachments',
      width: 120,
      render: (_, record) => {
        const attachments = record.attachments || [];
        const totalCount = record.attachmentCount || attachments.length;
        
        return (
          <div className="flex items-center">
            {totalCount > 0 ? (
              <Button
                type="link"
                onClick={() => setSelectedImages(attachments.map(att => ({ id: att.id, path: att.url || att.path, filename: att.filename })))}
                className="p-0"
              >
                <div className="flex -space-x-2">
                  {attachments.slice(0, 3).map((att, index) => {
                    const isVideo = att.mimetype?.startsWith('video/');
                    const isWhatsApp = att.source === 'whatsapp';
                    const url = att.url || att.path;
                    return isVideo ? (
                      <div
                        key={att.id}
                        className={`w-8 h-8 rounded-full border-2 ${isWhatsApp ? 'border-green-400' : 'border-white'} bg-gray-200 flex items-center justify-center`}
                        style={{ zIndex: 3 - index }}
                        title="Vídeo"
                      >
                        <PlayCircleOutlined />
                      </div>
                    ) : (
                      <img
                        key={att.id}
                        src={url}
                        alt={`Mídia ${index + 1}`}
                        className={`w-8 h-8 rounded-full border-2 ${isWhatsApp ? 'border-green-400' : 'border-white'} object-cover`}
                        style={{ zIndex: 3 - index }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/32?text=!';
                        }}
                      />
                    );
                  })}
                  {totalCount > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs border-2 border-white">
                      +{totalCount - 3}
                    </div>
                  )}
                </div>
              </Button>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Ações',
      key: 'actions',
      align: 'right',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Histórico">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewStatusHistory({ id: record.id, status: record.status })}
              className="text-blue-600"
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record.id)}
              className="text-primary-600"
            />
          </Tooltip>
          <Tooltip title="Excluir">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      <div className="p-4 bg-white dark:bg-gray-800">
        <Input.Search
          placeholder="Buscar chamados..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          allowClear
          className="mb-4"
          style={{ maxWidth: 400 }}
        />
        
        <Table
          columns={columns}
          dataSource={calls}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: itemsPerPage,
            total: totalItems,
            onChange: (page) => setCurrentPage(page),
            showSizeChanger: false,
            showTotal: (total, range) => `Mostrando ${range[0]} a ${range[1]} de ${total} resultados`,
          }}
          locale={{
            emptyText: 'Nenhum chamado encontrado',
          }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* Attachment Gallery Modal */}
      <Modal
        title="Galeria de Anexos"
        open={selectedImages !== null}
        onCancel={() => setSelectedImages(null)}
        footer={null}
        width={800}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {selectedImages?.filter(item => item.path).map((item) => {
            const url = item.path; // Path is already the URL from attachments
            const isVideo = item.filename?.match(/\.(mp4|webm|mov|avi)$/i) || item.path?.includes('video');
            return isVideo ? (
              <video
                key={item.id}
                className="w-full rounded-lg"
                controls
                preload="metadata"
                src={url}
              />
            ) : (
              <Image
                key={item.id}
                src={url}
                alt={item.filename || 'Anexo do chamado'}
                className="rounded-lg"
              />
            );
          })}
        </div>
      </Modal>

      {/* Status History Modal */}
      <Modal
        title={historyCallId ? `Histórico do Chamado #${historyCallId}` : 'Histórico do Chamado'}
        open={isHistoryModalOpen}
        onCancel={() => {
          setIsHistoryModalOpen(false);
          setHistoryEntries([]);
          setHistoryErrorMessage(null);
          setHistoryCallId(null);
          setWaMessages([]);
          setWaErrorMessage(null);
          setHistoryTab('audit');
        }}
        footer={null}
        width={760}
      >
        <Tabs
          activeKey={historyTab}
          onChange={(key) => setHistoryTab(key as 'audit' | 'whatsapp')}
          items={[
            {
              key: 'whatsapp',
              label: 'WhatsApp',
              children: (
                <div className="flex flex-col gap-3">
                  <Typography.Text className="text-gray-600 dark:text-gray-300">
                    Conversa do WhatsApp agrupada por data (texto + anexos).
                  </Typography.Text>

                  <Divider className="my-2" />

                  {waLoading ? (
                    <div className="py-2">
                      <Skeleton active paragraph={{ rows: 8 }} />
                    </div>
                  ) : waErrorMessage ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                      {waErrorMessage}
                    </div>
                  ) : waMessages.length === 0 ? (
                    <Empty description="Nenhuma mensagem do WhatsApp registrada para este chamado." />
                  ) : (
                    <div className="flex flex-col gap-4">
                      {groupMessagesByDate(waMessages).map((group) => (
                        <div key={group.dateLabel} className="flex flex-col gap-2">
                          <div className="flex justify-center">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                              {group.dateLabel}
                            </span>
                          </div>

                          {group.items.map((m) => {
                            const align = m.isFromUser ? 'justify-end' : 'justify-start';
                            const bubbleColor = m.isFromUser
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100';

                            return (
                              <div key={m.id} className={`flex ${align}`}>
                                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${bubbleColor}`}>
                                  {m.messageType === 'text' ? (
                                    <div className="whitespace-pre-wrap text-sm">{m.message}</div>
                                  ) : isMediaType(m.messageType) ? (
                                    <div className="flex flex-col gap-2">
                                      <div className="text-sm font-medium">
                                        {m.messageType === 'image' ? 'Imagem anexada' : 'Vídeo anexado'}
                                      </div>
                                      {m.mediaUrl ? (
                                        m.messageType === 'image' ? (
                                          <Image src={m.mediaUrl} alt="Imagem WhatsApp" className="rounded-lg" />
                                        ) : (
                                          <video className="w-full rounded-lg" controls preload="metadata" src={m.mediaUrl} />
                                        )
                                      ) : (
                                        <div className="text-xs opacity-80">Mídia indisponível.</div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-sm">{m.message}</div>
                                  )}

                                  <div className="mt-1 text-right text-[11px] opacity-80">
                                    {formatPtBrTime(m.createdAt)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'audit',
              label: 'Auditoria',
              children: (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Typography.Text className="text-gray-600 dark:text-gray-300">
                        Linha do tempo das mudanças de status, com auditoria de responsável e data/hora.
                      </Typography.Text>
                      <div className="mt-1 flex items-center gap-2">
                        <Typography.Text type="secondary">
                          Total de movimentações: {historyEntries.length}
                        </Typography.Text>
                        <span className="text-gray-300">•</span>
                        <Typography.Text type="secondary">
                          Última atualização:{' '}
                          {historyEntries[0]?.createdAt ? formatPtBrDateTime(historyEntries[0].createdAt) : '—'}
                        </Typography.Text>
                      </div>
                    </div>
                    <Tag color="processing" className="select-none">
                      Auditoria
                    </Tag>
                  </div>

                  <Divider className="my-2" />

                  {historyLoading ? (
                    <div className="py-2">
                      <Skeleton active paragraph={{ rows: 6 }} />
                    </div>
                  ) : historyErrorMessage ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                      {historyErrorMessage}
                    </div>
                  ) : historyEntries.length === 0 ? (
                    <Empty
                      description={
                        <div className="text-sm">
                          <div>Nenhum histórico encontrado para este chamado.</div>
                          <div className="text-gray-500 dark:text-gray-400">
                            Dica: o histórico é criado quando o status é alterado (ex.: Aberto → Em Progresso → Fechado).
                          </div>
                        </div>
                      }
                    />
                  ) : (
                    <Timeline
                      items={historyEntries
                        .slice()
                        .reverse()
                        .map((entry) => {
                          const actorName = entry.user?.name || entry.userName || 'Sistema';
                          const actorEmail = entry.user?.email;
                          const label = getStatusChangeLabel(entry.oldStatus, entry.newStatus);

                          return {
                            color: getStatusTimelineColor(entry.newStatus),
                            children: (
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Typography.Text strong>{label}</Typography.Text>
                                  <Tag color={getStatusColor(entry.oldStatus)} className="select-none">
                                    {getStatusText(entry.oldStatus)}
                                  </Tag>
                                  <span className="text-gray-400">→</span>
                                  <Tag color={getStatusColor(entry.newStatus)} className="select-none">
                                    {getStatusText(entry.newStatus)}
                                  </Tag>
                                </div>

                                <Typography.Text type="secondary">
                                  {formatPtBrDateTime(entry.createdAt)} — Responsável: {actorName}
                                  {actorEmail ? ` (${actorEmail})` : ''}
                                </Typography.Text>

                                <Typography.Text className="text-xs text-gray-500 dark:text-gray-400">
                                  Registro de auditoria gerado automaticamente pelo sistema para garantir rastreabilidade do atendimento.
                                </Typography.Text>
                              </div>
                            ),
                          };
                        })}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
