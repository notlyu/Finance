import { useRef, useState } from 'react';
import { getCategoryIcon } from '../utils/categoryIcons';
import { formatMoney } from '../utils/format';
import { MASK_ICON, MASK_LABEL, MASK_DOTS, MASK_ACTION } from '../utils/masking';

function TransactionCard({ t, onDuplicate, onEdit, onDelete, selected, onToggleSelect }) {
  const cardRef = useRef(null);
  const swipeState = useRef({ startX: 0, currentX: 0, isSwiping: false });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const SWIPE_THRESHOLD = 80;

  const handleTouchStart = (e) => {
    swipeState.current.startX = e.touches[0].clientX;
    swipeState.current.isSwiping = true;
  };

  const handleTouchMove = (e) => {
    if (!swipeState.current.isSwiping) return;
    const delta = e.touches[0].clientX - swipeState.current.startX;
    if (delta < 0) {
      setSwipeOffset(Math.max(delta, -120));
    }
  };

  const handleTouchEnd = () => {
    swipeState.current.isSwiping = false;
    if (swipeOffset < -SWIPE_THRESHOLD) {
      onDelete(t.id);
    }
    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div
        ref={cardRef}
        className="absolute inset-y-0 right-0 w-24 bg-error flex items-center justify-center rounded-3xl"
      >
        <span className="material-symbols-outlined text-white text-2xl">delete</span>
      </div>
      <div
        className={`relative bg-surface-container-lowest shadow-card p-5 rounded-3xl transition-transform duration-200 ${
          selected ? 'ring-2 ring-primary' : ''
        }`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <label className="flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(t.id)}
              className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
            />
          </label>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            t.is_hidden ? 'bg-surface-container-high text-outline' :
            t.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-primary'
          }`}>
            <span className="material-symbols-outlined">
              {t.is_hidden ? MASK_ICON : getCategoryIcon(t.category_name)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-on-surface text-sm truncate">
              {t.is_hidden ? MASK_LABEL : t.category_name}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {new Date(t.date).toLocaleDateString('ru-RU')} • {t.user_name}
              {t.account_name && ` • ${t.account_name}`}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold font-headline ${t.type === 'income' ? 'text-secondary' : 'text-on-surface'}`}>
            {t.type === 'income' ? '+' : '-'}{t.is_hidden ? MASK_DOTS : formatMoney(t.amount)} ₽
          </p>
        </div>
      </div>
      {t.comment && !t.is_hidden && (
        <p className="text-sm text-on-surface-variant mt-3">{t.comment}</p>
      )}
      {!t.is_hidden && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <button onClick={() => onDuplicate(t)} title="Дублировать" className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant bg-surface-container hover:bg-surface-container-high hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-lg">content_copy</span>
          </button>
          <button onClick={() => onEdit(t)} title="Изменить" className="w-10 h-10 flex items-center justify-center rounded-xl text-primary bg-primary/5 hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
          <button onClick={() => onDelete(t.id)} title="Удалить" className="w-10 h-10 flex items-center justify-center rounded-xl text-error bg-error-container hover:opacity-90 transition-colors">
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

function TransactionRow({ t, index, onDuplicate, onEdit, onDelete, selected, onToggleSelect }) {
  return (
    <tr className={`transition-colors hover:bg-surface-container ${index % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(t.id)}
          className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">{new Date(t.date).toLocaleDateString('ru-RU')}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            t.is_hidden ? 'bg-surface-container-high text-outline' :
            t.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
          }`}>
            <span className="material-symbols-outlined text-sm">
              {t.is_hidden ? MASK_ICON : getCategoryIcon(t.category_name)}
            </span>
          </div>
          <span className="text-sm font-semibold text-on-surface">
            {t.is_hidden ? MASK_LABEL : t.category_name}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">
        {t.account_name || '—'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`font-bold font-headline ${t.type === 'income' ? 'text-secondary' : 'text-on-surface'}`}>
          {t.type === 'income' ? '+' : '-'}{t.is_hidden ? MASK_DOTS : formatMoney(t.amount)} ₽
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant max-w-48 truncate">{t.comment || '—'}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">{t.user_name}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1">
          {t.is_hidden ? (
            <span className="text-xs text-on-surface-variant px-2">{MASK_ACTION}</span>
          ) : (
            <>
              <button onClick={() => onDuplicate(t)} title="Дублировать" className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
              <button onClick={() => onEdit(t)} title="Редактировать" className="w-9 h-9 flex items-center justify-center rounded-xl text-primary hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
              <button onClick={() => onDelete(t.id)} title="Удалить" className="w-9 h-9 flex items-center justify-center rounded-xl text-error hover:bg-error-container transition-colors">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function TransactionList({ transactions, hasMore, onLoadMore, onDuplicate, onEdit, onDelete, selectedIds = [], onToggleSelect, onSelectAll, onClearSelection }) {
  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;

  return (
    <>
      {/* Mobile Cards */}
      <div className="sm:hidden space-y-4">
        {transactions.map(t => (
          <TransactionCard key={t.id} t={t} onDuplicate={onDuplicate} onEdit={onEdit} onDelete={onDelete} selected={selectedIds.includes(t.id)} onToggleSelect={onToggleSelect} />
        ))}
        {transactions.length === 0 && (
          <div className="bg-surface-container-lowest p-8 rounded-3xl text-center">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">receipt_long</span>
            <p className="text-on-surface-variant text-sm">Нет операций</p>
          </div>
        )}
        {hasMore && (
          <button onClick={onLoadMore} className="w-full py-3.5 rounded-3xl border-2 border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container transition-colors">
            Загрузить ещё
          </button>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-surface-container-lowest rounded-3xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = selectedIds.length > 0 && !allSelected; }}
                    onChange={() => allSelected ? onClearSelection() : onSelectAll()}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Дата</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Категория</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Счет</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Сумма</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Комментарий</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Автор</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-on-surface-variant uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <TransactionRow key={t.id} t={t} index={i} onDuplicate={onDuplicate} onEdit={onEdit} onDelete={onDelete} selected={selectedIds.includes(t.id)} onToggleSelect={onToggleSelect} />
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline mb-2">receipt_long</span>
                    <p className="text-on-surface-variant text-sm">Нет операций</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="hidden sm:flex justify-center">
          <button onClick={onLoadMore} className="px-8 py-3 rounded-3xl border-2 border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container transition-colors">
            Загрузить ещё
          </button>
        </div>
      )}
    </>
  );
}