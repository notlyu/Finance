import { render, screen } from '@testing-library/react';
import Layout from './Layout';

const mockUser = { id: 1, name: 'Test', email: 'test@test.com' };

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  Outlet: () => <div data-testid="outlet" />,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/personal/dashboard' }),
}));

describe('Layout', () => {
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
