import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../config/axios';
import { API_CONFIG, getImageUrl } from '../config/api';
import Swal from 'sweetalert2';

interface CallImage {
  id: number | string;
  filename: string;
  path: string;
}

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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM'
  });
  const [initialStatus, setInitialStatus] = useState('');
  const [images, setImages] = useState<CallImage[]>([]);
  const [attachments, setAttachments] = useState<CallAttachment[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

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
          priority: call.priority
        });
        setInitialStatus(call.status);
        
        // Handle legacy images
        if (call.images && Array.isArray(call.images)) {
          console.log('🖼️ Imagens (legacy) encontradas:', call.images);
          setImages(call.images);
        } else {
          setImages([]);
        }
        
        // Handle new attachments (from subcollection - includes WhatsApp media)
        if (call.attachments && Array.isArray(call.attachments)) {
          console.log('📎 Attachments encontrados:', call.attachments);
          console.log('→ URLs:', call.attachments.map((att: CallAttachment) => att.url || att.path));
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

  const removeExistingImage = async (imageId: number) => {
    try {
      // Show confirmation dialog
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

      await api.delete(API_CONFIG.ENDPOINTS.CALL_IMAGE(id!, imageId));
      setImages(prev => prev.filter(img => img.id !== imageId));
      await Swal.fire({
        title: 'Sucesso!',
        text: 'Imagem removida com sucesso.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao remover imagem. Tente novamente.',
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
              Imagens e Anexos
            </label>
            
            {/* Attachments from WhatsApp / subcollection (new data model) */}
            {attachments.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📎 Anexos ({attachments.length})
                  <span className="text-xs text-gray-500 ml-2">
                    (WhatsApp e uploads)
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {attachments.map((attachment) => {
                    const attachmentUrl = attachment.url || getImageUrl(attachment.path);
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
                          <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <video 
                              src={attachmentUrl} 
                              className="h-24 w-24 object-cover rounded-lg"
                              preload="metadata"
                            />
                          </div>
                        ) : (
                          <div className="h-24 w-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-gray-500 text-center px-1">{attachment.filename}</span>
                          </div>
                        )}
                        {/* Badge showing source */}
                        <span className={`absolute bottom-1 left-1 text-[10px] px-1 py-0.5 rounded ${
                          attachment.source === 'whatsapp' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}>
                          {attachment.source === 'whatsapp' ? '📱' : '⬆️'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Legacy images (old data model) */}
            {images.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🖼️ Imagens cadastradas (legacy)</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {images.filter(image => image.path).map((image) => {
                    const imageUrl = getImageUrl(image.path);
                    return (
                      <div key={image.id} className="relative">
                        <img
                          src={imageUrl}
                          alt={image.filename}
                          className="h-24 w-24 object-cover rounded-lg"
                          onError={(e) => {
                            console.error('Erro ao carregar imagem:', imageUrl);
                            const target = e.target as HTMLImageElement;
                            if (target.src !== 'https://via.placeholder.com/150?text=Erro+ao+carregar') {
                              target.src = 'https://via.placeholder.com/150?text=Erro+ao+carregar';
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(Number(image.id))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none"
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

            {/* Upload de novas imagens */}
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                  >
                    <span>Upload de imagens</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                  <p className="pl-1">ou arraste e solte</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF até 10MB
                </p>
              </div>
            </div>

            {/* Preview das novas imagens */}
            {newImages.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Novas imagens</h3>
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