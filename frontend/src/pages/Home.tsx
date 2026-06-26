import { Link } from 'react-router-dom';
import {
  FileTextOutlined,
  UserOutlined,
  BarChartOutlined,
  PhoneOutlined,
  ArrowRightOutlined,
  EnvironmentOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

const quickLinks = [
  {
    title: 'Chamados',
    description: 'Gerencie solicitações e acompanhe o status dos atendimentos.',
    href: '/calls',
    icon: FileTextOutlined,
    color: 'bg-blue-500/15 text-blue-400',
    hover: 'group-hover:border-blue-500/20 group-hover:shadow-blue-500/10',
  },
  {
    title: 'Locais',
    description: 'Cadastre áreas e pontos de atendimento do empreendimento.',
    href: '/chamado-locais',
    icon: EnvironmentOutlined,
    color: 'bg-amber-500/15 text-amber-400',
    hover: 'group-hover:border-amber-500/20 group-hover:shadow-amber-500/10',
  },
  {
    title: 'Departamentos',
    description: 'Organize equipes e setores responsáveis pelos chamados.',
    href: '/departamentos',
    icon: TeamOutlined,
    color: 'bg-orange-500/15 text-orange-400',
    hover: 'group-hover:border-orange-500/20 group-hover:shadow-orange-500/10',
  },
  {
    title: 'Usuários',
    description: 'Cadastre e administre os usuários do sistema.',
    href: '/users',
    icon: UserOutlined,
    color: 'bg-violet-500/15 text-violet-400',
    hover: 'group-hover:border-violet-500/20 group-hover:shadow-violet-500/10',
  },
  {
    title: 'Relatórios',
    description: 'Visualize métricas e gráficos de desempenho.',
    href: '/reports',
    icon: BarChartOutlined,
    color: 'bg-emerald-500/15 text-emerald-400',
    hover: 'group-hover:border-emerald-500/20 group-hover:shadow-emerald-500/10',
  },
  {
    title: 'WhatsApp',
    description: 'Configure a conexão para mensagens automáticas.',
    href: '/whatsapp',
    icon: PhoneOutlined,
    color: 'bg-green-500/15 text-green-400',
    hover: 'group-hover:border-green-500/20 group-hover:shadow-green-500/10',
  },
];

/** Dashboard landing with quick access cards. */
const Home = () => {
  return (
    <PageLayout
      title="Painel inicial"
      description="Central de operações do TXAI Suporte. Acesse rapidamente as principais áreas."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} to={item.href} className="group block">
              <PageCard className={`h-full transition-all hover:border-white/15 hover:bg-white/[0.05] hover:shadow-lg ${item.hover}`}>
                <div className={`mb-4 inline-flex rounded-lg p-2.5 ${item.color}`}>
                  <Icon className="text-lg" />
                </div>
                <h2 className="text-base font-semibold text-white group-hover:text-primary-400">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-400">
                  Acessar
                  <ArrowRightOutlined className="text-xs transition-transform group-hover:translate-x-0.5" />
                </span>
              </PageCard>
            </Link>
          );
        })}
      </div>
    </PageLayout>
  );
};

export default Home;
