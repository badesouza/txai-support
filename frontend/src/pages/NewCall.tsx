import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../utils/toast';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

interface ReferenceOption {
  id: string;
  name: string;
}

export default function NewCall() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM',
    chamadoLocalId: '',
  });
  const [locais, setLocais] = useState<ReferenceOption[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLocais = async () => {
      try {
        const response = await api.get(`${API_CONFIG.ENDPOINTS.CHAMADO_LOCAIS}?limit=100`);
        setLocais(response.data?.items ?? []);
      } catch (error) {
        console.error('Erro ao buscar locais:', error);
      }
    };

    fetchLocais();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'chamadoLocalId' && value) {
        const selected = locais.find((local) => local.id === value);
        if (selected && !prev.title.trim()) {
          next.title = selected.name;
        }
      }
      return next;
    });
  };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => formDataToSend.append(key, value));
      images.forEach((image) => formDataToSend.append('images', image));

      await api.post(API_CONFIG.ENDPOINTS.CALLS, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showSuccessToast('Chamado criado com sucesso.');
      setFormData({
        title: '',
        description: '',
        status: 'OPEN',
        priority: 'MEDIUM',
        chamadoLocalId: '',
      });
      setImages([]);
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      Swal.fire({ title: 'Erro!', text: 'Erro ao criar chamado.', icon: 'error', timer: 1500, showConfirmButton: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Novo chamado" description="Registre uma nova solicitação de suporte.">
      <PageCard>
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5">
          <div>
            <label htmlFor="chamadoLocalId" className="form-label">Local</label>
            <select
              id="chamadoLocalId"
              name="chamadoLocalId"
              className="form-select"
              value={formData.chamadoLocalId}
              onChange={handleChange}
              required
            >
              <option value="">Selecione um local</option>
              {locais.map((local) => (
                <option key={local.id} value={local.id}>{local.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="title" className="form-label">Título</label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-input"
              value={formData.title}
              onChange={handleChange}
              placeholder="Digite o título do chamado..."
            />
          </div>
          <div>
            <label htmlFor="description" className="form-label">Descrição</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="form-textarea"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descreva o problema ou solicitação..."
              required
            />
          </div>
          <div>
            <label className="form-label">Imagens</label>
            <div className="rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center transition-colors hover:border-primary-500/30 hover:bg-primary-500/5">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-primary-600">Clique para enviar</span>
                <span className="text-sm text-gray-500"> ou arraste arquivos</span>
                <input id="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleImageChange} />
              </label>
              <p className="mt-1 text-xs text-gray-400">PNG, JPG, GIF até 10MB</p>
            </div>
            {images.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img src={URL.createObjectURL(image)} alt={`Preview ${index + 1}`} className="h-24 w-full rounded-lg object-cover" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={() => navigate('/calls')} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Salvando...' : 'Salvar chamado'}</button>
          </div>
        </form>
      </PageCard>
    </PageLayout>
  );
}
