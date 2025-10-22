import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import InputMask from 'react-input-mask';
import { formatPhoneForDisplay } from '../utils/phoneFormatter';

export default function EditUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profile: 'USER'
  });
  const [, setLoading] = useState(false);


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get(API_CONFIG.ENDPOINTS.USER_BY_ID(id!));
        const user = response.data;
        setFormData({
          name: user.name,
          email: user.email,
          phone: formatPhoneForDisplay(user.phone),
          password: '',
          confirmPassword: '',
          profile: user.profile
        });
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao buscar dados do usuário.',
          icon: 'error',
          timer: 1500,
          showConfirmButton: false
        });
        navigate('/users');
      }
    };

    if (id) {
      fetchUser();
    }
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password && formData.password !== formData.confirmPassword) {
      Swal.fire({
        title: 'Erro!',
        text: 'As senhas não coincidem.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      setLoading(false);
      return;
    }

    try {
      if (formData.password) {
        // Se há senha, enviar com senha
        const { confirmPassword, ...dataToSend } = formData;
        await api.put(API_CONFIG.ENDPOINTS.USER_BY_ID(id!), dataToSend);
      } else {
        // Se não há senha, enviar sem senha
        const { password, confirmPassword, ...dataWithoutPassword } = formData;
        await api.put(API_CONFIG.ENDPOINTS.USER_BY_ID(id!), dataWithoutPassword);
      }

      await Swal.fire({
        title: 'Sucesso!',
        text: 'Usuário atualizado com sucesso.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      navigate('/users');
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao atualizar usuário. Tente novamente.',
        icon: 'error',
        timer: 1500,
        showConfirmButton: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Usuário</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Telefone
            </label>
            <InputMask
              mask="(99) 99999-9999"
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nova Senha (deixe em branco para manter a atual)
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="profile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Perfil
            </label>
            <select
              id="profile"
              name="profile"
              value={formData.profile}
              onChange={handleChange}
              required
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="USER">Usuário</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </>
  );
} 