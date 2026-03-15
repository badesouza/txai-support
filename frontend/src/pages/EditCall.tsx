import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import CallAttachmentGrid from '../components/calls/CallAttachmentGrid';
import ImageUploadField from '../components/calls/ImageUploadField';
import { buildCallFormData, CallFormValues } from '../utils/callForm';

interface CallAttachment {
  id: string;
  filename: string;
  path: string;
  url?: string;
  mimetype: string;
  source: 'upload' | 'whatsapp';
  createdAt: string;
}

export default function EditCall() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<CallFormValues>({
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM'
  });
  const [initialStatus, setInitialStatus] = useState('');
  const [attachments, setAttachments] = useState<CallAttachment[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCall = async () => {
      try {
        const response = await api.get(API_CONFIG.ENDPOINTS.CALL_BY_ID(id!));
        const call = response.data;
        setFormData({
          title: call.title,
          description: call.description,
          status: call.status,
          priority: call.priority
        });
        setInitialStatus(call.status);
        
        // Handle attachments (from subcollection - includes WhatsApp media and uploads)
        if (call.attachments && Array.isArray(call.attachments)) {
          setAttachments(call.attachments);
        } else {
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
      await Swal.fire({
        title: 'Sucesso!',
        text: 'Anexo removido com sucesso.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
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
      const formDataToSend = buildCallFormData(formData, newImages, { oldStatus: initialStatus });

      await api.put(API_CONFIG.ENDPOINTS.CALL_BY_ID(id!), formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      await Swal.fire({
        title: 'Sucesso!',
        text: 'Chamado atualizado com sucesso.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
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
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Chamado</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Título
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              required
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="OPEN">Aberto</option>
              <option value="IN_PROGRESS">Em Progresso</option>
              <option value="CLOSED">Fechado</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prioridade
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Anexos
            </label>
            
            <CallAttachmentGrid attachments={attachments} onRemove={removeAttachment} />
            <ImageUploadField
              images={newImages}
              onImageChange={handleImageChange}
              onRemoveImage={removeNewImage}
              previewTitle="Novas imagens"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/calls')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
