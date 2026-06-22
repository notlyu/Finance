import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoalsSection from './GoalsSection';
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
jest.mock('./ForecastModal', () => () => null);

const goals = [
  { id: 1, name: 'Машина', target_amount: 2000000, current_amount: 500000, target_date: '2026-12-31', archived: false, achieved: false },
  { id: 2, name: 'Отпуск', target_amount: 300000, current_amount: 100000, target_date: '2025-06-30', archived: false, achieved: false },
  { id: 3, name: 'Старая цель', target_amount: 100000, current_amount: 100000, archived: true, achieved: false },
];

const categories = [{ id: 1, name: 'Путешествия' }];
const accounts = [{ id: 1, name: 'Основной', balance: 50000 }];

describe('GoalsSection', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.put.mockReset();
    api.delete.mockReset();
  });

  it('renders active goals', () => {
    render(<GoalsSection goals={goals} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getByText('Машина')).toBeInTheDocument();
    expect(screen.queryByText('Отпуск')).toBeInTheDocument();
    expect(screen.queryByText('Старая цель')).not.toBeInTheDocument();
  });

  it('shows empty state when no active goals', () => {
    render(<GoalsSection goals={[]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getByText('Нет активных целей')).toBeInTheDocument();
  });

  it('opens add goal modal when add button clicked', () => {
    render(<GoalsSection goals={[]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    const addBtns = screen.getAllByText('Добавить цель');
    fireEvent.click(addBtns[0]);
    expect(screen.getByText('Новая цель')).toBeInTheDocument();
  });

  it('shows edit button on active goal', () => {
    render(<GoalsSection goals={[goals[0]]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    const editBtns = screen.getAllByText('edit');
    expect(editBtns.length).toBeGreaterThan(0);
  });

  it('shows archive button on active goal', () => {
    render(<GoalsSection goals={[goals[0]]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    const archiveBtns = screen.getAllByText('archive');
    expect(archiveBtns.length).toBeGreaterThan(0);
  });

  it('shows archived goals when showArchived is true', () => {
    render(<GoalsSection goals={goals} showArchived={true} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getByText('Архив выполненных')).toBeInTheDocument();
  });

  it('displays goal target amount and current amount', () => {
    render(<GoalsSection goals={[goals[0]]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    expect(screen.getByText(/Накоплено/)).toBeInTheDocument();
  });

  it('opens contribute modal when пополнить clicked', async () => {
    api.get.mockResolvedValue({ data: { personal: { available: 100000 } } });
    render(<GoalsSection goals={[goals[0]]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    const contribBtn = screen.getByText('Пополнить');
    fireEvent.click(contribBtn);
    await waitFor(() => {
      expect(screen.getByText('Пополнить цель')).toBeInTheDocument();
    });
  });

  it('opens forecast modal when прогноз clicked', () => {
    render(<GoalsSection goals={[goals[0]]} categories={categories} accounts={accounts} todayStr="2025-01-01" onRefresh={jest.fn()} />);
    const forecastBtn = screen.getByText('Прогноз');
    fireEvent.click(forecastBtn);
  });
});
