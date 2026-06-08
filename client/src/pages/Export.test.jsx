import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Export from './Export';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import api from '../services/api';

describe('Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: new Blob(['test']) });
  });

  it('renders export page title', () => {
    render(<Export />);
    expect(screen.getByText('Экспорт данных')).toBeInTheDocument();
  });

  it('renders all export type options', () => {
    render(<Export />);
    expect(screen.getByText('Операции')).toBeInTheDocument();
    expect(screen.getByText('Цели')).toBeInTheDocument();
    expect(screen.getByText('Желания')).toBeInTheDocument();
    expect(screen.getByText('Бюджеты')).toBeInTheDocument();
  });

  it('renders format options', () => {
    render(<Export />);
    expect(screen.getByText('Excel (.xlsx)')).toBeInTheDocument();
    expect(screen.getByText('CSV (.csv)')).toBeInTheDocument();
  });

  it('changes selected type on click', () => {
    render(<Export />);
    const budgetsBtn = screen.getByText('Бюджеты');
    fireEvent.click(budgetsBtn);
    expect(budgetsBtn.closest('button')).toHaveClass('border-primary');
  });

  it('changes selected format on click', () => {
    render(<Export />);
    const csvBtn = screen.getByText('CSV (.csv)');
    fireEvent.click(csvBtn);
    expect(csvBtn.closest('button')).toHaveClass('bg-primary');
  });

  it('shows download button with correct text for default xlsx format', () => {
    render(<Export />);
    expect(screen.getByText('Скачать Excel')).toBeInTheDocument();
  });

  it('shows download text for CSV when CSV format selected', () => {
    render(<Export />);
    fireEvent.click(screen.getByText('CSV (.csv)'));
    expect(screen.getByText('Скачать CSV')).toBeInTheDocument();
  });

  it('calls export API on download click', async () => {
    render(<Export />);
    const downloadBtn = screen.getByText('Скачать Excel');
    fireEvent.click(downloadBtn);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/export/transactions', expect.objectContaining({
        params: expect.any(URLSearchParams),
        responseType: 'blob',
      }));
    });
  });

  it('shows date range inputs', () => {
    render(<Export />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
  });

  it('uses type from search params when provided', () => {
    const mockParams = new URLSearchParams('type=goals');
    jest.spyOn(URLSearchParams.prototype, 'get').mockImplementation(function(key) {
      if (key === 'type') return 'goals';
      return null;
    });
    render(<Export />);
    expect(screen.getByText('Цели').closest('button')).toHaveClass('border-primary');
    jest.restoreAllMocks();
  });

  it('shows loading spinner during export', async () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<Export />);
    fireEvent.click(screen.getByText('Скачать Excel'));
    expect(await screen.findByText('Экспорт...')).toBeInTheDocument();
  });

  it('disables download button during export', async () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<Export />);
    const downloadBtn = screen.getByText('Скачать Excel');
    fireEvent.click(downloadBtn);
    await waitFor(() => {
      expect(screen.getByText('Экспорт...').closest('button')).toBeDisabled();
    });
  });
});
