import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import InputMask from 'react-input-mask';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../utils/toast';
import { formatPhoneForDisplay } from '../utils/phoneFormatter';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

export default function EditUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
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
          profile: user.profile,
        });
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        Swal.fire({ title: 'Erro!', text: 'Erro ao buscar dados do usuário.', icon: 'error', timer: 1500, showConfirmButton: false });
        navigate('/users');
      }
    };

    if (id) fetchUser();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password && formData.password !== formData.confirmPassword) {
      Swal.fire({ title: 'Erro!', text: 'As senhas não coincidem.', icon: 'error', confirmButtonText: 'OK' });
      setLoading(false);
      return;
    }

    try {
      if (formData.password) {
        const { confirmPassword, ...dataToSend } = formData;
        await api.put(API_CONFIG.ENDPOINTS.USER_BY_ID(id!), dataToSend);
      } else {
        const { password, confirmPassword, ...dataWithoutPassword } = formData;
        await api.put(API_CONFIG.ENDPOINTS.USER_BY_ID(id!), dataWithoutPassword);
      }

      showSuccessToast('Usuário atualizado com sucesso.');
      navigate('/users');
    } catch (error: unknown) {
      console.error('Erro ao atualizar usuário:', error);
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire({ title: 'Erro!', text: err.response?.data?.message || 'Erro ao atualizar usuário.', icon: 'error', confirmButtonText: 'OK' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <PageLayout title="Editar usuário" description="Atualize os dados do usuário selecionado.">
      <PageCard>
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5">
          <div>
            <label htmlFor="name" className="form-label">Nome</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="form-input" />
          </div>
          <div>
            <label htmlFor="email" className="form-label">E-mail</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="form-input" />
          </div>
          <div>
            <label htmlFor="phone" className="form-label">Telefone</label>
            <InputMask mask="(99) 99999-9999" type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required className="form-input" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="form-label">Nova senha</label>
              <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Deixe em branco para manter" className="form-input" />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="form-label">Confirmar nova senha</label>
              <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="form-input" />
            </div>
          </div>
          <div>
            <label htmlFor="profile" className="form-label">Perfil</label>
            <select id="profile" name="profile" value={formData.profile} onChange={handleChange} required className="form-select">
              <option value="USER">Usuário</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={() => navigate('/users')} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar alterações</button>
          </div>
        </form>
      </PageCard>
    </PageLayout>
  );
}
