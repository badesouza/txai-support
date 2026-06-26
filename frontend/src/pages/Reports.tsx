import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { SearchOutlined } from '@ant-design/icons';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import PageLayout from '../components/layout/PageLayout';
import PageCard from '../components/layout/PageCard';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type ChartDataState = ChartData<'bar', number[], string>;

const statusOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'OPEN', label: 'Aberto' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'CLOSED', label: 'Fechado' },
];

const Reports = () => {
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [status, setStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartDataState>({
    labels: [],
    datasets: [{ label: 'Chamados', data: [], backgroundColor: 'rgba(37, 99, 235, 0.5)' }],
  });

  const handleSearch = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (dateStart) params.append('dateStart', dateStart);
      if (dateEnd) params.append('dateEnd', dateEnd);
      if (status) params.append('status', status);

      const response = await api.get(`${API_CONFIG.ENDPOINTS.CALL_STATISTICS}?${params.toString()}`);

      const formattedLabels = response.data.labels.map((label: string) => {
        switch (label) {
          case 'OPEN':
            return 'Aberto';
          case 'IN_PROGRESS':
            return 'Em andamento';
          case 'CLOSED':
            return 'Fechado';
          default:
            return label;
        }
      });

      setChartData({
        labels: formattedLabels,
        datasets: [
          {
            label: 'Chamados',
            data: response.data.datasets[0].data,
            backgroundColor: ['#f87171', '#60a5fa', '#34d399'],
            borderColor: ['#ef4444', '#3b82f6', '#10b981'],
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: '#9ca3af' },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { display: false },
      },
    },
  };

  return (
    <PageLayout
      title="Relatórios"
      description="Filtre por período e status para analisar o volume de chamados."
    >
      <PageCard className="mb-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="dateStart" className="form-label">
              Data inicial
            </label>
            <input
              id="dateStart"
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="dateEnd" className="form-label">
              Data final
            </label>
            <input
              id="dateEnd"
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-select"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="btn-primary w-full"
            >
              <SearchOutlined className="mr-1.5" />
              {isLoading ? 'Carregando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </PageCard>

      <PageCard>
        <h2 className="mb-4 text-sm font-semibold text-white">Chamados por status</h2>
        <div className="h-[360px]">
          {(chartData.labels ?? []).length > 0 ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-sm text-gray-500">
              Selecione os filtros e clique em Buscar para visualizar o gráfico
            </div>
          )}
        </div>
      </PageCard>
    </PageLayout>
  );
};

export default Reports;
