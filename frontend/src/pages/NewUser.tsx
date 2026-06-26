import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InputMask from 'react-input-mask';
import api from '../config/axios';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../utils/toast';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

const INITIAL_USER_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  profile: 'USER' as 'USER' | 'ADMIN',
};

export default function NewUser() {
  const navigate = useNavigate();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState(INITIAL_USER_FORM);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      Swal.fire({ icon: 'error', title: 'Erro', text: 'As senhas não coincidem!' });
      return;
    }

    try {
      await api.post('/users', formData);
      showSuccessToast('Usuário criado com sucesso!');
      setFormData(INITIAL_USER_FORM);
      nameInputRef.current?.focus();
    } catch (error: unknown) {
      console.error('Erro ao criar usuário:', error);
      let errorMessage = 'Erro ao criar usuário. Tente novamente.';
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      if (err.response?.data?.message) errorMessage = err.response.data.message;
      else if (err.response?.data?.error) errorMessage = err.response.data.error;
      Swal.fire({ icon: 'error', title: 'Erro', text: errorMessage });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <PageLayout title="Novo usuário" description="Preencha os dados para cadastrar um novo usuário.">
      <PageCard>
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5">
          <div>
            <label htmlFor="name" className="form-label">Nome</label>
            <input ref={nameInputRef} type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="form-input" />
          </div>
          <div>
            <label htmlFor="email" className="form-label">E-mail</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="form-input" />
          </div>
          <div>
            <label htmlFor="phone" className="form-label">Telefone</label>
            <InputMask mask="(99) 99999-9999" value={formData.phone} onChange={handleChange}>
              {(inputProps: React.InputHTMLAttributes<HTMLInputElement>) => (
                <input {...inputProps} type="tel" id="phone" name="phone" required placeholder="(11) 98765-4321" className="form-input" />
              )}
            </InputMask>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="form-label">Senha</label>
              <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required className="form-input" />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="form-label">Confirmar senha</label>
              <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="form-input" />
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
            <button type="submit" className="btn-primary">Criar usuário</button>
          </div>
        </form>
      </PageCard>
    </PageLayout>
  );
}
