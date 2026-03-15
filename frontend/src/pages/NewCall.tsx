import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import Swal from 'sweetalert2';
import ImageUploadField from '../components/calls/ImageUploadField';
import { buildCallFormData, CallFormValues } from '../utils/callForm';

export default function NewCall() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CallFormValues>({
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM'
  });
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = buildCallFormData(formData, images);

      await api.post(
        API_CONFIG.ENDPOINTS.CALLS,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      await Swal.fire({
        title: 'Sucesso!',
        text: 'Chamado criado com sucesso.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      navigate('/calls');
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao criar chamado. Tente novamente.',
        icon: 'error',
        timer: 1500,
        showConfirmButton: false
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Novo Chamado
      </h2>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Título
            </label>
            <input
              type="text"
              id="title"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Digite o título do chamado..."
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              id="description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o problema ou solicitação..."
            />
          </div>

          <ImageUploadField images={images} onImageChange={handleImageChange} onRemoveImage={removeImage} />

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/calls')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 