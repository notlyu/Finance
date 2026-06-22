import { useState, useEffect, useCallback } from 'react';

let toastId = 0;
const listeners = new Set();

export function showToast(message, type = 'info', duration = 4000) {
  const id = ++toastId;
  const sticky = type === 'error';
  const toast = { id, message, type, duration: sticky ? 0 : duration, sticky };
  listeners.forEach(fn => fn(toast));

  if (!sticky && duration > 0) {
    setTimeout(() => {
      hideToast(id);
    }, duration);
  }

  return id;
}

export function hideToast(id) {
  listeners.forEach(fn => fn({ id, type: 'hide' }));
}

export function showError(message) {
  return showToast(message, 'error', 0);
}

export function showSuccess(message) {
  return showToast(message, 'success', 3000);
}


const SOURCE_REGEX = /^\[([\wа-яА-ЯёЁ]+(?:\s+\d{3})?)\]\s*/;

function parseSource(message) {
  const match = message.match(SOURCE_REGEX);
  if (match) {
    return { badge: match[1], text: message.slice(match[0].length) };
  }
  return { badge: null, text: message };
}

const sourceBadgeStyles = {
  'Сеть': 'bg-error/20 text-error',
  'Сервер': 'bg-error/20 text-error',
  'Сервер 500': 'bg-error/20 text-error',
  'Сервер 502': 'bg-error/20 text-error',
  'Сервер 503': 'bg-error/20 text-error',
  'Приложение': 'bg-warning/20 text-warning',
};

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const handleToast = useCallback((toast) => {
    if (toast.type === 'hide') {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    } else {
      setToasts(prev => {
        if (prev.some(t => t.id === toast.id)) return prev;
        return [...prev, toast];
      });
    }
  }, []);

  useEffect(() => {
    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, [handleToast]);

  const dismiss = useCallback((id) => {
    hideToast(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, dismiss };
}

const toastStyles = {
  info: 'bg-surface-container-high text-on-surface border-outline',
  success: 'bg-success-container text-on-success-container border-success/30',
  error: 'bg-error-container text-on-error-container border-error/30',
  warning: 'bg-warning-container text-on-warning-container border-warning/30',
};

const iconMap = {
  info: 'info',
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
};

function ToastItem({ toast, onDismiss }) {
  const { badge, text } = parseSource(toast.message);
  const isError = toast.type === 'error';
  const badgeStyle = isError ? (sourceBadgeStyles[badge] || 'bg-error/20 text-error') : null;

  return (
    <div
      className={`px-4 py-3 rounded-xl shadow-lg border flex items-start gap-3 ${
        isError
          ? 'bg-error-container text-on-error-container border-error/30 min-w-[320px]'
          : toastStyles[toast.type] || toastStyles.info
      }`}
    >
      <span className="material-symbols-outlined text-lg mt-0.5 shrink-0">
        {isError ? 'error' : iconMap[toast.type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isError && badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${badgeStyle}`}>
              {badge}
            </span>
          )}
          <span className={`text-sm ${isError ? 'font-medium' : ''}`}>{text}</span>
        </div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-60 hover:opacity-100 transition-opacity shrink-0"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  const errorToasts = toasts.filter(t => t.type === 'error');
  const otherToasts = toasts.filter(t => t.type !== 'error');

  return (
    <>
      {/* Ошибки — сверху по центру, sticky */}
      {errorToasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 max-w-lg w-full px-4">
          {errorToasts.map(toast => (
            <div
              key={toast.id}
              className="animate-slide-in-down"
            >
              <ToastItem toast={toast} onDismiss={dismiss} />
            </div>
          ))}
        </div>
      )}
      {/* Остальные — снизу справа, с автозакрытием */}
      {otherToasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {otherToasts.map(toast => (
            <div
              key={toast.id}
              className="animate-slide-in"
            >
              <ToastItem toast={toast} onDismiss={dismiss} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
