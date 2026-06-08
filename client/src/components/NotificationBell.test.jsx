import { render, screen, fireEvent, act } from '@testing-library/react';
import NotificationBell from './NotificationBell';
import api from '../services/api';

const mockNotifications = {
  data: {
    notifications: [
      { id: 1, type: 'info', title: 'Test', message: 'Test message', read: false, created_at: new Date().toISOString() },
    ],
  },
};

const mockUnreadCount = { data: { count: 1 } };

describe('NotificationBell', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('renders bell icon', () => {
    render(<NotificationBell />);
    const icons = document.querySelectorAll('.material-symbols-outlined');
    expect(icons.length).toBeGreaterThan(0);
    const bellIcons = Array.from(icons).filter(el => el.textContent === 'notifications');
    expect(bellIcons.length).toBeGreaterThan(0);
  });

  it('shows unread count badge', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications/unread-count') return Promise.resolve(mockUnreadCount);
      return Promise.resolve(mockNotifications);
    });

    render(<NotificationBell />);

    const badge = await screen.findByText('1');
    expect(badge).toBeInTheDocument();
  });

  it('does not show badge when count is 0', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications/unread-count') return Promise.resolve({ data: { count: 0 } });
      return Promise.resolve({ data: { notifications: [] } });
    });

    render(<NotificationBell />);

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    const badge = document.querySelector('.bg-red-500');
    expect(badge).not.toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications/unread-count') return Promise.resolve({ data: { count: 0 } });
      return Promise.resolve({ data: { notifications: [] } });
    });

    render(<NotificationBell />);

    const button = screen.getByTitle('Уведомления');
    fireEvent.click(button);

    const emptyText = await screen.findByText('Нет уведомлений');
    expect(emptyText).toBeInTheDocument();
  });
});
