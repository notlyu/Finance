import { render, screen } from '@testing-library/react';
import Layout from './Layout';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test', email: 'test@test.com' },
    isAuthenticated: true,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    token: 'test-token',
  }),
}));

const api = require('../services/api').default;

describe('Layout', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: { id: 1, name: 'Test User', email: 'test@test.com' } });
  });

  it('renders sidebar with navigation links for personal space', async () => {
    render(<Layout space="personal" />);
    await screen.findByText('Выйти');

    expect(screen.getAllByText('Главная').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Операции').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Цели').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Подушка').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Аналитика').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Бюджеты').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Кредиты').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Регулярные').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Импорт').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Экспорт').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Настройки').length).toBeGreaterThanOrEqual(1);
  });

  it('renders sidebar with navigation links for family space', async () => {
    render(<Layout space="family" />);
    await screen.findByText('Выйти');

    expect(screen.getAllByText('Главная').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Семья').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Импорт')).not.toBeInTheDocument();
  });

  it('renders Outlet for main content', async () => {
    render(<Layout space="personal" />);
    expect(await screen.findByTestId('outlet')).toBeInTheDocument();
  });

  it('renders logo and brand name', async () => {
    render(<Layout space="personal" />);
    expect(await screen.findByText('Финансы')).toBeInTheDocument();
    expect(screen.getByText('Premium Capital')).toBeInTheDocument();
  });

  it('renders logout button', async () => {
    render(<Layout space="personal" />);
    expect(await screen.findByText('Выйти')).toBeInTheDocument();
  });
});
