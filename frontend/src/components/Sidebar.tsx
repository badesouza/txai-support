import { Link, useLocation } from 'react-router-dom';
import { UsersIcon, TicketIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">TXAI Support</h1>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          <Link
            to="/calls"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              isActive('/calls')
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <TicketIcon className="mr-3 h-6 w-6" />
            Chamados
          </Link>

          <Link
            to="/users"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              isActive('/users')
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <UsersIcon className="mr-3 h-6 w-6" />
            Usuários
          </Link>

          <Link
            to="/reports"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              isActive('/reports')
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <ChartBarIcon className="mr-3 h-6 w-6" />
            Relatórios
          </Link>
        </nav>
      </div>
    </div>
  );
} 