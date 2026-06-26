import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../utils/toast';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

interface CallAttachment {
  id: string;
  filename: string;
  path: string;
  url?: string;
  mimetype: string;
  source: 'upload' | 'whatsapp';
  createdAt: string;
}

interface ReferenceOption {
  id: string;
  name: string;
}

export default function EditCall() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM',
    chamadoLocalId: '',
    departamentoId: '',
  });
  const [locais, setLocais] = useState<ReferenceOption[]>([]);
  const [departamentos, setDepartamentos] = useState<ReferenceOption[]>([]);
  const [initialStatus, setInitialStatus] = useState('');
  const [attachments, setAttachments] = useState<CallAttachment[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [locaisRes, departamentosRes] = await Promise.all([
          api.get(`${API_CONFIG.ENDPOINTS.CHAMADO_LOCAIS}?limit=100`),
          api.get(`${API_CONFIG.ENDPOINTS.DEPARTAMENTOS}?limit=100`),
        ]);
        setLocais(locaisRes.data?.items ?? []);
        setDepartamentos(departamentosRes.data?.items ?? []);
      } catch (error) {
        console.error('Erro ao buscar locais/departamentos:', error);
      }
    };

    fetchReferenceData();
  }, []);

  useEffect(() => {
    const fetchCall = async () => {
      try {
        const response = await api.get(API_CONFIG.ENDPOINTS.CALL_BY_ID(id!));
        console.log('📦 Resposta da API:', response.data);
        const call = response.data;
        setFormData({
          title: call.title,
          description: call.description,
          status: call.status,
          priority: call.priority,
          chamadoLocalId: call.chamadoLocalId || '',
          departamentoId: call.departamentoId || '',
        });
        setInitialStatus(call.status);
        
        // Handle attachments (from subcollection - includes WhatsApp media and uploads)
        if (call.attachments && Array.isArray(call.attachments)) {
          console.log('📎 Attachments encontrados:', call.attachments);
          setAttachments(call.attachments);
        } else {
          console.log('📎 Nenhum attachment encontrado');
          setAttachments([]);
        }
      } catch (error) {
        console.error('Erro ao buscar chamado:', error);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao buscar dados do chamado.',
          icon: 'error',
          timer: 1500,
          showConfirmButton: false
        });
        navigate('/calls');
      }
    };

    fetchCall();
  }, [id, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setNewImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeAttachment = async (attachmentId: string) => {
    try {
      const result = await Swal.fire({
        title: 'Tem certeza?',
        text: "Esta ação não poderá ser revertida!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sim, deletar!',
        cancelButtonText: 'Cancelar'
      });

      if (!result.isConfirmed) {
        return;
      }

      await api.delete(`/calls/${id}/attachments/${attachmentId}`);
      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
      showSuccessToast('Anexo removido com sucesso.');
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao remover anexo. Tente novamente.',
        icon: 'error',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Adicionar dados do formulário
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      // Adicionar novas imagens
      newImages.forEach(image => {
        formDataToSend.append('images', image);
      });

      // Adicionar o status antigo para histórico
      formDataToSend.append('oldStatus', initialStatus);

      await api.put(API_CONFIG.ENDPOINTS.CALL_BY_ID(id!), formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      showSuccessToast('Chamado atualizado com sucesso.');
      navigate('/calls');
    } catch (error) {
      console.error('Erro ao atualizar chamado:', error);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao atualizar chamado. Tente novamente.',
        icon: 'error',
        timer: 1500,
        showConfirmButton: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <PageLayout title="Editar chamado" description="Atualize os dados e anexos do chamado selecionado.">
      <PageCard>
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5">
          <div>
            <label htmlFor="title" className="form-label">Título</label>
            <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required className="form-input" />
          </div>

          <div>
            <label htmlFor="description" className="form-label">Descrição</label>
            <textarea id="description" name="description" rows={4} value={formData.description} onChange={handleChange} required className="form-textarea" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="chamadoLocalId" className="form-label">Local</label>
              <select
                id="chamadoLocalId"
                name="chamadoLocalId"
                value={formData.chamadoLocalId}
                onChange={handleChange}
                required
                className="form-select"
              >
                <option value="">Selecione um local</option>
                {locais.map((local) => (
                  <option key={local.id} value={local.id}>{local.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="departamentoId" className="form-label">Departamento</label>
              <select
                id="departamentoId"
                name="departamentoId"
                value={formData.departamentoId}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Não definido</option>
                {departamentos.map((departamento) => (
                  <option key={departamento.id} value={departamento.id}>{departamento.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className="form-label">Status</label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} className="form-select">
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em progresso</option>
                <option value="CLOSED">Fechado</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="form-label">Prioridade</label>
              <select id="priority" name="priority" value={formData.priority} onChange={handleChange} className="form-select">
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Anexos</label>
            
            {/* Attachments (from subcollection - includes WhatsApp media and uploads) */}
            {attachments.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-medium text-gray-300">
                  📎 Anexos existentes ({attachments.length})
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {attachments.map((attachment) => {
                    const attachmentUrl = attachment.url || attachment.path;
                    const isVideo = attachment.mimetype?.startsWith('video/');
                    const isImage = attachment.mimetype?.startsWith('image/');
                    
                    return (
                      <div key={attachment.id} className="relative group">
                        {isImage ? (
                          <img
                            src={attachmentUrl}
                            alt={attachment.filename}
                            className="h-24 w-24 object-cover rounded-lg"
                            onError={(e) => {
                              console.error('Erro ao carregar attachment:', attachmentUrl);
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes('placeholder')) {
                                target.src = 'https://via.placeholder.com/150?text=Erro';
                              }
                            }}
                          />
                        ) : isVideo ? (
                          <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                            <video 
                              src={attachmentUrl} 
                              className="h-24 w-24 object-cover rounded-lg"
                              preload="metadata"
                            />
                          </div>
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-white/[0.05]">
                            <span className="text-xs text-gray-500 text-center px-1">{attachment.filename}</span>
                          </div>
                        )}
                        {/* Badge showing source */}
                        <span className={`absolute bottom-1 left-1 text-[10px] px-1 py-0.5 rounded ${
                          attachment.source === 'whatsapp' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}>
                          {attachment.source === 'whatsapp' ? '📱 WhatsApp' : '⬆️ Upload'}
                        </span>
                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center transition-colors hover:border-primary-500/30 hover:bg-primary-500/5">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-primary-600">Clique para enviar</span>
                <span className="text-sm text-gray-500"> ou arraste arquivos</span>
                <input id="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleImageChange} />
              </label>
              <p className="mt-1 text-xs text-gray-400">PNG, JPG, GIF até 10MB</p>
            </div>

            {/* Preview das novas imagens */}
            {newImages.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium text-gray-300">Novas imagens</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {newImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="h-24 w-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={() => navigate('/calls')} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>
        </form>
      </PageCard>
    </PageLayout>
  );
}
