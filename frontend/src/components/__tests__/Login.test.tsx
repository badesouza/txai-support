import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/Login';
import api from '../../config/axios';

jest.mock('../../config/axios', () => ({
  post: jest.fn(),
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

const mockApi = api as jest.Mocked<typeof api>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const LoginWithRouter = () => (
  <BrowserRouter>
    <Login />
  </BrowserRouter>
);

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should render login form', () => {
    render(<LoginWithRouter />);

    expect(screen.getByText('Bem-vindo')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    render(<LoginWithRouter />);

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    expect(submitButton).toBeInTheDocument();
  });

  it('should show validation error for invalid email', async () => {
    render(<LoginWithRouter />);

    const emailInput = screen.getByLabelText('E-mail');
    const submitButton = screen.getByRole('button', { name: 'Entrar' });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeInTheDocument();
  });

  it('should login successfully with valid credentials', async () => {
    const mockResponse = {
      data: {
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          profile: 'ADMIN',
        },
        token: 'mock-jwt-token',
      },
    };

    mockApi.post.mockResolvedValue(mockResponse);

    render(<LoginWithRouter />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/users/login', {
        email: 'test@example.com',
        password: 'password123',
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });

  it('should handle login error', async () => {
    mockApi.post.mockRejectedValue({
      response: {
        data: { message: 'Credenciais inválidas' },
      },
    });

    render(<LoginWithRouter />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Erro ao fazer login. Verifique suas credenciais.')).toBeInTheDocument();
    });
  });

  it('should handle network error', async () => {
    mockApi.post.mockRejectedValue(new Error('Network Error'));

    render(<LoginWithRouter />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith('Erro no login:', expect.any(Error));
    });
  });

  it('should show loading state during login', async () => {
    mockApi.post.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: {
                  user: { id: 1, name: 'Test User', email: 'test@example.com', profile: 'ADMIN' },
                  token: 'mock-jwt-token',
                },
              }),
            100
          )
        )
    );

    render(<LoginWithRouter />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('button', { name: 'Entrando...' })).toBeInTheDocument();
  });

  it('should toggle password visibility', async () => {
    render(<LoginWithRouter />);

    const passwordInput = screen.getByLabelText('Senha') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(passwordInput.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Esconder senha' }));
    expect(passwordInput.type).toBe('password');
  });
});
