import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select from './Select';

describe('Select', () => {
  it('renders a select element', () => {
    render(<Select><option>Option</option></Select>);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders children options', () => {
    render(
      <Select>
        <option value="1">One</option>
        <option value="2">Two</option>
      </Select>
    );
    expect(screen.getByRole('option', { name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Two' })).toBeInTheDocument();
  });

  it('applies select-ghost class by default', () => {
    render(<Select><option>Option</option></Select>);
    expect(screen.getByRole('combobox').className).toContain('select-ghost');
  });

  it('merges custom className', () => {
    render(<Select className="custom"><option>Option</option></Select>);
    expect(screen.getByRole('combobox').className).toContain('custom');
  });

  it('handles value and onChange', () => {
    const onChange = jest.fn();
    render(
      <Select value="1" onChange={onChange}>
        <option value="1">One</option>
        <option value="2">Two</option>
      </Select>
    );
    expect(screen.getByRole('combobox')).toHaveValue('1');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    render(<Select disabled><option>Option</option></Select>);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('renders placeholder option', () => {
    render(
      <Select>
        <option value="">Select...</option>
        <option value="1">One</option>
      </Select>
    );
    expect(screen.getByRole('option', { name: 'Select...' })).toBeInTheDocument();
  });

  it('spreads additional props', () => {
    render(<Select data-testid="my-select"><option>Option</option></Select>);
    expect(screen.getByTestId('my-select')).toBeInTheDocument();
  });
});
