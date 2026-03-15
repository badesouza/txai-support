import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import Login from '../../pages/Login';
import api from '../../config/axios';

// Mock antd message
jest.mock('sweetalert2', () => ({ fire: jest.fn() }));

// Mock axios
jest.mock('../../config/axios', () => ({
  post: jest.fn(),
}));

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockStorageSetItem = jest.spyOn(Storage.prototype, 'setItem');

const mockApi = api as jest.Mocked<typeof api>;

// Mock useNavigate
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
    mockStorageSetItem.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockStorageSetItem.mockRestore();
  });

  it('should render login form', () => {
    render(<LoginWithRouter />);

    expect(screen.getByText('Acesse sua conta')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acessar' })).toBeInTheDocument();
  });

  it('should login successfully with valid credentials', async () => {
    const mockResponse = {
      data: {
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          profile: 'ADMIN'
        },
        token: 'mock-jwt-token'
      }
    };

    mockApi.post.mockResolvedValue(mockResponse);

    render(<LoginWithRouter />);

    const emailInput = screen.getByLabelText('E-mail');
    const passwordInput = screen.getByLabelText('Senha');
    const submitButton = screen.getByRole('button', { name: 'Acessar' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/users/login', {
        email: 'test@example.com',
        password: 'password123'
      });
    });
    await waitFor(() => {
      expect(mockStorageSetItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
      expect(mockStorageSetItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockResponse.data.user)
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });

  it('should handle login error', async () => {
    mockApi.post.mockRejectedValue({
      response: {
        data: { message: 'Credenciais inválidas' }
      }
    });

    render(<LoginWithRouter />);

    const emailInput = screen.getByLabelText('E-mail');
    const passwordInput = screen.getByLabelText('Senha');
    const submitButton = screen.getByRole('button', { name: 'Acessar' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith({
        title: 'Erro!',
        text: 'Erro ao fazer login. Verifique suas credenciais.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
  });

  it('should handle network error', async () => {
    mockApi.post.mockRejectedValue(new Error('Network Error'));

    render(<LoginWithRouter />);

    const emailInput = screen.getByLabelText('E-mail');
    const passwordInput = screen.getByLabelText('Senha');
    const submitButton = screen.getByRole('button', { name: 'Acessar' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith('Erro no login:', expect.any(Error));
    });
  });
});
