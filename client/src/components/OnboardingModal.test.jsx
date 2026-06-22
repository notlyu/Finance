import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingModal from './OnboardingModal';

// Личный-только режим: 3 слайда (без «Личное и Семья»), версия '1'.
describe('OnboardingModal', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders first slide when no localStorage completion', () => {
    render(<OnboardingModal />);
    expect(screen.getByText('Все финансы в одном месте')).toBeInTheDocument();
    expect(screen.getByText('Далее')).toBeInTheDocument();
    expect(screen.getByText('Пропустить')).toBeInTheDocument();
  });

  it('navigates through all steps (no spaces slide in personal-only)', () => {
    render(<OnboardingModal />);

    expect(screen.getByText('Все финансы в одном месте')).toBeInTheDocument();
    expect(screen.queryByText('Личное и Семья')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Далее'));

    expect(screen.getByText('Накопления и цели')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Далее'));

    expect(screen.getByText('Подушка безопасности')).toBeInTheDocument();
  });

  it('marks localStorage as complete and closes on final step', () => {
    render(<OnboardingModal />);
    expect(localStorage.getItem('onboarding_completed')).not.toBe('true');

    fireEvent.click(screen.getByText('Далее'));
    fireEvent.click(screen.getByText('Далее'));

    const startBtn = screen.getByText('Начать');
    expect(startBtn).toBeInTheDocument();
    fireEvent.click(startBtn);

    expect(localStorage.getItem('onboarding_completed')).toBe('true');
    expect(localStorage.getItem('onboarding_completed_version')).toBe('1');
  });

  it('skips and marks completed when skip is clicked', () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByText('Пропустить'));
    expect(localStorage.getItem('onboarding_completed')).toBe('true');
  });

  it('does not render when already completed at current version', () => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_version', '1');
    const { container } = render(<OnboardingModal />);
    expect(container.innerHTML).toBe('');
  });

  it('re-shows when completed at an older version', () => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_version', '0');
    render(<OnboardingModal />);
    expect(screen.getByText('Все финансы в одном месте')).toBeInTheDocument();
  });

  it('shows Начать on last slide', () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByText('Далее'));
    fireEvent.click(screen.getByText('Далее'));
    expect(screen.getByText('Начать')).toBeInTheDocument();
    expect(screen.queryByText('Далее')).not.toBeInTheDocument();
  });
});
