import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormattedInput from './FormattedInput';

describe('FormattedInput', () => {
  it('renders an input with text type and decimal inputMode', () => {
    render(<FormattedInput value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputMode', 'decimal');
  });

  it('displays formatted value', () => {
    render(<FormattedInput value="1000" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('1\u00a0000');
  });

  it('displays empty when value is empty string', () => {
    render(<FormattedInput value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('displays empty when value is undefined', () => {
    render(<FormattedInput onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('shows placeholder', () => {
    render(<FormattedInput value="" onChange={() => {}} placeholder="Enter amount" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Enter amount');
  });

  it('calls onChange with cleaned value when typing digits', () => {
    const onChange = jest.fn();
    render(<FormattedInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '123' } });
    expect(onChange).toHaveBeenCalledWith('123');
  });

  it('rejects non-numeric input', () => {
    const onChange = jest.fn();
    render(<FormattedInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalledWith('abc');
  });

  it('allows decimal dot', () => {
    const onChange = jest.fn();
    render(<FormattedInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '123.45' } });
    expect(onChange).toHaveBeenCalledWith('123.45');
  });

  it('allows decimal comma and converts to dot', () => {
    const onChange = jest.fn();
    render(<FormattedInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '123,45' } });
    expect(onChange).toHaveBeenCalledWith('123.45');
  });

  it('shows validation error when value < min after blur', () => {
    const onChange = jest.fn();
    render(<FormattedInput value="5" onChange={onChange} min={10} />);
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    expect(screen.getByText(/минимум/i)).toBeInTheDocument();
  });

  it('shows validation error when value > max after blur', () => {
    const onChange = jest.fn();
    render(<FormattedInput value="100" onChange={onChange} max={50} />);
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    expect(screen.getByText(/максимум/i)).toBeInTheDocument();
  });

  it('does not show validation before blur', () => {
    const onChange = jest.fn();
    render(<FormattedInput value="5" onChange={onChange} min={10} />);
    expect(screen.queryByText(/минимум/i)).not.toBeInTheDocument();
  });

  it('hides validation when showValidation is false', () => {
    const onChange = jest.fn();
    render(<FormattedInput value="5" onChange={onChange} min={10} showValidation={false} />);
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    expect(screen.queryByText(/минимум/i)).not.toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<FormattedInput value="" onChange={() => {}} className="custom" />);
    expect(screen.getByRole('textbox').className).toContain('custom');
  });
});
