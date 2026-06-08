import { render, screen } from '@testing-library/react';
import Widget from './Widget';

jest.mock('react-router-dom', () => ({
  useOutletContext: () => ({ selectedMember: null, currentUser: { id: 1 } }),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

describe('Widget', () => {
  const widget = {
    type: 'summary',
    def: { icon: 'account_balance', name: 'Сводка' },
  };

  const data = { available: 50000, income: 100000, expenses: 50000 };

  it('renders widget title and icon', () => {
    render(<Widget widget={widget} data={data} />);
    expect(screen.getByText('Сводка')).toBeInTheDocument();
    expect(screen.getByText('account_balance')).toBeInTheDocument();
  });

  it('renders children data for summary type', () => {
    render(<Widget widget={widget} data={data} />);
    const matches = screen.getAllByText(/50 000/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows loading skeleton when loading is true', () => {
    const { container } = render(<Widget widget={widget} loading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state when error is provided', () => {
    render(<Widget widget={widget} error="Ошибка загрузки" />);
    expect(screen.getByText('Ошибка загрузки')).toBeInTheDocument();
  });

  it('renders navigate link when onNavigate is provided', () => {
    render(<Widget widget={widget} data={data} onNavigate="/goals" />);
    const link = screen.getByText('Все');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/goals');
  });
});
