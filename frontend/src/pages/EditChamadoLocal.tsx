import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../utils/toast';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

export default function EditChamadoLocal() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await api.get(API_CONFIG.ENDPOINTS.CHAMADO_LOCAL_BY_ID(id!));
        setName(response.data.name);
      } catch (error) {
        console.error('Erro ao buscar local:', error);
        Swal.fire({ title: 'Erro!', text: 'Erro ao buscar dados do local.', icon: 'error', timer: 1500, showConfirmButton: false });
        navigate('/chamado-locais');
      }
    };

    if (id) fetchItem();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.put(API_CONFIG.ENDPOINTS.CHAMADO_LOCAL_BY_ID(id!), { name });
      showSuccessToast('Local atualizado com sucesso.');
      navigate('/chamado-locais');
    } catch (error: unknown) {
      console.error('Erro ao atualizar local:', error);
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire({ title: 'Erro!', text: err.response?.data?.message || 'Erro ao atualizar local.', icon: 'error', confirmButtonText: 'OK' });
    }
  };

  return (
    <PageLayout title="Editar local" description="Atualize o nome do local selecionado.">
      <PageCard>
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5">
          <div>
            <label htmlFor="name" className="form-label">Nome</label>
            <input
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
            <button type="submit" className="btn-primary">Salvar alterações</button>
          </div>
        </form>
      </PageCard>
    </PageLayout>
  );
}
