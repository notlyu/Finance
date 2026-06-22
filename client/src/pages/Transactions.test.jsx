import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Transactions from './Transactions';

jest.mock('../components/TransactionFilters', () => () => <div data-testid="transaction-filters" />);
jest.mock('../components/TransactionList', () => ({ transactions, hasMore, onDuplicate, onEdit, onDelete }) => (
  <div data-testid="transaction-list">
    <span data-testid="tx-count">{transactions.length}</span>
    {hasMore && <button data-testid="load-more">Load More</button>}
    {transactions.map(t => (
      <div key={t.id}>
        <span>{t.category_name}</span>
        <button data-testid={`edit-${t.id}`} onClick={() => onEdit(t)}>Edit</button>
        <button data-testid={`delete-${t.id}`} onClick={() => onDelete(t.id)}>Delete</button>
        <button data-testid={`duplicate-${t.id}`} onClick={() => onDuplicate(t)}>Duplicate</button>
      </div>
    ))}
  </div>
));
jest.mock('../components/TransactionForm', () => ({ isOpen, onClose, editingId, onSubmit, handleSubmit }) =>
  isOpen ? (
    <div data-testid="transaction-form">
      <span data-testid="form-mode">{editingId ? 'edit' : 'create'}</span>
      <button data-testid="form-close" onClick={onClose}>Close</button>
      <form onSubmit={handleSubmit(onSubmit)}>
        <button type="submit" data-testid="form-submit">Submit</button>
      </form>
    </div>
  ) : null
);
jest.mock('../components/ConfirmModal', () => ({ isOpen, onClose, onConfirm, title, message }) =>
  isOpen ? (
    <div data-testid="confirm-modal">
      <span data-testid="confirm-title">{title}</span>
      <span data-testid="confirm-message">{message}</span>
      <button data-testid="confirm-yes" onClick={onConfirm}>Yes</button>
      <button data-testid="confirm-no" onClick={onClose}>No</button>
    </div>
  ) : null
);

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  downloadFile: jest.fn(),
}));

import api from '../services/api';

describe('Transactions', () => {
  const mockTransactions = [
    { id: 1, amount: 5000, type: 'income', category_name: 'Зарплата', date: '2024-01-15', comment: '', category_id: 1, account_id: null, is_personal: true },
  ];
  const mockCategories = [{ id: 1, name: 'Зарплата', type: 'income' }];
  const mockAccounts = [{ id: 1, name: 'Основной' }];

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/transactions') return Promise.resolve({ data: { items: mockTransactions, meta: { hasMore: false, offset: 0 } } });
      if (url === '/categories') return Promise.resolve({ data: mockCategories });
      if (url === '/accounts') return Promise.resolve({ data: mockAccounts });
      if (url === '/auth/me') return Promise.resolve({ data: { id: 1, family_id: null } });
      return Promise.resolve({ data: {} });
    });
  });

  it('shows loading spinner initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<Transactions />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders page title after data loads', async () => {
    render(<Transactions />);
    expect(await screen.findByText('Операции')).toBeInTheDocument();
  });

  it('renders transaction list with items', async () => {
    render(<Transactions />);
    await screen.findByText('Операции');
    expect(screen.getByTestId('transaction-list')).toBeInTheDocument();
    expect(screen.getByTestId('tx-count').textContent).toBe('1');
  });

  it('renders transaction filters component', async () => {
    render(<Transactions />);
    await screen.findByText('Операции');
    expect(screen.getByTestId('transaction-filters')).toBeInTheDocument();
  });

  it('opens add transaction modal when add button is clicked', async () => {
    render(<Transactions />);
    await screen.findByText('Операции');
    const addBtn = screen.getByRole('button', { name: /добавить/i });
    fireEvent.click(addBtn);
    expect(screen.getByTestId('transaction-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-mode').textContent).toBe('create');
  });

  it('opens edit modal when edit button clicked on a transaction', async () => {
    render(<Transactions />);
    await screen.findByText('Операции');
    fireEvent.click(screen.getByTestId('edit-1'));
    expect(screen.getByTestId('transaction-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-mode').textContent).toBe('edit');
  });

  it('shows confirm modal on delete', async () => {
    render(<Transactions />);
    await screen.findByText('Операции');
    fireEvent.click(screen.getByTestId('delete-1'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-title').textContent).toBe('Удалить операцию?');
  });

  it('calls DELETE and refreshes on confirm delete', async () => {
    api.delete.mockResolvedValue({ data: {} });
    render(<Transactions />);
    await screen.findByText('Операции');
    fireEvent.click(screen.getByTestId('delete-1'));
    fireEvent.click(screen.getByTestId('confirm-yes'));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/transactions/1');
    });
  });

  it('displays search input for filtering', async () => {
    render(<Transactions />);
    await screen.findByText('Операции');
    expect(screen.getByPlaceholderText('Поиск по комментарию...')).toBeInTheDocument();
  });

  it('fetches categories and accounts on mount', async () => {
    render(<Transactions />);
    await screen.findByText('Операции');
    expect(api.get).toHaveBeenCalledWith('/categories');
    expect(api.get).toHaveBeenCalledWith('/accounts');
  });

  it('shows export dropdown on click', async () => {
    render(<Transactions />);
    await screen.findByText('Операции');
    const exportBtn = screen.getByRole('button', { name: /экспорт/i });
    fireEvent.click(exportBtn);
    expect(screen.getByText('Excel (.xlsx)')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', async () => {
    render(<Transactions />);
    await screen.findByText('Операции');
    const addBtn = screen.getByRole('button', { name: /добавить/i });
    fireEvent.click(addBtn);
    expect(screen.getByTestId('transaction-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('form-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('transaction-form')).not.toBeInTheDocument();
    });
  });

  it('posts new transaction on form submit', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(<Transactions />);
    await screen.findByText('Операции');
    const addBtn = screen.getByRole('button', { name: /добавить/i });
    fireEvent.click(addBtn);
    fireEvent.click(screen.getByTestId('form-submit'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/transactions', expect.any(Object));
    });
  });

  it('handles API error gracefully', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    render(<Transactions />);
    await screen.findByText('Операции');
    expect(screen.getByTestId('transaction-list')).toBeInTheDocument();
  });
});
