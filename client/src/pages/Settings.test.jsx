import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from './Settings';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import api from '../services/api';

describe('Settings', () => {
  const mockUser = {
    id: 1, name: 'Test User', email: 'test@test.com', family_id: 1,
  };

  const mockCategories = [
    { id: 1, name: 'Продукты', type: 'expense', is_system: true },
    { id: 2, name: 'Хобби', type: 'expense', is_system: false },
  ];

  const mockNotifSettings = {
    remind_upcoming: true, notify_goal_reached: true,
    notify_budget_exceeded: false, notify_wish_completed: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.resolve({ data: mockUser });
      if (url === '/categories') return Promise.resolve({ data: mockCategories });
      if (url === '/notifications/settings') return Promise.resolve({ data: mockNotifSettings });
      if (url === '/family-settings') return Promise.resolve({ data: { show_personal_in_stats: false, safety_pillow_months: 3 } });
      return Promise.resolve({ data: {} });
    });
  });

  it('renders page title after data loads', async () => {
    render(<Settings />);
    expect(await screen.findByText('Настройки')).toBeInTheDocument();
  });

  it('renders profile tab by default', async () => {
    render(<Settings />);
    await screen.findByText('Настройки');
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@test.com')).toBeInTheDocument();
  });

  it('displays password change form in profile tab', async () => {
    render(<Settings />);
    await screen.findByText('Настройки');
    expect(screen.getByText('Смена пароля')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Введите старый пароль')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Минимум 8 символов, цифра и буква')).toBeInTheDocument();
  });

  it('changes password on form submit', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(<Settings />);
    await screen.findByText('Настройки');
    const oldPw = screen.getByPlaceholderText('Введите старый пароль');
    const newPw = screen.getByPlaceholderText('Минимум 8 символов, цифра и буква');
    fireEvent.change(oldPw, { target: { value: 'oldpass1' } });
    fireEvent.change(newPw, { target: { value: 'newpass1' } });
    fireEvent.click(screen.getByText('Изменить пароль'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/change-password', { oldPassword: 'oldpass1', newPassword: 'newpass1' });
    });
  });

  it('switches to notifications tab', async () => {
    render(<Settings />);
    await screen.findByText('Настройки');
    fireEvent.click(screen.getByText('Уведомления'));
    expect(screen.getByText('Настройки уведомлений')).toBeInTheDocument();
  });

  it('saves notification settings', async () => {
    api.patch.mockResolvedValue({ data: {} });
    render(<Settings />);
    await screen.findByText('Настройки');
    fireEvent.click(screen.getByText('Уведомления'));
    fireEvent.click(screen.getByText('Сохранить'));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/notifications/settings', expect.any(Object));
    });
  });

  it('switches to theme tab and shows theme options', async () => {
    render(<Settings />);
    await screen.findByText('Настройки');
    fireEvent.click(screen.getByText('Оформление'));
    expect(screen.getByText('Тема оформления')).toBeInTheDocument();
    expect(screen.getByText('Светлая тема')).toBeInTheDocument();
    expect(screen.getByText('Тёмная тема')).toBeInTheDocument();
  });

  it('toggles theme on click', async () => {
    const orig = document.documentElement.classList.toggle;
    document.documentElement.classList.toggle = jest.fn();
    render(<Settings />);
    await screen.findByText('Настройки');
    fireEvent.click(screen.getByText('Оформление'));
    fireEvent.click(screen.getByText('Тёмная тема'));
    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark');
    document.documentElement.classList.toggle = orig;
  });

  it('switches to categories tab and shows category management', async () => {
    render(<Settings />);
    await screen.findByText('Настройки');
    fireEvent.click(screen.getByText('Категории'));
    expect(screen.getByText('Новая категория')).toBeInTheDocument();
    expect(screen.getByText('Системные категории')).toBeInTheDocument();
    expect(screen.getByText('Пользовательские категории')).toBeInTheDocument();
  });

  it('creates a new category on save', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(<Settings />);
    await screen.findByText('Настройки');
    fireEvent.click(screen.getByText('Категории'));
    const nameInput = screen.getByPlaceholderText('Например: Хобби');
    fireEvent.change(nameInput, { target: { value: 'НоваяКат' } });
    fireEvent.click(screen.getByText('Создать категорию'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/categories', { name: 'НоваяКат', type: 'expense' });
    });
  });

  it('does not show family settings tab (personal-only, familyEnabled off)', async () => {
    render(<Settings />);
    await screen.findByText('Настройки');
    expect(screen.queryByText('Семья')).not.toBeInTheDocument();
  });
});
