import { render, screen, fireEvent } from '@testing-library/react';
import TransactionFilters from './TransactionFilters';

const categories = [
  { id: 1, name: 'Еда' },
  { id: 2, name: 'Транспорт' },
];

const accounts = [
  { id: 1, name: 'Наличные' },
  { id: 2, name: 'Карта' },
];

function renderFilters(overrides = {}) {
  const props = {
    datePreset: 'month',
    onDatePresetChange: jest.fn(),
    customStart: '',
    customEnd: '',
    onCustomStartChange: jest.fn(),
    onCustomEndChange: jest.fn(),
    type: '',
    onTypeChange: jest.fn(),
    categoryId: '',
    onCategoryIdChange: jest.fn(),
    accountId: '',
    onAccountIdChange: jest.fn(),
    includePrivate: 'all',
    onIncludePrivateChange: jest.fn(),
    categories,
    accounts,
    filtersOpen: true,
    onReset: jest.fn(),
    startDate: '',
    endDate: '',
    ...overrides,
  };
  return { ...render(<TransactionFilters {...props} />), props };
}

describe('TransactionFilters', () => {
  it('renders all filter sections', () => {
    renderFilters();
    expect(screen.getByText('Период')).toBeInTheDocument();
    expect(screen.getByText('Тип')).toBeInTheDocument();
    expect(screen.getByText('Категория')).toBeInTheDocument();
    expect(screen.getByText('Счёт')).toBeInTheDocument();
    expect(screen.getByText('Фильтр')).toBeInTheDocument();
    expect(screen.getByText('Сбросить все фильтры')).toBeInTheDocument();
  });

  it('calls onTypeChange when type filter changes', () => {
    const { props } = renderFilters();
    const selects = screen.getAllByRole('combobox');
    const typeSelect = selects[1];
    fireEvent.change(typeSelect, { target: { value: 'income' } });
    expect(props.onTypeChange).toHaveBeenCalledWith('income');
  });

  it('renders category options', () => {
    renderFilters();
    const selects = screen.getAllByRole('combobox');
    const catSelect = selects[2];
    const optionTexts = Array.from(catSelect.options).map(o => o.textContent);
    expect(optionTexts).toContain('Еда');
    expect(optionTexts).toContain('Транспорт');
  });

  it('calls onCategoryIdChange when category changes', () => {
    const { props } = renderFilters();
    const selects = screen.getAllByRole('combobox');
    const catSelect = selects[2];
    fireEvent.change(catSelect, { target: { value: '1' } });
    expect(props.onCategoryIdChange).toHaveBeenCalledWith('1');
  });

  it('shows custom date inputs when datePreset is custom', () => {
    renderFilters({ datePreset: 'custom' });
    expect(screen.getByText('Дата от')).toBeInTheDocument();
    expect(screen.getByText('Дата до')).toBeInTheDocument();
  });

  it('hides custom date inputs when datePreset is not custom', () => {
    renderFilters({ datePreset: 'month' });
    expect(screen.queryByText('Дата от')).not.toBeInTheDocument();
    expect(screen.queryByText('Дата до')).not.toBeInTheDocument();
  });

  it('calls onDatePresetChange when period changes', () => {
    const { props } = renderFilters();
    const selects = screen.getAllByRole('combobox');
    const periodSelect = selects[0];
    fireEvent.change(periodSelect, { target: { value: 'week' } });
    expect(props.onDatePresetChange).toHaveBeenCalledWith('week');
  });

  it('calls onReset when reset button clicked', () => {
    const { props } = renderFilters();
    fireEvent.click(screen.getByText('Сбросить все фильтры'));
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it('displays date range text when startDate and endDate provided', () => {
    renderFilters({ startDate: '2025-01-01', endDate: '2025-01-31' });
    expect(screen.getByText('2025-01-01 – 2025-01-31')).toBeInTheDocument();
  });

  it('shows filter not selected text when no dates', () => {
    renderFilters();
    expect(screen.getByText('Фильтр не выбран')).toBeInTheDocument();
  });

  it('calls onCustomStartChange and onCustomEndChange', () => {
    const { props } = renderFilters({ datePreset: 'custom' });
    const [startInput, endInput] = screen.getAllByDisplayValue('');
    fireEvent.change(startInput, { target: { value: '2025-01-01' } });
    fireEvent.change(endInput, { target: { value: '2025-01-15' } });
    expect(props.onCustomStartChange).toHaveBeenCalledWith('2025-01-01');
    expect(props.onCustomEndChange).toHaveBeenCalledWith('2025-01-15');
  });

  it('calls onIncludePrivateChange when private filter changes', () => {
    const { props } = renderFilters();
    const selects = screen.getAllByRole('combobox');
    const filterSelect = selects[4];
    fireEvent.change(filterSelect, { target: { value: 'my' } });
    expect(props.onIncludePrivateChange).toHaveBeenCalledWith('my');
  });
});
