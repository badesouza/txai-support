import React from 'react';
import WhatsAppConnection from '../components/WhatsAppConnection';

const WhatsApp: React.FC = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Conexão WhatsApp</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Gerencie a conexão do WhatsApp para envio de mensagens automáticas
          </p>
        </div>
      </div>

      <div className="mt-8">
        <WhatsAppConnection />
      </div>
    </div>
  );
};

export default WhatsApp; 