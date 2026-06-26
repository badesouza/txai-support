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
import { formatPhoneForDisplay } from '../utils/phoneFormatter';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile: string;
}

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await api.get(`${API_CONFIG.ENDPOINTS.USERS}?${params.toString()}`);

      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
        setTotalItems(response.data.length);
      } else if (response.data && response.data.users && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
        setTotalItems(response.data.total || response.data.users.length);
      } else {
        console.error('Formato de resposta inválido:', response.data);
        setUsers([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsers([]);
      setTotalItems(0);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao carregar lista de usuários.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm, fetchUsers]);

  const handleEdit = (userId: number) => {
    navigate(`/users/edit/${userId}`);
  };

  const handleDelete = async (userId: number) => {
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
        await api.delete(API_CONFIG.ENDPOINTS.USER_BY_ID(userId));
        showSuccessToast({ title: 'Excluído!', text: 'Usuário excluído com sucesso.' });
        fetchUsers();
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao excluir usuário. Tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    }
  };

  const columns: ColumnType<User>[] = [
    {
      title: 'Nome',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'E-mail',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Telefone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => formatPhoneForDisplay(phone),
    },
    {
      title: 'Perfil',
      dataIndex: 'profile',
      key: 'profile',
      render: (profile: string) => profile.toUpperCase() === 'ADMIN' ? 'Administrador' : 'Usuário',
      filters: [
        { text: 'Administrador', value: 'ADMIN' },
        { text: 'Usuário', value: 'USER' },
      ],
      onFilter: (value, record) => record.profile.toUpperCase() === value,
    },
    {
      title: 'Ações',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
            className="text-primary-600 hover:text-primary-900"
          />
          <Button
            type="link"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            className={DELETE_ICON_BUTTON_CLASS}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="data-table-toolbar">
        <Input.Search
          placeholder="Buscar usuários..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          allowClear
          className="data-table-search"
        />
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        size="middle"
        pagination={{
          current: currentPage,
          pageSize: itemsPerPage,
          total: totalItems,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
        }}
        locale={{
          emptyText: 'Nenhum usuário encontrado',
        }}
      />
    </div>
  );
}
