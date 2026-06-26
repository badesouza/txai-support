import { Link } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import CallTable from '../components/CallTable';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

export default function Calls() {
  return (
    <PageLayout
      title="Chamados"
      description="Acompanhe solicitações, status, prioridade e histórico de atendimento."
      action={
        <Link to="/calls/new" className="btn-link">
          <PlusOutlined className="mr-1.5" />
          Novo chamado
        </Link>
      }
    >
      <PageCard noPadding>
        <div className="p-5">
          <CallTable />
        </div>
      </PageCard>
    </PageLayout>
  );
}
