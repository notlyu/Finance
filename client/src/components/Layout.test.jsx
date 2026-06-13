import { render, screen, fireEvent } from '@testing-library/react';
import Layout from './Layout';

const mockUser = { id: 1, name: 'Test', email: 'test@test.com' };
const mockNavigate = jest.fn();

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
  useNavigate: () => mockNavigate,
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

  // T3.1 / T3.3 — индикатор пространства и хоткей (только для участника семьи)
  describe('family member: space badge + Alt+S hotkey', () => {
    beforeEach(() => { mockUser.family_id = 7; mockNavigate.mockClear(); });
    afterEach(() => { delete mockUser.family_id; });

    it('shows the active-space badge in the sidebar (personal)', async () => {
      render(<Layout space="personal" />);
      expect(await screen.findByText('Личное пространство')).toBeInTheDocument();
    });

    it('shows the active-space badge in the sidebar (family)', async () => {
      render(<Layout space="family" />);
      expect(await screen.findByText('Семейное пространство')).toBeInTheDocument();
    });

    it('Alt+S switches to the other space', async () => {
      render(<Layout space="personal" />);
      await screen.findByText('Выйти');
      fireEvent.keyDown(window, { code: 'KeyS', key: 's', altKey: true });
      expect(mockNavigate).toHaveBeenCalledWith('/family/dashboard');
    });

    it('does not register the hotkey for a solo user', async () => {
      delete mockUser.family_id;
      render(<Layout space="personal" />);
      await screen.findByText('Выйти');
      fireEvent.keyDown(window, { code: 'KeyS', key: 's', altKey: true });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
