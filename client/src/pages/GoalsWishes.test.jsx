import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoalsWishes from './GoalsWishes';

jest.mock('../components/GoalsSection', () => ({ goals, showArchived }) => (
  <div data-testid="goals-section">
    <span data-testid="goals-count">{goals.filter(g => !g.archived && !g.achieved).length}</span>
  </div>
));
jest.mock('../components/WishesSection', () => ({ wishes, showArchived }) => (
  <div data-testid="wishes-section">
    <span data-testid="wishes-count">{wishes.filter(w => !w.archived && w.status !== 'completed').length}</span>
  </div>
));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import api from '../services/api';

describe('GoalsWishes', () => {
  const mockGoals = [
    { id: 1, name: 'Машина', target_amount: 2000000, saved_amount: 500000, archived: false, achieved: false },
    { id: 2, name: 'Ремонт', target_amount: 500000, saved_amount: 500000, archived: false, achieved: true },
  ];
  const mockWishes = [
    { id: 1, name: 'iPhone', cost: 100000, saved_amount: 30000, archived: false, status: 'active' },
    { id: 2, name: 'Книга', cost: 2000, saved_amount: 2000, archived: true, status: 'completed' },
  ];
  const mockCategories = [
    { id: 1, name: 'Крупные покупки', type: 'expense' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/goals') return Promise.resolve({ data: mockGoals });
      if (url === '/wishes') return Promise.resolve({ data: mockWishes });
      if (url === '/categories') return Promise.resolve({ data: mockCategories });
      if (url === '/accounts') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
  });

  it('shows loading spinner initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<GoalsWishes />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders page title after data loads', async () => {
    render(<GoalsWishes />);
    expect(await screen.findByText('Цели и Желания')).toBeInTheDocument();
  });

  it('renders goals tab content by default', async () => {
    render(<GoalsWishes />);
    await screen.findByText('Цели и Желания');
    expect(screen.getByTestId('goals-section')).toBeInTheDocument();
  });

  it('displays correct active goal count in tab', async () => {
    render(<GoalsWishes />);
    await screen.findByText('Цели и Желания');
    expect(screen.getByText('Цели (1)')).toBeInTheDocument();
  });

  it('switches to wishes tab on click', async () => {
    render(<GoalsWishes />);
    await screen.findByText('Цели и Желания');
    const tabButtons = screen.getAllByRole('button');
    const wishesTab = tabButtons.find(b => b.textContent.startsWith('Желания'));
    fireEvent.click(wishesTab);
    expect(screen.getByTestId('wishes-section')).toBeInTheDocument();
    expect(screen.queryByTestId('goals-section')).not.toBeInTheDocument();
  });

  it('shows archive button when archived items exist', async () => {
    render(<GoalsWishes />);
    await screen.findByText('Цели и Желания');
    expect(screen.getByText('Архив')).toBeInTheDocument();
  });

  it('toggles archive visibility on archive button click', async () => {
    render(<GoalsWishes />);
    await screen.findByText('Цели и Желания');
    fireEvent.click(screen.getByText('Архив'));
    await waitFor(() => {
      expect(screen.getByText('Скрыть архив')).toBeInTheDocument();
    });
  });

  it('does not show archive button when no archived items', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/goals') return Promise.resolve({ data: [] });
      if (url === '/wishes') return Promise.resolve({ data: [] });
      if (url === '/categories') return Promise.resolve({ data: mockCategories });
      if (url === '/accounts') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    render(<GoalsWishes />);
    await screen.findByText('Цели и Желания');
    expect(screen.queryByText('Архив')).not.toBeInTheDocument();
    expect(screen.queryByText('Скрыть архив')).not.toBeInTheDocument();
  });

  it('fetches goals, wishes, categories and accounts on mount', async () => {
    render(<GoalsWishes />);
    await screen.findByText('Цели и Желания');
    expect(api.get).toHaveBeenCalledWith('/goals', expect.any(Object));
    expect(api.get).toHaveBeenCalledWith('/wishes', expect.any(Object));
    expect(api.get).toHaveBeenCalledWith('/categories');
    expect(api.get).toHaveBeenCalledWith('/accounts');
  });
});
