import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Import from './Import';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import api from '../services/api';

describe('Import', () => {
  const mockTemplate = {
    columns: ['date', 'amount', 'category', 'comment'],
    example: ['2024-01-15,5000,Зарплата,Январь'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/import/template') return Promise.resolve({ data: mockTemplate });
      return Promise.resolve({ data: {} });
    });
  });

  it('renders import page title', () => {
    render(<Import />);
    expect(screen.getByText('Импорт из CSV')).toBeInTheDocument();
  });

  it('renders upload area', () => {
    render(<Import />);
    expect(screen.getByText(/Перетащите CSV файл/)).toBeInTheDocument();
  });

  it('renders CSV textarea', () => {
    render(<Import />);
    expect(screen.getByPlaceholderText(/date,amount,category/)).toBeInTheDocument();
  });

  it('shows import button disabled when textarea is empty', () => {
    render(<Import />);
    const importBtn = screen.getByText('Импортировать');
    expect(importBtn).toBeDisabled();
  });

  it('enables import button when CSV text is entered', () => {
    render(<Import />);
    const textarea = screen.getByPlaceholderText(/date,amount,category/);
    fireEvent.change(textarea, { target: { value: 'date,amount\n2024-01-15,5000' } });
    expect(screen.getByText('Импортировать')).not.toBeDisabled();
  });

  it('calls import API on textarea submit', async () => {
    api.post.mockResolvedValue({ data: { imported: 1 } });
    render(<Import />);
    const textarea = screen.getByPlaceholderText(/date,amount,category/);
    fireEvent.change(textarea, { target: { value: 'date,amount\n2024-01-15,5000' } });
    fireEvent.click(screen.getByText('Импортировать'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/import/import', { csv: 'date,amount\n2024-01-15,5000' });
    });
  });

  it('displays import result after successful import', async () => {
    api.post.mockResolvedValue({ data: { imported: 5, skipped: 0 } });
    render(<Import />);
    const textarea = screen.getByPlaceholderText(/date,amount,category/);
    fireEvent.change(textarea, { target: { value: 'date,amount\n2024-01-15,5000' } });
    fireEvent.click(screen.getByText('Импортировать'));
    expect(await screen.findByText('Импорт завершён!')).toBeInTheDocument();
    expect(screen.getByText(/Добавлено: 5/)).toBeInTheDocument();
  });

  it('shows error message on import failure', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Неверный формат' } } });
    render(<Import />);
    const textarea = screen.getByPlaceholderText(/date,amount,category/);
    fireEvent.change(textarea, { target: { value: 'bad data' } });
    fireEvent.click(screen.getByText('Импортировать'));
    expect(await screen.findByText('Неверный формат')).toBeInTheDocument();
  });

  it('shows template example', async () => {
    render(<Import />);
    await screen.findByText(/Пример формата/);
  });

  it('shows loading state during import', async () => {
    api.post.mockReturnValue(new Promise(() => {}));
    render(<Import />);
    const textarea = screen.getByPlaceholderText(/date,amount,category/);
    fireEvent.change(textarea, { target: { value: 'date,amount\n2024-01-15,5000' } });
    fireEvent.click(screen.getByText('Импортировать'));
    expect(await screen.findByText('Импорт...')).toBeInTheDocument();
  });
});
