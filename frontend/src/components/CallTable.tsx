import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Table, Input, Button, Space, Tag, Modal, Image, Tooltip } from 'antd';
import type { ColumnType } from 'antd/es/table';
import api from '../config/axios';
import { API_CONFIG, getImageUrl } from '../config/api';
import Swal from 'sweetalert2';

interface Call {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  images?: Array<{
    id: number;
    filename: string;
    path: string;
  }>;
}

export default function CallTable() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedImages, setSelectedImages] = useState<Array<{ id: number; path: string }> | null>(null);
  const itemsPerPage = 10;
  const navigate = useNavigate();

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

  const handleEdit = (callId: number) => {
    navigate(`/calls/edit/${callId}`);
  };

  const handleDelete = async (callId: number) => {
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

  const handleViewStatusHistory = async (callId: number) => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.CALL_STATUS_HISTORY(callId));
      
      if (response.data && response.data.length > 0) {
        const historyText = response.data.map((entry: any) => 
          `${new Date(entry.createdAt).toLocaleString()}: ${entry.oldStatus} → ${entry.newStatus}`
        ).join('\n');
        
        Swal.fire({
          title: 'Histórico de Status',
          text: historyText,
          icon: 'info',
          confirmButtonText: 'OK'
        });
      } else {
        Swal.fire({
          title: 'Histórico de Status',
          text: 'Nenhum histórico encontrado para este chamado.',
          icon: 'info',
          confirmButtonText: 'OK'
        });
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao carregar histórico de status.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  const columns: ColumnType<Call>[] = [
    {
      title: 'Número',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => `#${id}`,
      sorter: (a, b) => a.id - b.id,
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
          <div className="text-sm font-medium">{record.user.name}</div>
          <div className="text-xs text-gray-500">{record.user.email}</div>
          <div className="text-xs text-gray-500">{record.user.phone}</div>
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
      title: 'Imagens',
      key: 'images',
      width: 100,
      render: (_, record) => (
        <div className="flex items-center">
          {record.images && record.images.length > 0 ? (
            <Button
              type="link"
              onClick={() => setSelectedImages(record.images || [])}
              className="p-0"
            >
              <Image.PreviewGroup>
                <div className="flex -space-x-2">
                  {record.images.slice(0, 3).filter(img => img.path).map((image, index) => (
                    <img
                      key={image.id}
                      src={getImageUrl(image.path)}
                      alt={`Imagem ${index + 1}`}
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                      style={{ zIndex: 3 - index }}
                    />
                  ))}
                  {record.images.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs border-2 border-white">
                      +{record.images.length - 3}
                    </div>
                  )}
                </div>
              </Image.PreviewGroup>
            </Button>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
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
              onClick={() => handleViewStatusHistory(record.id)}
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

      {/* Image Gallery Modal */}
      <Modal
        title="Galeria de Imagens"
        open={selectedImages !== null}
        onCancel={() => setSelectedImages(null)}
        footer={null}
        width={800}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Image.PreviewGroup>
            {selectedImages?.filter(image => image.path).map((image) => (
              <Image
                key={image.id}
                src={getImageUrl(image.path)}
                alt="Imagem do chamado"
                className="rounded-lg"
              />
            ))}
          </Image.PreviewGroup>
        </div>
      </Modal>
    </div>
  );
}
