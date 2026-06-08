import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';

describe('Input', () => {
  const getInput = (container) => container.querySelector('input');

  it('renders an input element', () => {
    const { container } = render(<Input />);
    expect(getInput(container)).toBeInTheDocument();
  });

  it('applies input-ghost class by default', () => {
    const { container } = render(<Input />);
    expect(getInput(container).className).toContain('input-ghost');
  });

  it('merges custom className', () => {
    const { container } = render(<Input className="custom" />);
    expect(getInput(container).className).toContain('custom');
  });

  it('handles value and onChange', () => {
    const onChange = jest.fn();
    const { container } = render(<Input value="hello" onChange={onChange} />);
    expect(getInput(container)).toHaveValue('hello');
    fireEvent.change(getInput(container), { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    const { container } = render(<Input disabled />);
    expect(getInput(container)).toBeDisabled();
  });

  it('supports different type variants', () => {
    const { container, rerender } = render(<Input type="text" />);
    expect(getInput(container)).toHaveAttribute('type', 'text');
    rerender(<Input type="number" />);
    expect(getInput(container)).toHaveAttribute('type', 'number');
    rerender(<Input type="email" />);
    expect(getInput(container)).toHaveAttribute('type', 'email');
    rerender(<Input type="password" />);
    expect(getInput(container)).toHaveAttribute('type', 'password');
  });

  it('spreads additional props', () => {
    render(<Input placeholder="Enter name" data-testid="my-input" />);
    expect(screen.getByTestId('my-input')).toHaveAttribute('placeholder', 'Enter name');
  });
});
