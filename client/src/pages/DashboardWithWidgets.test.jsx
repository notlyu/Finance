import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardWithWidgets from './DashboardWithWidgets';

jest.mock('react-router-dom', () => ({
  useOutletContext: () => ({
    currentUser: { id: 1, name: 'Test', email: 'test@test.com', family_id: null },
    selectedMember: null,
  }),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock('../services/widgetStorage', () => ({
  getWidgetConfig: jest.fn(),
  saveWidgetConfig: jest.fn(),
}));

import api from '../services/api';
import { getWidgetConfig, saveWidgetConfig } from '../services/widgetStorage';

const defaultDashboardData = {
  personal: {
    monthIncome: 150000,
    monthExpenses: 90000,
    available: 600000,
    balance: 1200000,
  },
};

const defaultWidgetConfig = [
  { id: 'w1', type: 'allocation', order: 0 },
  { id: 'w2', type: 'transactions', order: 1 },
  { id: 'w3', type: 'goals', order: 2 },
];

describe('DashboardWithWidgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getWidgetConfig.mockResolvedValue(defaultWidgetConfig);
    api.get.mockResolvedValue({ data: defaultDashboardData });
  });

  it('renders dashboard title for personal space', async () => {
    render(<DashboardWithWidgets />);
    expect(await screen.findByText('Личные финансы')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    getWidgetConfig.mockReturnValue(new Promise(() => {}));
    api.get.mockReturnValue(new Promise(() => {}));
    render(<DashboardWithWidgets />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders widgets from config after loading', async () => {
    render(<DashboardWithWidgets />);
    expect(await screen.findByText('Распределение')).toBeInTheDocument();
    expect(await screen.findByText('Последние операции')).toBeInTheDocument();
    expect(await screen.findByText('Цели и желания')).toBeInTheDocument();
  });

  it('displays income, expense and available summary', async () => {
    render(<DashboardWithWidgets />);
    expect(await screen.findByText('150 000', { exact: false })).toBeInTheDocument();
    expect(await screen.findByText('Ваш остаток')).toBeInTheDocument();
  });

  it('handles API error gracefully when dashboard request fails', async () => {
    getWidgetConfig.mockResolvedValue(defaultWidgetConfig);
    api.get.mockRejectedValue(new Error('Network error'));
    render(<DashboardWithWidgets />);
    expect(await screen.findByText('Личные финансы')).toBeInTheDocument();
    const zeroAmounts = screen.getAllByText(/0\s*₽/);
    expect(zeroAmounts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows widgets section header', async () => {
    render(<DashboardWithWidgets />);
    expect(await screen.findByText('Виджеты')).toBeInTheDocument();
  });

  it('shows configure widgets button', async () => {
    render(<DashboardWithWidgets />);
    expect(await screen.findByText('Настроить')).toBeInTheDocument();
  });

  it('shows family title when routeSpace is family', async () => {
    getWidgetConfig.mockResolvedValue([
      { id: 'fw1', type: 'allocation', order: 0 },
    ]);
    render(<DashboardWithWidgets space="family" />);
    expect(await screen.findByText('Семейные финансы')).toBeInTheDocument();
  });
});
