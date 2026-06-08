import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Analytics from './Analytics';

global.MutationObserver = class {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
};

jest.mock('react-router-dom', () => ({
  useOutletContext: () => ({ selectedMember: null }),
  useNavigate: () => jest.fn(),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Line: () => <div data-testid="line-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />,
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  downloadFile: jest.fn(),
}));

import api from '../services/api';

const mockDynamics = {
  labels: ['янв', 'фев', 'мар'],
  income: [100000, 120000, 110000],
  expense: [60000, 70000, 65000],
};

const mockExpensesByCat = [
  { name: 'Продукты', total: 35000 },
  { name: 'Транспорт', total: 15000 },
  { name: 'Коммуналка', total: 12000 },
];

const mockIncomeByCat = [
  { name: 'Зарплата', total: 100000 },
  { name: 'Фриланс', total: 20000 },
];

const mockPillowHistory = [
  { id: 1, calculated_at: '2025-01-01T00:00:00Z', value: 100000, target_value: 300000 },
  { id: 2, calculated_at: '2025-02-01T00:00:00Z', value: 200000, target_value: 300000 },
  { id: 3, calculated_at: '2025-03-01T00:00:00Z', value: 300000, target_value: 300000 },
];

describe('Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/reports/dynamics') return Promise.resolve({ data: mockDynamics });
      if (url === '/reports/expenses-by-category') return Promise.resolve({ data: mockExpensesByCat });
      if (url === '/reports/income-by-category') return Promise.resolve({ data: mockIncomeByCat });
      if (url === '/safety-pillow/history') return Promise.resolve({ data: mockPillowHistory });
      if (url === '/reports/net-worth') return Promise.resolve({ data: { currentAssets: 0, currentLiabilities: 0, currentNetWorth: 0, currentSavingsRate: 0, monthly: [] } });
      if (url === '/reports/forecast') return Promise.resolve({ data: { currentMonth: null } });
      return Promise.resolve({ data: {} });
    });
  });

  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<Analytics />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders analytics title after data loads', async () => {
    render(<Analytics />);
    expect(await screen.findByText('Аналитика')).toBeInTheDocument();
  });

  it('renders the period label', async () => {
    render(<Analytics />);
    expect(await screen.findByText('12 месяцев')).toBeInTheDocument();
  });

  it('renders line chart section for income/expense dynamics', async () => {
    render(<Analytics />);
    expect(await screen.findByText('Динамика доходов и расходов')).toBeInTheDocument();
    const lineCharts = screen.getAllByTestId('line-chart');
    expect(lineCharts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders expenses by category section with donut chart', async () => {
    render(<Analytics />);
    expect(await screen.findByText('Расходы по категориям')).toBeInTheDocument();
    const donuts = screen.getAllByTestId('doughnut-chart');
    expect(donuts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Продукты')).toBeInTheDocument();
    expect(screen.getByText('Транспорт')).toBeInTheDocument();
  });

  it('renders income by category section', async () => {
    render(<Analytics />);
    expect(await screen.findByText('Доходы по категориям')).toBeInTheDocument();
    expect(screen.getByText('Зарплата')).toBeInTheDocument();
    expect(screen.getByText('Фриланс')).toBeInTheDocument();
  });

  it('renders pillow history section when data exists', async () => {
    render(<Analytics />);
    expect(await screen.findByText('Динамика подушки безопасности')).toBeInTheDocument();
  });

  it('renders date range period selector', async () => {
    render(<Analytics />);
    expect(await screen.findByText('3 мес')).toBeInTheDocument();
    expect(screen.getByText('6 мес')).toBeInTheDocument();
    expect(screen.getByText('12 мес')).toBeInTheDocument();
    expect(screen.getByText('Свой')).toBeInTheDocument();
  });

  it('shows custom date inputs when custom period selected', async () => {
    render(<Analytics />);
    await screen.findByText('Аналитика');
    const customBtn = screen.getByText('Свой');
    fireEvent.click(customBtn);
    await waitFor(() => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);
    });
  });

  it('switches period on preset click', async () => {
    render(<Analytics />);
    await screen.findByText('Аналитика');
    fireEvent.click(screen.getByText('3 мес'));
    await screen.findByText('3 месяца');
  });

  it('shows empty state for expenses when no data', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/reports/dynamics') return Promise.resolve({ data: { labels: [], income: [], expense: [] } });
      if (url === '/reports/expenses-by-category') return Promise.resolve({ data: [] });
      if (url === '/reports/income-by-category') return Promise.resolve({ data: [] });
      if (url === '/safety-pillow/history') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    render(<Analytics />);
    const emptyMessages = await screen.findAllByText('Нет данных');
    expect(emptyMessages.length).toBeGreaterThanOrEqual(2);
  });
});
