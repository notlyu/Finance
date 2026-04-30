import PropTypes from 'prop-types';

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, variant, loading }) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-error text-white',
    warning: 'bg-warning text-white',
    primary: 'bg-primary text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-bold text-on-surface mb-2">{title}</h3>
        <p className="text-on-surface-variant text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface font-semibold hover:bg-surface-container transition-colors">
            {cancelText}
          </button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 px-4 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity ${variantStyles[variant]}`}>
            {loading ? '...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  variant: PropTypes.oneOf(['danger', 'warning', 'primary']),
  loading: PropTypes.bool,
};

ConfirmModal.defaultProps = {
  title: 'Подтверждение',
  confirmText: 'Подтвердить',
  cancelText: 'Отмена',
  variant: 'danger',
  loading: false,
};

export default ConfirmModal;
