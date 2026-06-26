import { Link } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import ChamadoLocalTable from '../components/ChamadoLocalTable';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

export default function ChamadoLocais() {
  return (
    <PageLayout
      title="Locais"
      description="Gerencie os locais disponíveis para abertura de chamados via WhatsApp."
      action={
        <Link to="/chamado-locais/new" className="btn-link">
          <PlusOutlined className="mr-1.5" />
          Novo local
        </Link>
      }
    >
      <PageCard noPadding>
        <div className="p-5">
          <ChamadoLocalTable />
        </div>
      </PageCard>
    </PageLayout>
  );
}
