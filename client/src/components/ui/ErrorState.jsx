/**
 * ErrorState — компонент состояния ошибки.
 * Отображается когда загрузка данных провалилась.
 * Поддерживает кнопку повторной попытки.
 */
export default function ErrorState({ message, onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <span className="material-symbols-outlined text-5xl text-error mb-4">error_outline</span>
      <p className="text-base font-semibold text-on-surface mb-1">
        Не удалось загрузить данные
      </p>
      <p className="text-sm text-on-surface-variant mb-6 max-w-xs">
        {message || 'Проверьте подключение к сети и попробуйте ещё раз'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Повторить
        </button>
      )}
    </div>
  );
}
