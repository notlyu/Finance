import { render, screen } from '@testing-library/react';
import Card from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Content</p></Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(<Card><span>A</span><span>B</span></Card>);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<Card className="custom-card"><p>Content</p></Card>);
    expect(screen.getByText('Content').parentElement.className).toContain('custom-card');
  });

  it('applies default card class', () => {
    render(<Card><p>Content</p></Card>);
    expect(screen.getByText('Content').parentElement.className).toContain('card');
  });

  it('spreads additional props', () => {
    render(<Card data-testid="card-wrapper"><p>Content</p></Card>);
    expect(screen.getByTestId('card-wrapper')).toBeInTheDocument();
  });

  it('renders without children', () => {
    const { container } = render(<Card />);
    expect(container.firstChild.className).toContain('card');
  });
});
