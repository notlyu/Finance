import { render, screen, fireEvent } from '@testing-library/react';
import WidgetCard from './WidgetCard';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

describe('WidgetCard', () => {
  const def = { id: 'allocation', icon: 'donut_large', name: 'Распределение' };
  const widget = { type: 'allocation', id: 'w1' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders widget name and icon', () => {
    render(<WidgetCard widget={widget} def={def} space="personal" />);
    expect(screen.getByText('Распределение')).toBeInTheDocument();
    expect(screen.getByText('donut_large')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    const { container } = render(<WidgetCard widget={widget} def={def} loading={true} space="personal" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders allocation data', () => {
    const data = { allocation: [{ name: 'Еда', color: '#f00', pct: 40 }] };
    render(<WidgetCard widget={widget} def={def} data={data} space="personal" />);
    expect(screen.getByText('Еда')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('calls onRemove when close button clicked', () => {
    const onRemove = jest.fn();
    const { container } = render(
      <WidgetCard widget={widget} def={def} onRemove={onRemove} space="personal" />
    );
    const closeBtn = container.querySelector('[title="Удалить виджет"]');
    fireEvent.click(closeBtn);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders navigate link when navigateTo is provided', () => {
    render(<WidgetCard widget={widget} def={def} navigateTo="goals" space="family" />);
    const link = screen.getByText('Подробнее');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/family/goals');
  });

  it('renders personal path for space=personal', () => {
    render(<WidgetCard widget={widget} def={def} navigateTo="goals" space="personal" />);
    expect(screen.getByText('Подробнее').closest('a')).toHaveAttribute('href', '/personal/goals');
  });
});
