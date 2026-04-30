import { useState, useEffect, useCallback } from 'react';

let toastId = 0;
const listeners = new Set();

export function showToast(message, type = 'info', duration = 4000) {
  const id = ++toastId;
  const toast = { id, message, type, duration };
  listeners.forEach(fn => fn(toast));
  
  if (duration > 0) {
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
  return showToast(message, 'error', 5000);
}

export function showSuccess(message) {
  return showToast(message, 'success', 3000);
}

export function showWarning(message) {
  return showToast(message, 'warning', 4000);
}

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

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-lg border animate-slide-in flex items-start gap-3 ${toastStyles[toast.type] || toastStyles.info}`}
        >
          <span className="material-symbols-outlined text-lg mt-0.5">{iconMap[toast.type]}</span>
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => dismiss(toast.id)}
            className="opacity-60 hover:opacity-100 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
