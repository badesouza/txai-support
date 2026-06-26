import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../utils/toast';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

export default function NewChamadoLocal() {
  const navigate = useNavigate();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post(API_CONFIG.ENDPOINTS.CHAMADO_LOCAIS, { name });
      showSuccessToast('Local criado com sucesso!');
      setName('');
      nameInputRef.current?.focus();
    } catch (error: unknown) {
      console.error('Erro ao criar local:', error);
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire({ icon: 'error', title: 'Erro', text: err.response?.data?.message || 'Erro ao criar local.' });
    }
  };

  return (
    <PageLayout title="Novo local" description="Cadastre um local para seleção no WhatsApp.">
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
            <button type="button" onClick={() => navigate('/chamado-locais')} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Criar local</button>
          </div>
        </form>
      </PageCard>
    </PageLayout>
  );
}
