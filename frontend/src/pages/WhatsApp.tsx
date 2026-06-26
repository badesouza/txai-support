import React, { useState } from 'react';
import WhatsAppConnection from '../components/WhatsAppConnection';
import WhatsAppSessionSelector from '../components/WhatsAppSessionSelector';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

const WhatsApp: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<string>('');

  return (
    <PageLayout
      title="WhatsApp"
      description="Gerencie sessões e a conexão para envio de mensagens automáticas."
    >
      <PageCard className="mb-4">
        <WhatsAppSessionSelector
          onSessionChange={setSelectedSession}
          selectedSession={selectedSession}
        />
      </PageCard>

      {selectedSession ? (
        <PageCard>
          <WhatsAppConnection key={selectedSession} session={selectedSession} />
        </PageCard>
      ) : (
        <PageCard>
          <p className="text-sm text-gray-500">
            Selecione ou crie uma sessão acima para configurar a conexão.
          </p>
        </PageCard>
      )}
    </PageLayout>
  );
};

export default WhatsApp;
