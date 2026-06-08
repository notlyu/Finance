import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WishesSection from './WishesSection';
import api from '../services/api';

jest.mock('./Modal', () => ({ isOpen, children, title }) =>
  isOpen ? <div data-testid="modal"><h2>{title}</h2>{children}</div> : null
);
jest.mock('./ConfirmModal', () => ({ isOpen, onConfirm, title, message, confirmText }) =>
  isOpen ? (
    <div data-testid="confirm-modal">
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onConfirm}>{confirmText}</button>
    </div>
  ) : null
);

const wishes = [
  { id: 1, name: 'Наушники', cost: 15000, saved_amount: 5000, priority: 2, status: 'active', archived: false, visibility: 'personal' },
  { id: 2, name: 'Велосипед', cost: 60000, saved_amount: 60000, priority: 1, status: 'active', archived: false },
  { id: 3, name: 'Старое', cost: 10000, saved_amount: 10000, archived: true, status: 'active' },
];

const categories = [{ id: 1, name: 'Электроника' }];
const accounts = [{ id: 1, name: 'Основной', balance: 50000 }];

describe('WishesSection', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.put.mockReset();
    api.delete.mockReset();
  });

  it('renders active wishes', () => {
    render(<WishesSection wishes={wishes} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getByText('Наушники')).toBeInTheDocument();
    expect(screen.getByText('Велосипед')).toBeInTheDocument();
    expect(screen.queryByText('Старое')).not.toBeInTheDocument();
  });

  it('shows empty state when no active wishes', () => {
    render(<WishesSection wishes={[]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getByText('Нет активных желаний')).toBeInTheDocument();
  });

  it('opens add wish modal when add button clicked', () => {
    render(<WishesSection wishes={[]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    fireEvent.click(screen.getByText('Добавить желание'));
    expect(screen.getByText('Новое желание')).toBeInTheDocument();
  });

  it('shows edit and archive buttons on active wish', () => {
    render(<WishesSection wishes={[wishes[0]]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getAllByText('edit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('archive').length).toBeGreaterThan(0);
  });

  it('shows fund button on active incomplete wish', () => {
    render(<WishesSection wishes={[wishes[0]]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getByText('Выделить средства')).toBeInTheDocument();
  });

  it('opens fund modal when выделить средства clicked', async () => {
    api.get.mockResolvedValue({ data: { personal: { available: 100000 } } });
    render(<WishesSection wishes={[wishes[0]]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    fireEvent.click(screen.getByText('Выделить средства'));
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });

  it('shows archived wishes when showArchived is true', () => {
    render(<WishesSection wishes={wishes} showArchived={true} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getByText('Архив выполненных')).toBeInTheDocument();
  });

  it('displays saved amount vs cost', () => {
    render(<WishesSection wishes={[wishes[0]]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getByText(/5 000/)).toBeInTheDocument();
  });

  it('marks completed wish differently', () => {
    render(<WishesSection wishes={[wishes[1]]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getByText('Велосипед')).toBeInTheDocument();
    expect(screen.queryByText('Выделить средства')).not.toBeInTheDocument();
  });
});
