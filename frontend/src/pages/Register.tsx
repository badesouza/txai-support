import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../utils/toast';
import InputMask from 'react-input-mask';

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      Swal.fire({
        title: 'Erro!',
        text: 'As senhas não coincidem.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      await api.post(API_CONFIG.ENDPOINTS.REGISTER, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      showSuccessToast('Usuário registrado com sucesso!');
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Erro no registro:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao registrar usuário. Tente novamente.';
      Swal.fire({
        title: 'Erro!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 py-12 sm:px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Criar nova conta</h2>
          <p className="mt-2 text-sm text-gray-400">Cadastre-se para acessar o TXAI Suporte</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="form-label">Nome</label>
            <input id="name" name="name" type="text" required value={formData.name} onChange={handleChange} className="form-input" placeholder="Seu nome" />
          </div>
          <div>
            <label htmlFor="email" className="form-label">E-mail</label>
            <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className="form-input" placeholder="seu@email.com" />
          </div>
          <div>
            <label htmlFor="phone" className="form-label">Telefone</label>
            <InputMask mask="(99) 99999-9999" value={formData.phone} onChange={handleChange}>
              {(inputProps: React.InputHTMLAttributes<HTMLInputElement>) => (
                <input {...inputProps} id="phone" name="phone" type="tel" required className="form-input" placeholder="(11) 98765-4321" />
              )}
            </InputMask>
          </div>
          <div>
            <label htmlFor="password" className="form-label">Senha</label>
            <input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} className="form-input" placeholder="••••••••" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="form-label">Confirmar senha</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} className="form-input" placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-primary w-full">Registrar</button>
          <p className="text-center text-sm text-gray-500">
            Já tem uma conta?{' '}
            <Link to="/login" className="font-medium text-primary-400 hover:text-primary-300">
              Faça login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
} 