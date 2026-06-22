import { useRef, useState } from 'react';
import { getCategoryIcon } from '../utils/categoryIcons';
import { formatMoney } from '../utils/format';
import { MASK_ICON, MASK_LABEL, MASK_DOTS, MASK_ACTION } from '../utils/masking';

function TransactionRow({ t, onDuplicate, onEdit, onDelete, selected, onToggleSelect }) {
  const swipeState = useRef({ startX: 0, isSwiping: false });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const SWIPE_THRESHOLD = 80;

  const handleTouchStart = (e) => { swipeState.current.startX = e.touches[0].clientX; swipeState.current.isSwiping = true; };
  const handleTouchMove = (e) => {
    if (!swipeState.current.isSwiping || t.is_hidden) return;
    const delta = e.touches[0].clientX - swipeState.current.startX;
    if (delta < 0) setSwipeOffset(Math.max(delta, -110));
  };
  const handleTouchEnd = () => {
    swipeState.current.isSwiping = false;
    if (swipeOffset < -SWIPE_THRESHOLD) onDelete(t.id);
    setSwipeOffset(0);
  };

  const iconCls = t.is_hidden
    ? 'bg-surface-container-high text-on-surface-variant'
    : t.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-on-surface-variant';
  const amountCls = t.is_hidden ? 'text-on-surface-variant' : t.type === 'income' ? 'text-secondary' : 'text-on-surface';

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 w-24 bg-error flex items-center justify-center rounded-2xl">
        <span className="material-symbols-outlined text-white text-xl">delete</span>
      </div>
      <div
        className={`group relative flex items-center gap-3 px-3 py-3 rounded-2xl border bg-surface-container-lowest transition-colors ${
          selected ? 'border-primary ring-1 ring-primary/40' : 'border-outline-variant/60 hover:bg-surface-container'
        }`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect && onToggleSelect(t.id)}
          className="w-4 h-4 shrink-0 rounded border-outline-variant text-primary focus:ring-primary"
        />
        <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${iconCls}`}>
          <span className="material-symbols-outlined text-lg">{t.is_hidden ? MASK_ICON : getCategoryIcon(t.category_name)}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-on-surface truncate">{t.is_hidden ? MASK_LABEL : t.category_name}</p>
          <p className="text-xs text-on-surface-variant truncate">
            {new Date(t.date).toLocaleDateString('ru-RU')}
            {t.account_name && ` · ${t.account_name}`}
            {t.user_name && ` · ${t.user_name}`}
          </p>
        </div>
        <span className={`text-sm font-bold font-headline shrink-0 ${amountCls}`}>
          {t.type === 'income' ? '+' : '−'}{t.is_hidden ? MASK_DOTS : formatMoney(t.amount)} ₽
        </span>
        {t.is_hidden ? (
          <span className="text-xs text-on-surface-variant px-1 shrink-0">{MASK_ACTION}</span>
        ) : (
          <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button onClick={() => onDuplicate(t)} title="Дублировать" className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">content_copy</span>
            </button>
            <button onClick={() => onEdit(t)} title="Изменить" className="w-8 h-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
            <button onClick={() => onDelete(t.id)} title="Удалить" className="w-8 h-8 flex items-center justify-center rounded-lg text-error hover:bg-error-container transition-colors">
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TransactionList({ transactions, hasMore, onLoadMore, onDuplicate, onEdit, onDelete, selectedIds = [], onToggleSelect, onSelectAll, onClearSelection }) {
  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;

  if (transactions.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant/60 p-10 rounded-2xl text-center">
        <span className="material-symbols-outlined text-4xl text-outline mb-2 block">receipt_long</span>
        <p className="text-on-surface-variant text-sm">Нет операций</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 pb-1">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = selectedIds.length > 0 && !allSelected; }}
          onChange={() => allSelected ? onClearSelection && onClearSelection() : onSelectAll && onSelectAll()}
          className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
        />
        <span className="text-xs text-on-surface-variant">
          {selectedIds.length > 0 ? `Выбрано: ${selectedIds.length}` : 'Выбрать все'}
        </span>
      </div>

      {transactions.map(t => (
        <TransactionRow
          key={t.id}
          t={t}
          onDuplicate={onDuplicate}
          onEdit={onEdit}
          onDelete={onDelete}
          selected={selectedIds.includes(t.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button onClick={onLoadMore} className="px-8 py-2.5 rounded-xl border border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container transition-colors">
            Загрузить ещё
          </button>
        </div>
      )}
    </div>
  );
}
