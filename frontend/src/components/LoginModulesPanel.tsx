import {
  FileTextOutlined,
  UserOutlined,
  BarChartOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

interface SystemModule {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  iconClass: string;
  glowClass: string;
}

const MODULES: SystemModule[] = [
  {
    id: 'calls',
    icon: FileTextOutlined,
    title: 'Chamados',
    description: 'Registre, priorize e acompanhe solicitações com histórico completo e anexos.',
    iconClass: 'bg-blue-500/15 text-blue-400',
    glowClass: 'group-hover:shadow-blue-500/10',
  },
  {
    id: 'users',
    icon: UserOutlined,
    title: 'Usuários',
    description: 'Controle perfis, permissões e equipes operacionais do hotel em um só lugar.',
    iconClass: 'bg-violet-500/15 text-violet-400',
    glowClass: 'group-hover:shadow-violet-500/10',
  },
  {
    id: 'reports',
    icon: BarChartOutlined,
    title: 'Relatórios',
    description: 'Visualize indicadores de atendimento e volume de chamados por período e status.',
    iconClass: 'bg-emerald-500/15 text-emerald-400',
    glowClass: 'group-hover:shadow-emerald-500/10',
  },
  {
    id: 'whatsapp',
    icon: PhoneOutlined,
    title: 'WhatsApp',
    description: 'Integre conversas e notificações automáticas ao fluxo de suporte hoteleiro.',
    iconClass: 'bg-green-500/15 text-green-400',
    glowClass: 'group-hover:shadow-green-500/10',
  },
];

const HIGHLIGHTS = [
  'Rastreabilidade de atendimentos',
  'Governança operacional',
  'Suporte multicanal',
] as const;

/** Static module overview panel for the login screen. */
export function LoginModulesPanel() {
  return (
    <div className="relative flex h-full min-h-[420px] w-full flex-col justify-center overflow-hidden bg-[#070707] px-6 py-12 sm:px-10 lg:min-h-screen lg:px-14 lg:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.18),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.08),_transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-xl">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300">
            <SafetyCertificateOutlined className="text-primary-400" />
            Hotelaria de luxo · Helpdesk
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Módulos da plataforma
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-400">
            Centralize a operação de suporte e governança do seu empreendimento beira-mar com
            ferramentas integradas e rastreáveis.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <article
                key={module.id}
                className={`group rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm transition-all duration-300 hover:border-white/15 hover:bg-white/[0.05] hover:shadow-lg ${module.glowClass}`}
              >
                <div className={`mb-3 inline-flex rounded-lg p-2.5 ${module.iconClass}`}>
                  <Icon className="text-lg" />
                </div>
                <h3 className="text-sm font-semibold text-white">{module.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{module.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-t border-white/[0.06] pt-6">
          {HIGHLIGHTS.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-wide text-gray-400"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
