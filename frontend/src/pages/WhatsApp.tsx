import React, { useState } from 'react';
import WhatsAppConnection from '../components/WhatsAppConnection';
import WhatsAppSessionSelector from '../components/WhatsAppSessionSelector';

const WhatsApp: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<string>('');

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

      {/* Session Selector */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <WhatsAppSessionSelector 
          onSessionChange={setSelectedSession}
          selectedSession={selectedSession}
        />
      </div>

      {/* Connection Status for selected session */}
      <div className="mt-4">
        {selectedSession && <WhatsAppConnection key={selectedSession} session={selectedSession} />}
      </div>
    </div>
  );
};

export default WhatsApp; 