import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import api from '../config/axios';
import { API_CONFIG } from '../config/api';
import { LoginModulesPanel } from '../components/LoginModulesPanel';

/** Login page with form panel and system modules overview. */
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post(API_CONFIG.ENDPOINTS.LOGIN, { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/home');
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] lg:flex-row">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:max-w-[480px] xl:max-w-[540px] lg:px-14 lg:py-16">
        <div className="mb-10 flex items-center gap-3">
          <div className="rounded-lg bg-primary-600 p-2.5">
            <LoginOutlined className="text-xl text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">TXAI Suporte</span>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-white">Bem-vindo</h1>
        <p className="mb-8 text-gray-400">
          Plataforma de suporte e governança para hotelaria de luxo
        </p>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-gray-700 bg-gray-900/80 px-4 py-3 text-white placeholder-gray-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-700 bg-gray-900/80 px-4 py-3 pr-12 text-white placeholder-gray-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-300 focus:outline-none"
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <EyeInvisibleOutlined className="text-lg" />
                ) : (
                  <EyeOutlined className="text-lg" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 py-3 font-semibold text-white shadow-lg shadow-primary-600/20 transition-all duration-200 hover:bg-primary-700 hover:shadow-primary-600/40 disabled:cursor-not-allowed disabled:bg-primary-600/50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Precisa de ajuda?{' '}
            <a
              href="https://wa.me/5573981112636"
              className="font-medium text-primary-400 hover:text-primary-300"
              target="_blank"
              rel="noreferrer"
            >
              (73) 98111-2636
            </a>
          </p>
        </form>
      </div>

      <div className="flex-1 border-t border-white/[0.06] lg:border-l lg:border-t-0">
        <LoginModulesPanel />
      </div>
    </div>
  );
};

export default Login;
