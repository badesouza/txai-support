// Este arquivo pode ser removido se não houver mais uso de API_CONFIG.BASE_URL.
// Caso precise manter, exporte a variável de ambiente:

export const BASE_URL = process.env.REACT_APP_API_URL;

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Função para construir URLs de imagens que funciona em dev e produção
export const getImageUrl = (imagePath: string): string => {
  // Se estamos em produção (sem localhost na URL da API)
  if (API_BASE_URL && !API_BASE_URL.includes('localhost')) {
    // Extrair o domínio da URL da API
    const apiUrl = new URL(API_BASE_URL);
    return `${apiUrl.protocol}//${apiUrl.host}${imagePath}`;
  }
  
  // Em desenvolvimento, usar localhost
  return `http://localhost:3001${imagePath}`;
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
    
    // WhatsApp
    WHATSAPP: '/whatsapp',
  }
};

export default API_CONFIG; 