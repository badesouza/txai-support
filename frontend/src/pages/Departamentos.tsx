import { Link } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import DepartamentoTable from '../components/DepartamentoTable';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

export default function Departamentos() {
  return (
    <PageLayout
      title="Departamentos"
      description="Gerencie os departamentos que podem ser vinculados aos chamados."
      action={
        <Link to="/departamentos/new" className="btn-link">
          <PlusOutlined className="mr-1.5" />
          Novo departamento
        </Link>
      }
    >
      <PageCard noPadding>
        <div className="p-5">
          <DepartamentoTable />
        </div>
      </PageCard>
    </PageLayout>
  );
}
