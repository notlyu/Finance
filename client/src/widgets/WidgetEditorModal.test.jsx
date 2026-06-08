import { render, screen, fireEvent } from '@testing-library/react';
import WidgetEditorModal from './WidgetEditorModal';

describe('WidgetEditorModal', () => {
  const onClose = jest.fn();
  const onSave = jest.fn();
  const widgetConfig = [
    { id: 'w1', type: 'allocation', order: 0 },
    { id: 'w2', type: 'transactions', order: 1 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not open', () => {
    const { container } = render(
      <WidgetEditorModal isOpen={false} onClose={onClose} widgetConfig={widgetConfig} onSave={onSave} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders active and available widget sections', () => {
    render(
      <WidgetEditorModal isOpen={true} onClose={onClose} widgetConfig={widgetConfig} onSave={onSave} />
    );
    expect(screen.getByText('Настройка виджетов')).toBeInTheDocument();
    expect(screen.getByText('Активные виджеты')).toBeInTheDocument();
    expect(screen.getByText('Доступные виджеты')).toBeInTheDocument();
  });

  it('renders active widget names', () => {
    render(
      <WidgetEditorModal isOpen={true} onClose={onClose} widgetConfig={widgetConfig} onSave={onSave} />
    );
    expect(screen.getAllByText('Распределение').length).toBe(2);
    expect(screen.getAllByText('Последние операции').length).toBe(2);
  });

  it('shows empty state when no active widgets', () => {
    render(
      <WidgetEditorModal isOpen={true} onClose={onClose} widgetConfig={[]} onSave={onSave} />
    );
    expect(screen.getByText('Нет активных виджетов')).toBeInTheDocument();
  });

  it('calls onClose when cancel clicked', () => {
    render(
      <WidgetEditorModal isOpen={true} onClose={onClose} widgetConfig={widgetConfig} onSave={onSave} />
    );
    fireEvent.click(screen.getByText('Отмена'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with re-ordered config and onClose', () => {
    render(
      <WidgetEditorModal isOpen={true} onClose={onClose} widgetConfig={widgetConfig} onSave={onSave} />
    );
    fireEvent.click(screen.getByText('Сохранить'));
    expect(onSave).toHaveBeenCalled();
    const savedConfig = onSave.mock.calls[0][0];
    expect(savedConfig).toHaveLength(2);
    expect(savedConfig[0].order).toBe(0);
    expect(savedConfig[1].order).toBe(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filters family-only widgets when isFamily is false', () => {
    render(
      <WidgetEditorModal isOpen={true} onClose={onClose} widgetConfig={[]} onSave={onSave} isFamily={false} />
    );
    expect(screen.queryByText('Участники')).not.toBeInTheDocument();
  });

  it('includes family-only widgets when isFamily is true', () => {
    render(
      <WidgetEditorModal isOpen={true} onClose={onClose} widgetConfig={[]} onSave={onSave} isFamily={true} />
    );
    expect(screen.getByText('Участники')).toBeInTheDocument();
  });
});
