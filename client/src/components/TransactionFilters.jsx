import { flags } from '../config/flags';

export default function TransactionFilters({
  datePreset, onDatePresetChange,
  customStart, customEnd, onCustomStartChange, onCustomEndChange,
  type, onTypeChange,
  categoryId, onCategoryIdChange,
  accountId, onAccountIdChange,
  includePrivate, onIncludePrivateChange,
  categories,
  accounts,
  filtersOpen,
  onReset,
  startDate, endDate,
}) {
  return (
    <div className={`bg-surface-container p-6 rounded-3xl transition-all ${filtersOpen ? '' : 'hidden sm:block'}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Период</label>
          <select
            value={datePreset}
            onChange={(e) => onDatePresetChange(e.target.value)}
            className="select-ghost"
          >
            <option value="today">Сегодня</option>
            <option value="yesterday">Вчера</option>
            <option value="week">Эта неделя</option>
            <option value="month">Этот месяц</option>
            <option value="custom">Произвольный</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Тип</label>
          <select
            value={type}
            onChange={e => onTypeChange(e.target.value)}
            className="select-ghost"
          >
            <option value="">Все типы</option>
            <option value="income">Доходы</option>
            <option value="expense">Расходы</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Категория</label>
          <select
            value={categoryId}
            onChange={e => onCategoryIdChange(e.target.value)}
            className="select-ghost"
          >
            <option value="">Все категории</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Счёт</label>
          <select
            value={accountId}
            onChange={e => onAccountIdChange(e.target.value)}
            className="select-ghost"
          >
            <option value="">Все счета</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {flags.familyEnabled && (
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Фильтр</label>
            <select
              value={includePrivate}
              onChange={e => onIncludePrivateChange(e.target.value)}
              className="select-ghost"
            >
              <option value="all">Все операции</option>
              <option value="my">Только мои</option>
              <option value="family">Семейные</option>
            </select>
          </div>
        )}
      </div>

      {datePreset === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Дата от</label>
            <input type="date" value={customStart} onChange={e => onCustomStartChange(e.target.value)} className="select-ghost" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Дата до</label>
            <input type="date" value={customEnd} onChange={e => onCustomEndChange(e.target.value)} className="select-ghost" />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button onClick={onReset} className="text-sm text-primary font-semibold hover:opacity-80 transition-colors">
          Сбросить все фильтры
        </button>
        <div className="text-xs text-on-surface-variant font-medium">
          {startDate && endDate
            ? `${startDate} – ${endDate}`
            : 'Фильтр не выбран'}
        </div>
      </div>
    </div>
  );
}
