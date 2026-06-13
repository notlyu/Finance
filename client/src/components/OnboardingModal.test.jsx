import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingModal, { resetOnboarding } from './OnboardingModal';

describe('OnboardingModal', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders first slide when no localStorage completion', () => {
    render(<OnboardingModal />);
    expect(screen.getByText('Объедините финансы')).toBeInTheDocument();
    expect(screen.getByText('Далее')).toBeInTheDocument();
    expect(screen.getByText('Пропустить')).toBeInTheDocument();
  });

  it('navigates through all steps (incl. spaces slide T4.1)', () => {
    render(<OnboardingModal />);

    expect(screen.getByText('Объедините финансы')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Далее'));

    expect(screen.getByText('Личное и Семья')).toBeInTheDocument();
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
    fireEvent.click(screen.getByText('Далее'));

    const startBtn = screen.getByText('Начать');
    expect(startBtn).toBeInTheDocument();
    fireEvent.click(startBtn);

    expect(localStorage.getItem('onboarding_completed')).toBe('true');
    expect(localStorage.getItem('onboarding_completed_version')).toBe('2');
  });

  it('skips and marks completed when skip is clicked', () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByText('Пропустить'));
    expect(localStorage.getItem('onboarding_completed')).toBe('true');
  });

  it('does not render when already completed at current version', () => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_version', '2');
    const { container } = render(<OnboardingModal />);
    expect(container.innerHTML).toBe('');
  });

  it('re-shows after version bump (old version completed)', () => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_version', '1');
    render(<OnboardingModal />);
    expect(screen.getByText('Объедините финансы')).toBeInTheDocument();
  });

  it('shows Начать on last slide', () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByText('Далее'));
    fireEvent.click(screen.getByText('Далее'));
    fireEvent.click(screen.getByText('Далее'));
    expect(screen.getByText('Начать')).toBeInTheDocument();
    expect(screen.queryByText('Далее')).not.toBeInTheDocument();
  });
});
