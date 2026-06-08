import { render, screen, fireEvent } from '@testing-library/react';
import ForecastModal from './ForecastModal';

describe('ForecastModal', () => {
  const onClose = jest.fn();
  const goal = {
    id: 1,
    name: 'Машина',
    target_amount: 1000000,
    current_amount: 200000,
    interest_rate: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders goal forecast data when open', () => {
    render(<ForecastModal goal={goal} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Прогноз: Машина')).toBeInTheDocument();
    expect(screen.getByText(/1 000 000/)).toBeInTheDocument();
    expect(screen.getByText(/200 000/)).toBeInTheDocument();
    expect(screen.getAllByText(/800 000/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders close button and calls onClose when backdrop clicked', () => {
    render(<ForecastModal goal={goal} isOpen={true} onClose={onClose} />);
    const backdrop = document.querySelector('[class*="bg-black"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders mode switcher buttons', () => {
    render(<ForecastModal goal={goal} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Через сколько?')).toBeInTheDocument();
    expect(screen.getByText('Сколько платить?')).toBeInTheDocument();
  });

  it('returns null when goal is falsy', () => {
    const { container } = render(<ForecastModal goal={null} isOpen={true} onClose={onClose} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(<ForecastModal goal={goal} isOpen={false} onClose={onClose} />);
    expect(container.innerHTML).toBe('');
  });
});
