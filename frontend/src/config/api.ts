// Este arquivo pode ser removido se não houver mais uso de API_CONFIG.BASE_URL.
// Caso precise manter, exporte a variável de ambiente:

export const BASE_URL = process.env.REACT_APP_API_URL;

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Função auxiliar para obter a URL base da API
const getApiBaseUrl = (): string => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  
  // Se a URL não começa com http, assumir que é um caminho relativo
  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}${apiUrl}`;
    }
    return `http://localhost:3001${apiUrl}`;
  }
  
  return apiUrl;
};

// Função para construir URLs de imagens que funciona em dev e produção
export const getImageUrl = (imagePath: string): string => {
  // Validar se imagePath existe
  if (!imagePath) {
    return '';
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  try {
    // Usar a função auxiliar para obter a URL base correta
    const baseUrl = getApiBaseUrl();
    
    // Se a URL base é uma URL completa, extrair o domínio
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      const apiUrl = new URL(baseUrl);
      return `${apiUrl.protocol}//${apiUrl.host}${imagePath}`;
    }
    
    // Se for um caminho relativo, usar window.location
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      // Se a API estiver exposta no mesmo host via proxy, prefixe /api
      return `${protocol}//${host}/api${imagePath}`;
    }
    
    // Fallback para localhost
    return `http://localhost:3001${imagePath}`;
  } catch (error) {
    console.warn('Erro ao construir URL da imagem:', error);
    // Fallback para localhost se houver erro
    return `http://localhost:3001${imagePath}`;
  }
};

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    // Auth
    LOGIN: '/users/login',
    REGISTER: '/users/register',
    
    // Users
    USERS: '/users',
    USER_BY_ID: (id: string | number) => `/users/${id}`,
    
    // Calls
    CALLS: '/calls',
    CALL_BY_ID: (id: string | number) => `/calls/${id}`,
    CALL_STATISTICS: '/calls/statistics',
    CALL_STATUS_HISTORY: (id: string | number) => `/calls/${id}/status-history`,
    CALL_IMAGE: (callId: string | number, imageId: string | number) => `/calls/${callId}/images/${imageId}`,

    CHAMADO_LOCAIS: '/chamado-locais',
    CHAMADO_LOCAL_BY_ID: (id: string | number) => `/chamado-locais/${id}`,
    DEPARTAMENTOS: '/departamentos',
    DEPARTAMENTO_BY_ID: (id: string | number) => `/departamentos/${id}`,
    
    // WhatsApp
    WHATSAPP: '/whatsapp',
  }
};

export default API_CONFIG; 
