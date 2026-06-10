import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SafetyPillow from './SafetyPillow';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import api from '../services/api';

const mockPillowData = {
  liquidFunds: 500000,
  monthlyAverage: 100000,
  months: 5,
  progress: 55.5,
  levels: {
    minimal: { months: 3, target: 300000, reached: true, progress: 100 },
    comfortable: { months: 6, target: 600000, reached: false, progress: 83.3 },
    optimal: { months: 12, target: 1200000, reached: false, progress: 41.7 },
  },
  recommendation: {
    shortfall: 100000,
    monthlyAmount: 25000,
    monthsToTarget: 4,
  },
  topCategories: [
    { name: 'Продукты', amount: 35000, pct: 35 },
    { name: 'Транспорт', amount: 15000, pct: 15 },
    { name: 'Коммуналка', amount: 12000, pct: 12 },
  ],
  history: [
    { id: 1, calculated_at: '2025-01-01T00:00:00Z', value: 100000, target_value: 300000 },
    { id: 2, calculated_at: '2025-02-01T00:00:00Z', value: 200000, target_value: 300000 },
  ],
};

const mockSettingsData = { months: 6 };

describe('SafetyPillow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/safety-pillow/current') {
        return Promise.resolve({ data: mockPillowData });
      }
      if (url === '/safety-pillow/settings') {
        return Promise.resolve({ data: mockSettingsData });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('shows loading spinner initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<SafetyPillow />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders safety pillow status after data loads', async () => {
    render(<SafetyPillow />);
    expect(await screen.findByText('Финансовая защита')).toBeInTheDocument();
    expect(await screen.findByText(/Подушка безопасности/)).toBeInTheDocument();
  });

  it('displays liquid funds amount', async () => {
    render(<SafetyPillow />);
    expect(await screen.findByText('500 000')).toBeInTheDocument();
  });

  it('displays monthly average expenses', async () => {
    render(<SafetyPillow />);
    expect(await screen.findByText(/мес/, { selector: '.ml-2' })).toBeInTheDocument();
  });

  it('shows target months from settings', async () => {
    render(<SafetyPillow />);
    expect(await screen.findByText('Цель: 6 месяцев')).toBeInTheDocument();
  });

  it('displays months covered', async () => {
    render(<SafetyPillow />);
    expect(await screen.findByText(/Зарезервировано.*5 мес/)).toBeInTheDocument();
  });

  it('renders protection level cards', async () => {
    render(<SafetyPillow />);
    expect(await screen.findByText(/Минимальный/)).toBeInTheDocument();
    expect(await screen.findByText(/Комфортный/)).toBeInTheDocument();
    expect(await screen.findByText(/Оптимальный/)).toBeInTheDocument();
  });

  it('renders recommendation block when shortfall exists', async () => {
    render(<SafetyPillow />);
    expect(await screen.findByText(/Пополняйте на/)).toBeInTheDocument();
  });

  it('renders category expenses breakdown', async () => {
    render(<SafetyPillow />);
    expect(await screen.findByText('Продукты')).toBeInTheDocument();
    expect(await screen.findByText('Транспорт')).toBeInTheDocument();
  });

  it('renders history table when history exists', async () => {
    render(<SafetyPillow />);
    expect(await screen.findByText('История пополнений')).toBeInTheDocument();
  });

  it('renders settings section with month presets', async () => {
    render(<SafetyPillow />);
    expect(await screen.findByText('Настройки подушки')).toBeInTheDocument();
    const all3mes = screen.getAllByText('3 мес');
    const all6mes = screen.getAllByText('6 мес');
    const all12mes = screen.getAllByText('12 мес');
    expect(all3mes.length).toBeGreaterThanOrEqual(1);
    expect(all6mes.length).toBeGreaterThanOrEqual(1);
    expect(all12mes.length).toBeGreaterThanOrEqual(1);
  });

  it('updates settings when preset button is clicked', async () => {
    api.patch.mockResolvedValue({ data: {} });
    render(<SafetyPillow />);
    await screen.findByText('Настройки подушки');

    const buttons = screen.getAllByRole('button').filter(b => b.textContent.includes('12 мес'));
    const settingsButton = buttons[buttons.length - 1];
    fireEvent.click(settingsButton);
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/safety-pillow/settings', { months: 12 });
    });
  });

  it('shows custom input when custom period button is clicked', async () => {
    render(<SafetyPillow />);
    await screen.findByText('Настройки подушки');

    fireEvent.click(screen.getByText('Свой период'));
    expect(screen.getByPlaceholderText('1-24')).toBeInTheDocument();
    expect(screen.getByText('Сохранить')).toBeInTheDocument();
  });

  it('shows error state when data is null after loading', async () => {
    api.get.mockRejectedValue(new Error('Failed'));
    render(<SafetyPillow />);
    await screen.findByText('Ошибка загрузки');
  });
});
