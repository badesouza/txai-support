import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import { formatPhoneForDisplay } from '../utils/phoneFormatter';
import UserForm, { UserFormValues } from '../components/users/UserForm';

export default function EditUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<UserFormValues>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profile: 'USER',
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
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao atualizar usuário. Tente novamente.';
      Swal.fire({
        title: 'Erro!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK'
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
    <UserForm
      title="Editar Usuário"
      formData={formData}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/users')}
      submitLabel="Salvar Alterações"
      passwordRequired={false}
      passwordLabel="Nova Senha (deixe em branco para manter a atual)"
      confirmPasswordLabel="Confirmar Nova Senha"
    />
  );
} 