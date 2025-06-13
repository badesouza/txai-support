import React, { useEffect } from 'react';
import { message } from 'antd';
import WhatsAppConnection from '../components/WhatsAppConnection';
import api from '../config/axios';

const WhatsApp: React.FC = () => {
  useEffect(() => {
    const initializeWhatsApp = async () => {
      try {
        await api.post('/whatsapp/initialize');
        message.success('Inicialização do WhatsApp iniciada');
      } catch (error) {
        message.error('Erro ao inicializar o WhatsApp');
      }
    };

    initializeWhatsApp();
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Conexão WhatsApp</h1>
        </div>
      </div>

      <div className="mt-8">
        <WhatsAppConnection />
      </div>
    </div>
  );
};

export default WhatsApp; 