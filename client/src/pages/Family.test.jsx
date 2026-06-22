import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Family from './Family';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import api from '../services/api';

describe('Family', () => {
  const ownerUser = {
    id: 1, name: 'Владелец', email: 'owner@test.com', family_id: 1,
    family: { id: 1, name: 'Моя семья', owner_user_id: 1, invite_code: 'ABC123', members: [
      { id: 1, name: 'Владелец', email: 'owner@test.com' },
      { id: 2, name: 'Участник', email: 'member@test.com' },
    ]},
  };

  const nonOwnerUser = {
    ...ownerUser,
    id: 2, name: 'Участник',
    family: { ...ownerUser.family, owner_user_id: 1 },
  };

  const noFamilyUser = {
    id: 1, name: 'Test', email: 'test@test.com', family_id: null, family: null,
  };

  const mockInvites = [
    { id: 1, code: 'INV123', expires_at: '2025-12-31T23:59:59Z' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.resolve({ data: ownerUser });
      if (url === '/dashboard') return Promise.resolve({ data: { family: { memberStats: [{ userId: 1, name: 'Владелец', income: 100000, expenses: 50000, contributions: 0 }] } } });
      if (url === '/auth/family/invites') return Promise.resolve({ data: mockInvites });
      return Promise.resolve({ data: {} });
    });
  });

  it('shows loading spinner initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<Family />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows create/join family state when user has no family', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.resolve({ data: noFamilyUser });
      if (url === '/auth/family/invites') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    render(<Family />);
    await screen.findByText('Вы пока не состоите в семье');
    expect(screen.getByText('Создать семью')).toBeInTheDocument();
    expect(screen.getByText('Присоединиться')).toBeInTheDocument();
  });

  it('renders family info when user has a family', async () => {
    render(<Family />);
    await screen.findByText('Моя семья');
    expect(screen.getByText('Код приглашения')).toBeInTheDocument();
  });

  it('renders members list', async () => {
    render(<Family />);
    await screen.findByText('Моя семья');
    const memberEls = screen.getAllByText('Владелец');
    expect(memberEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('member@test.com')).toBeInTheDocument();
    expect(screen.getByText('owner@test.com')).toBeInTheDocument();
  });

  it('shows owner badge for the owner', async () => {
    render(<Family />);
    await screen.findByText('Моя семья');
    const ownerBadges = screen.getAllByText('Владелец');
    const badge = ownerBadges.find(el => el.className.includes('px-3'));
    expect(badge).toBeInTheDocument();
  });

  it('renders invitations section for owner', async () => {
    render(<Family />);
    await screen.findByText('Моя семья');
    expect(screen.getByText('Приглашения')).toBeInTheDocument();
    expect(screen.getByText('Создать (7 дней)')).toBeInTheDocument();
  });

  it('shows transfer ownership button for owner with multiple members', async () => {
    render(<Family />);
    await screen.findByText('Моя семья');
    expect(screen.getByText('Передать владение')).toBeInTheDocument();
  });

  it('opens transfer ownership modal with member selection', async () => {
    render(<Family />);
    await screen.findByText('Моя семья');
    fireEvent.click(screen.getByText('Передать владение'));
    expect(screen.getByText('Выберите участника, которому хотите передать права владельца:')).toBeInTheDocument();
    const memberEmails = screen.getAllByText('member@test.com');
    expect(memberEmails.length).toBeGreaterThanOrEqual(1);
  });

  it('shows finance tab with member stats', async () => {
    render(<Family />);
    await screen.findByText('Моя семья');
    fireEvent.click(screen.getByText('Финансы'));
    expect(screen.getByText('Финансовый обзор за месяц')).toBeInTheDocument();
  });

  it('shows leave family button for non-owner', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.resolve({ data: nonOwnerUser });
      if (url === '/auth/family/invites') return Promise.resolve({ data: [] });
      if (url === '/dashboard') return Promise.resolve({ data: { family: { memberStats: [] } } });
      return Promise.resolve({ data: {} });
    });
    render(<Family />);
    await screen.findByText('Моя семья');
    expect(screen.getByText('Покинуть семью')).toBeInTheDocument();
  });

  it('creates invitation when create invite button is clicked', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(<Family />);
    await screen.findByText('Моя семья');
    fireEvent.click(screen.getByText('Создать (7 дней)'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/family/invites', { expiresInDays: 7 });
    });
  });

  it('copies invite code on copy button click', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue() },
    });
    render(<Family />);
    await screen.findByText('Моя семья');
    const copyBtns = screen.getAllByText('Копировать');
    fireEvent.click(copyBtns[0]);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('INV123');
    });
  });
});
