import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Debts from './Debts';

jest.mock('../components/ConfirmModal', () => ({ isOpen, open, onConfirm, title, message }) => {
  const show = isOpen || open;
  if (!show) return null;
  return (
    <div data-testid="confirm-modal">
      <span data-testid="confirm-title">{title}</span>
      <span>{message}</span>
      <button data-testid="confirm-yes" onClick={onConfirm}>Yes</button>
    </div>
  );
});

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(), patch: jest.fn() },
}));

import api from '../services/api';

describe('Debts', () => {
  const mockDebts = [
    { id: 1, name: 'Ипотека', type: 'mortgage', total_amount: 5000000, remaining: 4000000, interest_rate: 8.5, monthly_payment: 45000, start_date: '2024-01-01' },
    { id: 2, name: 'Автокредит', type: 'credit', total_amount: 1000000, remaining: 500000, interest_rate: 12, monthly_payment: 25000, start_date: '2024-06-01' },
  ];
  const mockCategories = [{ id: 1, name: 'Кредиты', type: 'expense' }];
  const mockAccounts = [{ id: 1, name: 'Основной', balance: 200000 }];

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/debts') return Promise.resolve({ data: mockDebts });
      if (url === '/categories') return Promise.resolve({ data: mockCategories });
      if (url === '/accounts') return Promise.resolve({ data: mockAccounts });
      return Promise.resolve({ data: {} });
    });
  });

  it('renders loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<Debts />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders total debt amount after data loads', async () => {
    render(<Debts />);
    expect(await screen.findByText('Общая задолженность')).toBeInTheDocument();
  });

  it('renders debt cards for each debt', async () => {
    render(<Debts />);
    await screen.findByText('Общая задолженность');
    expect(screen.getByText('Ипотека')).toBeInTheDocument();
    expect(screen.getByText('Автокредит')).toBeInTheDocument();
  });

  it('shows summary cards when debts exist', async () => {
    render(<Debts />);
    await screen.findByText('Общая задолженность');
    expect(screen.getByText('Средняя ставка')).toBeInTheDocument();
    expect(screen.getByText('Прогресс погашения')).toBeInTheDocument();
  });

  it('shows empty state when no debts', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/debts') return Promise.resolve({ data: [] });
      if (url === '/categories') return Promise.resolve({ data: mockCategories });
      return Promise.resolve({ data: {} });
    });
    render(<Debts />);
    await screen.findByText('Нет кредитов и долгов');
    expect(screen.getByText('Добавьте ваш первый кредит для отслеживания')).toBeInTheDocument();
  });

  it('opens add debt modal when add button is clicked', async () => {
    render(<Debts />);
    await screen.findByText('Общая задолженность');
    const addBtns = screen.getAllByText('Добавить долг');
    fireEvent.click(addBtns[0]);
    expect(screen.getByPlaceholderText('Ипотека, автокредит...')).toBeInTheDocument();
  });

  it('posts new debt on form submit', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(<Debts />);
    await screen.findByText('Общая задолженность');
    const addBtns = screen.getAllByText('Добавить долг');
    fireEvent.click(addBtns[0]);
    const nameInput = screen.getByPlaceholderText('Ипотека, автокредит...');
    fireEvent.change(nameInput, { target: { value: 'Новый долг' } });
    const amountInputs = document.querySelectorAll('input[type="number"]');
    fireEvent.change(amountInputs[0], { target: { value: '100000' } });
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2024-01-01' } });
    const form = document.querySelector('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/debts', expect.any(Object));
    });
  });

  it('opens partial close modal when payments button is clicked', async () => {
    api.get.mockResolvedValue({ data: mockAccounts });
    render(<Debts />);
    await screen.findByText('Общая задолженность');
    const paymentsBtns = screen.getAllByTitle('Закрыть часть');
    fireEvent.click(paymentsBtns[0]);
    expect(screen.getByText('Закрыть часть долга')).toBeInTheDocument();
  });

  it('calls PATCH on partial close submit', async () => {
    api.patch = jest.fn().mockResolvedValue({ data: {} });
    render(<Debts />);
    await screen.findByText('Общая задолженность');
    const paymentsBtns = screen.getAllByTitle('Закрыть часть');
    fireEvent.click(paymentsBtns[0]);
    const amountInput = screen.getByPlaceholderText('0');
    fireEvent.change(amountInput, { target: { value: '10000' } });
    const closeBtn = screen.getByText('Закрыть');
    fireEvent.click(closeBtn);
    await waitFor(() => {
      // Sorted by interest_rate desc: Автокредит (12%) first, then Ипотека (8.5%)
      expect(api.patch).toHaveBeenCalledWith('/debts/2/close-partial', expect.any(Object));
    });
  });

  it('shows delete confirmation on delete click', async () => {
    render(<Debts />);
    await screen.findByText('Общая задолженность');
    const deleteBtns = screen.getAllByTitle('Удалить');
    fireEvent.click(deleteBtns[0]);
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-title').textContent).toBe('Закрыть полностью?');
  });

  it('calls DELETE on confirm delete', async () => {
    api.delete.mockResolvedValue({ data: {} });
    render(<Debts />);
    await screen.findByText('Общая задолженность');
    const deleteBtns = screen.getAllByTitle('Удалить');
    fireEvent.click(deleteBtns[0]);
    fireEvent.click(screen.getByTestId('confirm-yes'));
    await waitFor(() => {
      // Sorted by interest_rate desc: Автокредит (12%) first, then Ипотека (8.5%)
      expect(api.delete).toHaveBeenCalledWith('/debts/2');
    });
  });
});
