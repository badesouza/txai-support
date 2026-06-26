import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../utils/toast';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

export default function NewDepartamento() {
  const navigate = useNavigate();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post(API_CONFIG.ENDPOINTS.DEPARTAMENTOS, { name });
      showSuccessToast('Departamento criado com sucesso!');
      setName('');
      nameInputRef.current?.focus();
    } catch (error: unknown) {
      console.error('Erro ao criar departamento:', error);
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire({ icon: 'error', title: 'Erro', text: err.response?.data?.message || 'Erro ao criar departamento.' });
    }
  };

  return (
    <PageLayout title="Novo departamento" description="Cadastre um departamento para vincular aos chamados.">
      <PageCard>
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5">
          <div>
            <label htmlFor="name" className="form-label">Nome</label>
            <input
              ref={nameInputRef}
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={() => navigate('/departamentos')} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Criar departamento</button>
          </div>
        </form>
      </PageCard>
    </PageLayout>
  );
}
