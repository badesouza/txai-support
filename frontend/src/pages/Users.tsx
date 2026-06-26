import { Link } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import UserTable from '../components/UserTable';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

export default function Users() {
  return (
    <PageLayout
      title="Usuários"
      description="Gerencie contas, perfis de acesso e dados de contato."
      action={
        <Link to="/users/new" className="btn-link">
          <PlusOutlined className="mr-1.5" />
          Novo usuário
        </Link>
      }
    >
      <PageCard noPadding>
        <div className="p-5">
          <UserTable />
        </div>
      </PageCard>
    </PageLayout>
  );
}
