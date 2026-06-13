import Modal from './Modal';
import FormattedInput from './ui/FormattedInput';

export default function TransactionForm({
  isOpen, onClose, editingId, categories, accounts, space, hasFamily,
  register, handleSubmit, onSubmit, watch, setValue, reset,
}) {
  // §4.2: с семейного счёта операцию нельзя сделать личной/скрытой — чип «Личное» блокируется.
  const selectedAccount = accounts.find(a => String(a.id) === String(watch('account_id')));
  const isFamilyAccount = selectedAccount?.scope === 'family';
  const effectiveScope = isFamilyAccount ? 'family' : watch('scope');
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
            <select
              {...register('account_id', {
                onChange: (e) => {
                  // Счёт задаёт scope (ТЗ §5). Семейный счёт — всегда «Семья» (§4.2),
                  // с личного можно вручную переключить на «Семья» чипом.
                  const acc = accounts.find(a => String(a.id) === String(e.target.value));
                  if (acc?.scope) setValue('scope', acc.scope);
                },
              })}
              className="select-ghost"
            >
              <option value="">Выберите счет</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Комментарий</label>
          <textarea {...register('comment')} rows="2" className="input-ghost" placeholder="Необязательно" />
        </div>
        {/* Scope-чипы (личное = скрыто от партнёра, семейное = общий бюджет).
            Только для участника семьи. С семейного счёта «Личное» недоступно (§4.2). */}
        {hasFamily && (
          <div className="p-4 bg-surface-container rounded-3xl space-y-3">
            <span className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">Кто видит операцию</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isFamilyAccount}
                onClick={() => setValue('scope', 'personal')}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  effectiveScope === 'personal'
                    ? 'bg-primary text-white'
                    : isFamilyAccount
                      ? 'bg-surface-container-low text-outline opacity-50 cursor-not-allowed'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                🔒 Личное
              </button>
              <button
                type="button"
                onClick={() => setValue('scope', 'family')}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  effectiveScope === 'family'
                    ? 'bg-secondary text-white'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                👥 Семья
              </button>
            </div>
            <p className="text-xs text-on-surface-variant ml-1">
              {isFamilyAccount
                ? 'Трата с общего счёта всегда видна семье'
                : effectiveScope === 'personal'
                  ? 'Видна только вам — партнёр увидит «🔒 Сюрприз» вместо суммы'
                  : 'Видна всем участникам и входит в общий семейный бюджет'}
            </p>
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
