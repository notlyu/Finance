import { render, screen } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders default title when not provided', () => {
    render(<EmptyState />);
    expect(screen.getByText('Нет данных')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Add some items to get started" />);
    expect(screen.getByText('Add some items to get started')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="Empty" action={<button>Add</button>} />);
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  it('does not render action when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(<EmptyState title="Empty" className="custom" />);
    expect(container.firstChild.className).toContain('custom');
  });
});
