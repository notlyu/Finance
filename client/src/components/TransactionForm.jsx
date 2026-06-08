import Modal from './Modal';
import FormattedInput from './ui/FormattedInput';
import Toggle from './ui/Toggle';

export default function TransactionForm({
  isOpen, onClose, editingId, categories, accounts, space, hasFamily,
  register, handleSubmit, onSubmit, watch, setValue, reset,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingId ? 'Редактировать операцию' : 'Добавить операцию'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Large Amount Input */}
        <div className="relative">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Сумма</label>
          <div className="relative">
            <FormattedInput
              value={watch('amount') || ''}
              onChange={(v) => setValue('amount', v)}
              className="w-full py-5 px-6 bg-surface-container-low border-2 border-transparent rounded-3xl text-3xl font-extrabold text-on-surface outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-outline/40"
              placeholder="0"
              min={1}
              max={999999999}
              label="Сумма"
              showValidation={true}
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-on-surface-variant">₽</span>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 ml-1">
            Максимальная сумма: 999 999 999 ₽
          </p>
        </div>

        {/* Segmented Toggle: Income/Expense */}
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Тип</label>
          <div className="flex bg-surface-container p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setValue('type', 'expense')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
                watch('type') === 'expense'
                  ? 'bg-error-container text-on-error-container shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-sm">trending_down</span>
              Расход
            </button>
            <button
              type="button"
              onClick={() => setValue('type', 'income')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
                watch('type') === 'income'
                  ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-sm">trending_up</span>
              Доход
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Категория</label>
            <select {...register('category_id', { required: true })} className="select-ghost">
              <option value="">Выберите</option>
              {categories.filter(c => c.type === watch('type')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Дата</label>
            <input type="date" {...register('date', { required: true })} className="select-ghost" />
          </div>
        </div>
        {accounts.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Счет</label>
            <select {...register('account_id')} className="select-ghost">
              <option value="">Выберите счет</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Комментарий</label>
          <textarea {...register('comment')} rows="2" className="input-ghost" placeholder="Необязательно" />
        </div>
        <div className="flex items-center justify-between p-4 bg-surface-container rounded-3xl">
          <div>
            <span className="text-sm font-semibold text-on-surface">🔒 Скрытая операция</span>
            <p className="text-xs text-on-surface-variant">Операция будет видна только вам (другие участники увидят «Сюрприз» вместо суммы)</p>
          </div>
          <Toggle checked={watch('scope') === 'personal'} onChange={() => setValue('scope', watch('scope') === 'personal' ? 'family' : 'personal')} />
        </div>
        {space !== 'personal' && hasFamily && (
          <div className="flex items-center justify-between p-4 bg-surface-container rounded-3xl">
            <div>
              <span className="text-sm font-semibold text-on-surface">👥 Тип операции</span>
              <p className="text-xs text-on-surface-variant">
                {watch('scope') === 'personal'
                  ? 'Личная операция — только ваша, не учитывается в семейном бюджете'
                  : 'Семейная операция — видна всем участникам, учитывается в общем бюджете'}
              </p>
            </div>
            <Toggle checked={watch('scope') === 'personal'} onChange={() => setValue('scope', watch('scope') === 'personal' ? 'family' : 'personal')} />
          </div>
        )}
        {hasFamily && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container p-3 rounded-xl">
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            <span>Переключатель «Личное/Семья» влияет только на видимость. Для сокрытия суммы от других участников используйте переключатель «Скрытая операция».</span>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost px-6 py-3">Отмена</button>
          <button type="submit" className="btn-primary px-8 py-3">
            {editingId ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
