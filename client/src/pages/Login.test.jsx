import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockLogin = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test', email: 'test@test.com', family_id: null },
    isAuthenticated: true,
    loading: false,
    token: 'test-token',
    login: mockLogin,
    logout: jest.fn(),
  }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

import api from '../services/api';

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with email, password inputs and submit button', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('example@mail.ru')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Введите пароль')).toBeInTheDocument();
    expect(screen.getByText('Войти')).toBeInTheDocument();
  });

  it('submits form with email and password on click', async () => {
    api.post.mockResolvedValue({ status: 200, data: { token: 'tok', refreshToken: 'rt', refreshTokenExpiresAt: 'exp' } });
    render(<Login />);

    await userEvent.type(screen.getByPlaceholderText('example@mail.ru'), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('Введите пароль'), 'secret123');
    fireEvent.click(screen.getByText('Войти'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'test@example.com', password: 'secret123', rememberMe: true },
        { withCredentials: true }
      );
    });
  });

  it('calls login and navigate on successful login', async () => {
    api.post.mockResolvedValue({ status: 200, data: { token: 'tok', refreshToken: 'rt', refreshTokenExpiresAt: 'exp' } });
    render(<Login />);

    await userEvent.type(screen.getByPlaceholderText('example@mail.ru'), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('Введите пароль'), 'secret123');
    fireEvent.click(screen.getByText('Войти'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('tok', 'rt', 'exp');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message on API failure', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Неверный email или пароль' } } });
    render(<Login />);

    await userEvent.type(screen.getByPlaceholderText('example@mail.ru'), 'bad@mail.ru');
    await userEvent.type(screen.getByPlaceholderText('Введите пароль'), 'wrong');
    fireEvent.click(screen.getByText('Войти'));

    await screen.findByText('Неверный email или пароль');
  });

  it('shows forgot password link', () => {
    render(<Login />);
    expect(screen.getByText('Забыли?')).toBeInTheDocument();
    expect(screen.getByText('Забыли?').closest('a')).toHaveAttribute('href', '/forgot-password');
  });
});
