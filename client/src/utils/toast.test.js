import React from 'react';
import { render, screen, act } from '@testing-library/react';
import {
  ToastContainer,
  showToast,
  hideToast,
  showError,
  showSuccess,
} from './toast';

// ---------------------------------------------------------------------------
// parseSource (tested through ToastItem / ToastContainer rendering)
// ---------------------------------------------------------------------------
describe('parseSource', () => {
  it('renders a badge for [Сеть] prefix (Cyrillic)', () => {
    render(<ToastContainer />);
    act(() => showError('[Сеть] Ошибка подключения'));
    expect(screen.getByText('Сеть')).toBeInTheDocument();
    expect(screen.getByText('Ошибка подключения')).toBeInTheDocument();
  });

  it('renders a badge for [Сервер 500] prefix (Cyrillic+digits)', () => {
    render(<ToastContainer />);
    act(() => showError('[Сервер 500] Внутренняя ошибка'));
    expect(screen.getByText('Сервер 500')).toBeInTheDocument();
    expect(screen.getByText('Внутренняя ошибка')).toBeInTheDocument();
  });

  it('renders a badge for [Сервер] prefix', () => {
    render(<ToastContainer />);
    act(() => showError('[Сервер] Таймаут'));
    expect(screen.getByText('Сервер')).toBeInTheDocument();
    expect(screen.getByText('Таймаут')).toBeInTheDocument();
  });

  it('does not render a badge for plain messages', () => {
    render(<ToastContainer />);
    act(() => showError('Произошла ошибка'));
    expect(screen.queryByText('Сеть')).not.toBeInTheDocument();
    expect(screen.queryByText('Сервер')).not.toBeInTheDocument();
    expect(screen.getByText('Произошла ошибка')).toBeInTheDocument();
  });

  it('handles Latin source prefix [Server]', () => {
    render(<ToastContainer />);
    act(() => showError('[Server] Connection lost'));
    expect(screen.getByText('Server')).toBeInTheDocument();
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
  });

  it('handles Latin source prefix [Server 500]', () => {
    render(<ToastContainer />);
    act(() => showError('[Server 500] Error'));
    expect(screen.getByText('Server 500')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('handles [Приложение] prefix (badge only for errors, but parse works)', () => {
    render(<ToastContainer />);
    act(() => showError('[Приложение] Обновление данных'));
    expect(screen.getByText('Приложение')).toBeInTheDocument();
    expect(screen.getByText('Обновление данных')).toBeInTheDocument();
  });

  it('handles source badge with trailing whitespace', () => {
    render(<ToastContainer />);
    act(() => showError('[Сеть]  Ошибка'));
    expect(screen.getByText('Сеть')).toBeInTheDocument();
    expect(screen.getByText('Ошибка')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// showToast / hideToast
// ---------------------------------------------------------------------------
describe('showToast / hideToast', () => {
  it('showToast returns an id', () => {
    const id = showToast('test');
    expect(id).toBeGreaterThan(0);
  });

  it('renders a toast in ToastContainer', () => {
    render(<ToastContainer />);
    act(() => showToast('Hello world'));
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('hides a toast when hideToast is called', () => {
    render(<ToastContainer />);
    let id;
    act(() => { id = showToast('Dismiss me'); });
    expect(screen.getByText('Dismiss me')).toBeInTheDocument();
    act(() => hideToast(id));
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
  });

  it('dismiss button removes the toast', () => {
    render(<ToastContainer />);
    act(() => showToast('Click dismiss'));
    const btn = screen.getByRole('button');
    act(() => btn.click());
    expect(screen.queryByText('Click dismiss')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Toast types
// ---------------------------------------------------------------------------
describe('toast types', () => {
  it('showError creates an error toast with error icon', () => {
    render(<ToastContainer />);
    act(() => showError('Error message'));
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('showSuccess creates a success toast with check_circle icon', () => {
    render(<ToastContainer />);
    act(() => showSuccess('Success!'));
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('check_circle')).toBeInTheDocument();
  });

});

// ---------------------------------------------------------------------------
// ToastContainer behavior
// ---------------------------------------------------------------------------
describe('ToastContainer behavior', () => {
  it('renders null when there are no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('renders info toasts with info icon', () => {
    render(<ToastContainer />);
    act(() => showToast('Info', 'info'));
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('info')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Auto-dismiss
// ---------------------------------------------------------------------------
describe('auto-dismiss', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('auto-dismisses non-error toasts after specified duration', () => {
    render(<ToastContainer />);
    act(() => showToast('Auto dismiss', 'info', 500));
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(500); });
    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
  });

  it('does not auto-dismiss error toasts (sticky)', () => {
    render(<ToastContainer />);
    act(() => showError('Sticky error'));
    expect(screen.getByText('Sticky error')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(10000); });
    expect(screen.getByText('Sticky error')).toBeInTheDocument();
  });

  it('showSuccess uses 3000ms duration', () => {
    render(<ToastContainer />);
    act(() => showSuccess('Quick success'));
    expect(screen.getByText('Quick success')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(3000); });
    expect(screen.queryByText('Quick success')).not.toBeInTheDocument();
  });
});
