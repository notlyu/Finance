import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

jest.mock('../utils/logger', () => ({
  force: { error: jest.fn() },
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const ThrowError = () => {
  throw new Error('Test error');
};

const ConditionalThrow = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div>Recovered content</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Попробовать снова')).toBeInTheDocument();
    expect(screen.getByText('На главную')).toBeInTheDocument();
  });

  it('resets error state on retry button click when error is resolved', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalThrow shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <ConditionalThrow shouldThrow={false} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Попробовать снова'));

    expect(screen.queryByText('Что-то пошло не так')).not.toBeInTheDocument();
    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });

  it('navigates to home on "На главную" click', () => {
    delete window.location;
    window.location = { href: '' };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('На главную'));
    expect(window.location.href).toBe('/');
  });

  it('shows stack trace in development mode', () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Показать подробности')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Показать подробности'));
    expect(screen.getByText('Скрыть подробности')).toBeInTheDocument();

    process.env.NODE_ENV = prevEnv;
  });
});
