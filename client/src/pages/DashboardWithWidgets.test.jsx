import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardWithWidgets from './DashboardWithWidgets';

let mockOutlet = {
  currentUser: { id: 1, name: 'Test', email: 'test@test.com', family_id: null },
  selectedMember: null,
};
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useOutletContext: () => mockOutlet,
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => mockNavigate,
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
    mockOutlet = {
      currentUser: { id: 1, name: 'Test', email: 'test@test.com', family_id: null },
      selectedMember: null,
    };
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

  it('opens the quick-add form when the FAB is clicked (T1.2)', async () => {
    render(<DashboardWithWidgets />);
    await screen.findByText('Личные финансы');
    fireEvent.click(screen.getByLabelText('Быстро добавить операцию'));
    expect(await screen.findByText('Добавить операцию')).toBeInTheDocument();
  });

  it('shows family title when routeSpace is family', async () => {
    getWidgetConfig.mockResolvedValue([
      { id: 'fw1', type: 'allocation', order: 0 },
    ]);
    render(<DashboardWithWidgets space="family" />);
    expect(await screen.findByText('Семейные финансы')).toBeInTheDocument();
  });

  // T2.1 — двойной баланс: участник семьи видит оба пространства сразу
  describe('dual-balance strip (family member)', () => {
    beforeEach(() => {
      mockOutlet = {
        currentUser: { id: 1, name: 'Test', family_id: 7 },
        selectedMember: { id: 1, name: 'Test' },
      };
      api.get.mockResolvedValue({
        data: {
          personal: { available: 600000, balance: 1200000, monthIncome: 1, monthExpenses: 0 },
          family: { available: 250000, balance: 400000, monthIncome: 1, monthExpenses: 0 },
        },
      });
    });

    it('renders both Личное and Семья summaries with their amounts', async () => {
      render(<DashboardWithWidgets space="family" />);
      expect(await screen.findByText('Личное')).toBeInTheDocument();
      expect(screen.getByText('Семья')).toBeInTheDocument();
      // личный «доступно» виден только в дуал-карте (hero показывает семейное)
      expect(screen.getByText(/600\s*000/)).toBeInTheDocument();
      // семейное «доступно» — и в карте, и в hero
      expect(screen.getAllByText(/250\s*000/).length).toBeGreaterThanOrEqual(1);
    });

    it('navigates to the other space when its card is clicked', async () => {
      render(<DashboardWithWidgets space="family" />);
      const personalCard = (await screen.findByText('Личное')).closest('button');
      fireEvent.click(personalCard);
      expect(mockNavigate).toHaveBeenCalledWith('/personal/dashboard');
    });
  });
});
