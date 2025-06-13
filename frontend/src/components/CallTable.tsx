import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { PencilIcon, TrashIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile: 'admin' | 'technician' | 'requester';
}

interface Call {
  id: number;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  user: User;
  createdAt: string;
  updatedAt: string;
  images?: Array<{
    id: number;
    filename: string;
    path: string;
  }>;
}

interface StatusHistory {
  id: number;
  oldStatus: string;
  newStatus: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export default function CallTable() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const itemsPerPage = 10;

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('Token não encontrado');
        Swal.fire({
          title: 'Erro!',
          text: 'Sessão expirada. Por favor, faça login novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        }).then(() => {
          navigate('/login');
        });
        return;
      }

      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      console.log('Search params:', { searchTerm, params: params.toString() });
      console.log('Auth header:', { Authorization: `Bearer ${token}` });

      const response = await axios.get(`http://localhost:3001/api/calls?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Search response:', response.data);
      console.log('Calls with images:', response.data.calls.map((call: Call) => ({
        id: call.id,
        title: call.title,
        imagesCount: call.images?.length,
        images: call.images
      })));

      if (response.data && response.data.calls && Array.isArray(response.data.calls)) {
        setCalls(response.data.calls);
        setTotalPages(Math.ceil(response.data.pagination.total / itemsPerPage));
      } else {
        console.error('Formato de resposta inválido:', response.data);
        setCalls([]);
        setTotalPages(1);
      }
    } catch (error: any) {
      console.error('Erro ao buscar chamados:', error);
      if (error.response?.status === 401) {
        Swal.fire({
          title: 'Erro!',
          text: 'Sessão expirada. Por favor, faça login novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        }).then(() => {
          navigate('/login');
        });
      } else {
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao carregar lista de chamados.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
      setCalls([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Search term changed:', e.target.value);
    setSearchTerm(e.target.value);
    setCurrentPage(1);
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
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3001/api/calls/${callId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Show success message with no buttons and 1500ms timer
        await Swal.fire({
          title: 'Excluído!',
          text: 'Chamado excluído com sucesso.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        
        fetchCalls();
      } catch (error) {
        console.error('Erro ao excluir chamado:', error);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao excluir chamado. Tente novamente.',
          icon: 'error',
          timer: 1500,
          showConfirmButton: false
        });
      }
    }
  };

  const handleViewHistory = async (callId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3001/api/calls/${callId}/status-history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const history: StatusHistory[] = response.data;
      
      // Criar o conteúdo do modal
      const historyContent = history.map(item => `
        <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              ${formatDate(item.createdAt)}
            </span>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              por ${item.user.name}
            </span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.oldStatus)}">
              ${getStatusText(item.oldStatus)}
            </span>
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.newStatus)}">
              ${getStatusText(item.newStatus)}
            </span>
          </div>
        </div>
      `).join('');

      Swal.fire({
        title: 'Histórico de Status',
        html: `
          <div class="text-left">
            ${history.length === 0 ? '<p class="text-gray-500 dark:text-gray-400">Nenhum registro encontrado.</p>' : historyContent}
          </div>
        `,
        width: '600px',
        showCloseButton: true,
        showConfirmButton: false,
        customClass: {
          container: 'dark:bg-gray-800',
          popup: 'dark:bg-gray-800 dark:text-white',
          title: 'dark:text-white',
          closeButton: 'dark:text-white'
        }
      });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'CLOSED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
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
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhone = (phone: string) => {
    // Remove @c.us or @g.us suffix and any non-numeric characters
    const cleanPhone = phone.split('@')[0].replace(/[^0-9]/g, '');
    
    // Remove country code (first digit) if number is longer than 10 digits
    const withoutCountryCode = cleanPhone.length > 10 ? cleanPhone.slice(1) : cleanPhone;
    
    // Format as (XX) XXXXX-XXXX
    if (withoutCountryCode.length === 11) {
      return `(${withoutCountryCode.slice(0, 2)}) ${withoutCountryCode.slice(2, 7)}-${withoutCountryCode.slice(7)}`;
    }
    return phone; // Return original if not 11 digits
  };

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      <div className="p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
            </svg>
          </div>
          <input
            type="search"
            className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Buscar chamados..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
              Número
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/4">
              Título
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/4">
              Usuário
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
              Prioridade
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">
              Imagens
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Carregando...
              </td>
            </tr>
          ) : calls.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhum chamado encontrado.
              </td>
            </tr>
          ) : (
            calls.map((call) => (
              <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  #{call.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs" title={call.title}>
                    {call.title}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">{call.user.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{call.user.email}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{formatPhone(call.user.phone)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(call.status)}`}>
                    {getStatusText(call.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(call.priority)}`}>
                    {getPriorityText(call.priority)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex -space-x-2">
                    {call.images && call.images.length > 0 ? (
                      <>
                        {call.images.slice(0, 4).map((image, index) => (
                          <img
                            key={image.id}
                            src={`http://localhost:3001${image.path}`}
                            alt={`Imagem ${index + 1}`}
                            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800"
                          />
                        ))}
                        {call.images.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-800">
                            +{call.images.length - 4}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                        -
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleViewHistory(call.id)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Histórico"
                    >
                      <ClockIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(call.id)}
                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      title="Editar"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(call.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Excluir"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalPages * itemsPerPage)}</span> de{' '}
              <span className="font-medium">{totalPages * itemsPerPage}</span> resultados
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Anterior</span>
                &laquo;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    currentPage === page
                      ? 'z-10 bg-primary-50 dark:bg-primary-900 border-primary-500 text-primary-600 dark:text-primary-300'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Próxima</span>
                &raquo;
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
} 