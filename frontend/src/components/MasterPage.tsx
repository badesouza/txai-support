import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  BarChartOutlined,
  LogoutOutlined,
  PhoneOutlined,
  MenuOutlined,
  CloseOutlined,
  CustomerServiceOutlined,
  EnvironmentOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import Swal from 'sweetalert2';

interface MasterPageProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  matchPrefix?: boolean;
}

const navigation: NavItem[] = [
  { path: '/home', icon: HomeOutlined, label: 'Início' },
  { path: '/calls', icon: FileTextOutlined, label: 'Chamados', matchPrefix: true },
  { path: '/chamado-locais', icon: EnvironmentOutlined, label: 'Locais', matchPrefix: true },
  { path: '/departamentos', icon: TeamOutlined, label: 'Departamentos', matchPrefix: true },
  { path: '/users', icon: UserOutlined, label: 'Usuários', matchPrefix: true },
  { path: '/reports', icon: BarChartOutlined, label: 'Relatórios' },
  { path: '/whatsapp', icon: PhoneOutlined, label: 'WhatsApp' },
];

/** Main authenticated shell with sidebar and content area. */
const MasterPage = ({ children }: MasterPageProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const userName = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return 'Usuário';
      const user = JSON.parse(raw) as { name?: string; email?: string };
      return user.name || user.email || 'Usuário';
    } catch {
      return 'Usuário';
    }
  }, []);

  const isNavActive = (item: NavItem) =>
    item.matchPrefix
      ? location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
      : location.pathname === item.path;

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Encerrar sessão?',
      text: 'Você será desconectado do sistema.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sair',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <div className="flex h-screen bg-[#070707]">
      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0a0a0a] transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
              <CustomerServiceOutlined className="text-base text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">TXAI Suporte</p>
              <p className="text-xs text-gray-500">Helpdesk</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <CloseOutlined />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="text-base" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-lg bg-white/5 px-3 py-2">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="text-xs text-gray-500">Sessão ativa</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogoutOutlined className="text-base" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <main className="relative flex-1 overflow-y-auto p-4 sm:p-6">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="mb-4 rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Abrir menu"
          >
            <MenuOutlined />
          </button>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.08),_transparent_50%)]" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MasterPage;
