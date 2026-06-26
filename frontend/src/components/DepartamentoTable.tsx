import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Table, Input, Button, Space } from 'antd';
import type { ColumnType } from 'antd/es/table';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../utils/toast';
import { DELETE_ICON_BUTTON_CLASS } from '../constants/ui';

interface Departamento {
  id: string;
  name: string;
}

export default function DepartamentoTable() {
  const [items, setItems] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await api.get(`${API_CONFIG.ENDPOINTS.DEPARTAMENTOS}?${params.toString()}`);

      if (response.data?.items && Array.isArray(response.data.items)) {
        setItems(response.data.items);
        setTotalItems(response.data.pagination?.total ?? response.data.items.length);
      } else {
        setItems([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
      setItems([]);
      setTotalItems(0);
      Swal.fire({ title: 'Erro!', text: 'Erro ao carregar lista de departamentos.', icon: 'error', confirmButtonText: 'OK' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm, fetchItems]);

  const handleEdit = (id: string) => {
    navigate(`/departamentos/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não poderá ser revertida!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(API_CONFIG.ENDPOINTS.DEPARTAMENTO_BY_ID(id));
      showSuccessToast({ title: 'Excluído!', text: 'Departamento excluído com sucesso.' });
      fetchItems();
    } catch (error: unknown) {
      console.error('Erro ao excluir departamento:', error);
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire({
        title: 'Erro!',
        text: err.response?.data?.message || 'Erro ao excluir departamento.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };

  const columns: ColumnType<Departamento>[] = [
    {
      title: 'Nome',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Ações',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record.id)} className="text-blue-600" />
          <Button type="link" icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} className={DELETE_ICON_BUTTON_CLASS} />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Input.Search
        placeholder="Buscar departamentos..."
        allowClear
        onSearch={(value) => {
          setCurrentPage(1);
          setSearchTerm(value);
        }}
        onChange={(e) => {
          if (!e.target.value) {
            setCurrentPage(1);
            setSearchTerm('');
          }
        }}
        style={{ maxWidth: 320 }}
      />
      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: itemsPerPage,
          total: totalItems,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
        }}
      />
    </div>
  );
}
