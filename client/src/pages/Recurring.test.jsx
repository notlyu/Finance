import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Recurring from './Recurring';

jest.mock('../components/ui/FormattedInput', () => ({ value, onChange, placeholder }) => (
  <input data-testid="formatted-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
));
jest.mock('../components/ConfirmModal', () => ({ isOpen, onConfirm, title }) =>
  isOpen ? (
    <div data-testid="confirm-modal">
      <span>{title}</span>
      <button data-testid="confirm-yes" onClick={onConfirm}>Yes</button>
    </div>
  ) : null
);

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import api from '../services/api';

describe('Recurring', () => {
  const mockItems = [
    { id: 1, type: 'expense', category_name: 'Интернет', amount: 1000, day_of_month: 15, active: true, comment: 'Ростелеком', scope: 'personal', category_id: 1 },
    { id: 2, type: 'income', category_name: 'Зарплата', amount: 100000, day_of_month: 5, active: true, comment: '', scope: 'personal', category_id: 2 },
  ];
  const mockCategories = [
    { id: 1, name: 'Интернет', type: 'expense' },
    { id: 2, name: 'Зарплата', type: 'income' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/recurring') return Promise.resolve({ data: mockItems });
      if (url === '/categories') return Promise.resolve({ data: mockCategories });
      if (url === '/accounts') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
  });

  it('shows loading spinner initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<Recurring />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders page title after data loads', async () => {
    render(<Recurring />);
    expect(await screen.findByText('Регулярные операции')).toBeInTheDocument();
  });

  it('renders recurring items in the table', async () => {
    render(<Recurring />);
    await screen.findByText('Регулярные операции');
    expect(screen.getByText('Интернет')).toBeInTheDocument();
    expect(screen.getByText('Зарплата')).toBeInTheDocument();
  });

  it('displays stats cards with total and counts', async () => {
    render(<Recurring />);
    await screen.findByText('Регулярные операции');
    expect(screen.getByText('Прогноз / месяц')).toBeInTheDocument();
    expect(screen.getByText('Ближайший')).toBeInTheDocument();
    expect(screen.getByText('Активных')).toBeInTheDocument();
  });

  it('shows empty state when no recurring items', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/recurring') return Promise.resolve({ data: [] });
      if (url === '/categories') return Promise.resolve({ data: mockCategories });
      if (url === '/accounts') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    render(<Recurring />);
    await screen.findByText('Регулярные операции');
    expect(screen.getByText('Нет регулярных операций')).toBeInTheDocument();
  });

  it('opens create modal when add button is clicked', async () => {
    render(<Recurring />);
    await screen.findByText('Регулярные операции');
    fireEvent.click(screen.getByText('Добавить'));
    expect(screen.getByText('Новая регулярная операция')).toBeInTheDocument();
  });

  it('has toggle active buttons in the table', async () => {
    render(<Recurring />);
    await screen.findByText('Регулярные операции');
    const activeBtns = screen.getAllByText('Активно');
    expect(activeBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('shows delete confirmation on delete click', async () => {
    render(<Recurring />);
    await screen.findByText('Регулярные операции');
    const deleteIcons = document.querySelectorAll('.material-symbols-outlined');
    const deleteBtn = Array.from(deleteIcons).find(el => el.textContent === 'delete');
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn.closest('button'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
  });

  it('calls DELETE and refreshes on confirm delete', async () => {
    api.delete.mockResolvedValue({ data: {} });
    render(<Recurring />);
    await screen.findByText('Регулярные операции');
    const deleteIcons = document.querySelectorAll('.material-symbols-outlined');
    const deleteBtn = Array.from(deleteIcons).find(el => el.textContent === 'delete');
    fireEvent.click(deleteBtn.closest('button'));
    fireEvent.click(screen.getByTestId('confirm-yes'));
    await waitFor(() => {
      // Sorted by day_of_month asc: Зарплата (day 5) first, then Интернет (day 15)
      expect(api.delete).toHaveBeenCalledWith('/recurring/2');
    });
  });

  it('posts new recurring on form submit', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(<Recurring />);
    await screen.findByText('Регулярные операции');
    fireEvent.click(screen.getByText('Добавить'));

    expect(await screen.findByText('Новая регулярная операция')).toBeInTheDocument();

    // Fill required form fields
    const selects = document.querySelectorAll('select[name]');
    fireEvent.change(selects[0], { target: { value: 'expense' } });
    fireEvent.change(selects[1], { target: { value: '1' } });

    const amountInput = screen.getByTestId('formatted-input');
    fireEvent.change(amountInput, { target: { value: '5000' } });

    const dayInput = document.querySelector('input[name="day_of_month"]');
    if (dayInput) {
      await userEvent.clear(dayInput);
      await userEvent.type(dayInput, '15');
    }

    fireEvent.click(screen.getByText('Сохранить'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/recurring', expect.objectContaining({
        type: 'expense',
        category_id: 1,
        amount: 5000,
        day_of_month: 15,
      }));
    });
  });

  it('fetches categories and accounts on mount', async () => {
    render(<Recurring />);
    await screen.findByText('Регулярные операции');
    expect(api.get).toHaveBeenCalledWith('/categories');
    expect(api.get).toHaveBeenCalledWith('/accounts');
  });
});
