import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import Swal from 'sweetalert2';
import UserForm, { UserFormValues } from '../components/users/UserForm';

export default function NewUser() {
  const navigate = useNavigate();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<UserFormValues>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profile: 'USER' as 'USER' | 'ADMIN'
  });

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'As senhas não coincidem!'
      });
      return;
    }

    try {
      await api.post('/users', formData);
      
      Swal.fire({
        icon: 'success',
        title: 'Sucesso',
        text: 'Usuário criado com sucesso!'
      }).then(() => {
        navigate('/users');
      });
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      
      let errorMessage = 'Erro ao criar usuário. Tente novamente.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage
      });
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
      title="Novo Usuário"
      formData={formData}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/users')}
      submitLabel="Criar Usuário"
      nameInputRef={nameInputRef}
    />
  );
}