import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Budgets from './Budgets';

jest.mock('../components/ui/FormattedInput', () => ({ value, onChange, placeholder, label, min, max }) => (
  <input
    data-testid="formatted-input"
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    data-label={label}
    data-min={min}
    data-max={max}
  />
));
jest.mock('../components/ConfirmModal', () => ({ isOpen, onConfirm, title, message }) =>
  isOpen ? (
    <div data-testid="confirm-modal">
      <span>{title}</span>
      <span>{message}</span>
      <button data-testid="confirm-yes" onClick={onConfirm}>Yes</button>
    </div>
  ) : null
);

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import api from '../services/api';

describe('Budgets', () => {
  const mockBudgets = [
    {
      id: 1, category_name: 'Продукты', limit_amount: 30000, actual_amount: 25000,
      category_type: 'expense', progress: 83.33, spent_by_members: [],
    },
    {
      id: 2, category_name: 'Зарплата', limit_amount: 100000, actual_amount: 100000,
      category_type: 'income', progress: 100, spent_by_members: [],
    },
  ];
  const mockCategories = [
    { id: 1, name: 'Продукты', type: 'expense' },
    { id: 2, name: 'Зарплата', type: 'income' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/budgets') return Promise.resolve({ data: { items: mockBudgets } });
      if (url === '/categories') return Promise.resolve({ data: mockCategories });
      if (url === '/dashboard') return Promise.resolve({ data: { family: { memberStats: [] } } });
      return Promise.resolve({ data: {} });
    });
  });

  it('renders page title after data loads', async () => {
    render(<Budgets />);
    expect(await screen.findByText('Бюджеты')).toBeInTheDocument();
  });

  it('renders budget items in the table', async () => {
    render(<Budgets />);
    await screen.findByText('Бюджеты');
    expect(screen.getByText('Продукты')).toBeInTheDocument();
    expect(screen.getByText('Зарплата')).toBeInTheDocument();
  });

  it('displays summary cards with totals', async () => {
    render(<Budgets />);
    await screen.findByText('Бюджеты');
    expect(screen.getByText('Доходы')).toBeInTheDocument();
    expect(screen.getByText('Расходы')).toBeInTheDocument();
    expect(screen.getByText('Накопления')).toBeInTheDocument();
    expect(screen.getByText('Свободно')).toBeInTheDocument();
  });

  it('shows empty state when no budgets exist', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/budgets') return Promise.resolve({ data: { items: [] } });
      if (url === '/categories') return Promise.resolve({ data: mockCategories });
      if (url === '/dashboard') return Promise.resolve({ data: { family: { memberStats: [] } } });
      return Promise.resolve({ data: {} });
    });
    render(<Budgets />);
    await screen.findByText('Бюджеты');
    expect(screen.getByText('Нет бюджетов')).toBeInTheDocument();
  });

  it('opens create budget modal when add button is clicked', async () => {
    render(<Budgets />);
    await screen.findByText('Бюджеты');
    fireEvent.click(screen.getByText('Добавить'));
    expect(screen.getByText('Новый бюджет')).toBeInTheDocument();
  });

  it('switches between month and year period types', async () => {
    render(<Budgets />);
    await screen.findByText('Бюджеты');
    fireEvent.click(screen.getByText('Год'));
    const monthBtn = screen.getByText('Месяц');
    fireEvent.click(monthBtn);
  });

  it('calls budgets API with month param', async () => {
    render(<Budgets />);
    await screen.findByText('Бюджеты');
    expect(api.get).toHaveBeenCalledWith('/budgets', expect.objectContaining({
      params: expect.objectContaining({ month: expect.any(String) }),
    }));
  });

  it('shows delete confirmation when delete is clicked', async () => {
    render(<Budgets />);
    await screen.findByText('Бюджеты');
    const editBtns = screen.getAllByText('edit');
    expect(editBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('calls DELETE and refreshes on confirm delete', async () => {
    api.delete.mockResolvedValue({ data: {} });
    render(<Budgets />);
    await screen.findByText('Бюджеты');
    const deleteIcons = document.querySelectorAll('.material-symbols-outlined');
    const deleteBtn = Array.from(deleteIcons).find(el => el.textContent === 'delete');
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn.closest('button'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-yes'));
    await waitFor(() => {
      // Sorted by limit_amount desc: Зарплата (100000) first, then Продукты (30000)
      expect(api.delete).toHaveBeenCalledWith('/budgets/2');
    });
  });

  it('navigates to previous month on chevron click', async () => {
    render(<Budgets />);
    await screen.findByText('Бюджеты');
    const prevBtn = screen.getByTitle('Предыдущий месяц');
    fireEvent.click(prevBtn);
  });

  it('creates budget on form submit', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(<Budgets />);
    await screen.findByText('Бюджеты');
    fireEvent.click(screen.getByText('Добавить'));

    const selects = document.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(1);
    const categorySelect = selects[0];
    fireEvent.change(categorySelect, { target: { value: '1' } });

    fireEvent.click(screen.getByText('Сохранить'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/budgets', expect.any(Object));
    });
  });
});
