import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPassword from './ForgotPassword';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import api from '../services/api';

describe('ForgotPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders request form with email input', () => {
    render(<ForgotPassword />);
    expect(screen.getByText('Восстановление пароля')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example@mail.ru')).toBeInTheDocument();
    expect(screen.getByText('Отправить код')).toBeInTheDocument();
  });

  it('sends email on form submit', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(<ForgotPassword />);

    await userEvent.type(screen.getByPlaceholderText('example@mail.ru'), 'user@mail.ru');
    fireEvent.click(screen.getByText('Отправить код'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'user@mail.ru' });
    });
  });

  it('shows success message and switches to verify step after sending code', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(<ForgotPassword />);

    await userEvent.type(screen.getByPlaceholderText('example@mail.ru'), 'user@mail.ru');
    fireEvent.click(screen.getByText('Отправить код'));

    await screen.findByText('Код отправлен на email');
    expect(screen.getByText('Введите код')).toBeInTheDocument();
  });

  it('renders reset code form with code and password inputs', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(<ForgotPassword />);

    await userEvent.type(screen.getByPlaceholderText('example@mail.ru'), 'user@mail.ru');
    fireEvent.click(screen.getByText('Отправить код'));

    await screen.findByPlaceholderText('000000');
    expect(screen.getByPlaceholderText('Минимум 6 символов')).toBeInTheDocument();
    expect(screen.getByText('Изменить пароль')).toBeInTheDocument();
  });

  it('handles error on request step', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Email не найден' } } });
    render(<ForgotPassword />);

    await userEvent.type(screen.getByPlaceholderText('example@mail.ru'), 'bad@mail.ru');
    fireEvent.click(screen.getByText('Отправить код'));

    await screen.findByText('Email не найден');
  });

  it('submits code and new password on verify step', async () => {
    api.post.mockResolvedValueOnce({ data: {} });
    api.post.mockResolvedValueOnce({ data: {} });
    render(<ForgotPassword />);

    await userEvent.type(screen.getByPlaceholderText('example@mail.ru'), 'user@mail.ru');
    fireEvent.click(screen.getByText('Отправить код'));

    await screen.findByPlaceholderText('000000');
    await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
    await userEvent.type(screen.getByPlaceholderText('Минимум 6 символов'), 'newpass123');
    fireEvent.click(screen.getByText('Изменить пароль'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', { code: '123456', newPassword: 'newpass123' });
    });
  });

  it('shows success message after password reset and navigates to login', async () => {
    jest.useFakeTimers();
    api.post.mockResolvedValueOnce({ data: {} });
    api.post.mockResolvedValueOnce({ data: {} });
    render(<ForgotPassword />);

    await userEvent.type(screen.getByPlaceholderText('example@mail.ru'), 'user@mail.ru');
    fireEvent.click(screen.getByText('Отправить код'));

    await screen.findByPlaceholderText('000000');
    await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
    await userEvent.type(screen.getByPlaceholderText('Минимум 6 символов'), 'newpass123');
    fireEvent.click(screen.getByText('Изменить пароль'));

    await screen.findByText('Пароль изменён. Теперь можете войти.');

    jest.advanceTimersByTime(2000);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    jest.useRealTimers();
  });

  it('handles error on verify step', async () => {
    api.post.mockResolvedValueOnce({ data: {} });
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Неверный код' } } });
    render(<ForgotPassword />);

    await userEvent.type(screen.getByPlaceholderText('example@mail.ru'), 'user@mail.ru');
    fireEvent.click(screen.getByText('Отправить код'));

    await screen.findByPlaceholderText('000000');
    await userEvent.type(screen.getByPlaceholderText('000000'), '000000');
    await userEvent.type(screen.getByPlaceholderText('Минимум 6 символов'), 'newpass');
    fireEvent.click(screen.getByText('Изменить пароль'));

    await screen.findByText('Неверный код');
  });
});
