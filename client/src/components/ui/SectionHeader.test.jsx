import { render, screen } from '@testing-library/react';
import SectionHeader from './SectionHeader';

describe('SectionHeader', () => {
  it('renders the title', () => {
    render(<SectionHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<SectionHeader title="Dashboard" subtitle="Your overview" />);
    expect(screen.getByText('Your overview')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<SectionHeader title="Dashboard" />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('renders right action when provided', () => {
    render(<SectionHeader title="Dashboard" right={<button>Edit</button>} />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('does not render right action when not provided', () => {
    render(<SectionHeader title="Dashboard" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders title as h1', () => {
    render(<SectionHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
  });

  it('merges custom className', () => {
    const { container } = render(<SectionHeader title="Dashboard" className="custom" />);
    expect(container.firstChild.className).toContain('custom');
  });
});
