import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import FormattedInput from './ui/FormattedInput';
import { formatMoney } from '../utils/format';
import api from '../services/api';
import logger from '../utils/logger';
import Toggle from './ui/Toggle';

export default function WishesSection({ wishes, showArchived, categories, accounts, todayStr, onRefresh }) {
  const activeWishes = useMemo(() => wishes.filter(w => !w.archived && w.status !== 'completed'), [wishes]);
  const archivedWishes = useMemo(() => wishes.filter(w => w.archived || w.status === 'completed'), [wishes]);

  const [wishModalOpen, setWishModalOpen] = useState(false);
  const [editingWishId, setEditingWishId] = useState(null);
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [fundWish, setFundWish] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundAvailable, setFundAvailable] = useState(0);
  const [fundAccountId, setFundAccountId] = useState('');
  const [fundWarning, setFundWarning] = useState(null);
  const [fundLoading, setFundLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, title: '', message: '', variant: 'danger', confirmText: '' });
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const fundOptions = useMemo(() => {
    if (!fundWish) return [];
    const remaining = Math.max(0, Number(fundWish.cost) - Number(fundWish.saved_amount));
    return [
      { label: 'Полностью', value: remaining, accent: true },
      { label: '1/2', value: Math.round(remaining * 0.5 * 100) / 100 },
      { label: '1/3', value: Math.round(remaining / 3 * 100) / 100 },
      { label: '2/3', value: Math.round(remaining * 2 / 3 * 100) / 100 },
      { label: '1/4', value: Math.round(remaining * 0.25 * 100) / 100 },
      { label: '3/4', value: Math.round(remaining * 0.75 * 100) / 100 },
    ].filter(o => o.value > 0);
  }, [fundWish]);

  const handleWishSubmit = async (data) => {
    try {
      const payload = { ...data, category_id: data.category_id ? Number(data.category_id) : undefined, created_at: todayStr };
      payload.visibility = data.scope === 'personal' ? 'personal' : 'family';
      if (editingWishId) { await api.patch(`/wishes/${editingWishId}`, payload); }
      else { await api.post('/wishes', payload); }
      setWishModalOpen(false); reset(); setEditingWishId(null); onRefresh();
    } catch (err) { logger.error(err); }
  };

  const handleEditWish = (wish) => {
    setEditingWishId(wish.id);
    setValue('name', wish.name); setValue('cost', wish.cost); setValue('priority', wish.priority);
    setValue('status', wish.status); setValue('saved_amount', wish.saved_amount);
    setValue('scope', wish.visibility === 'personal' ? 'personal' : 'family'); setValue('category_id', wish.category_id);
    setWishModalOpen(true);
  };

  const handleArchiveWish = (id) => {
    setConfirmModal({
      open: true, variant: 'warning', title: 'Архивировать желание?',
      message: 'Желание будет перемещено в архив.', confirmText: 'Архивировать',
      onConfirm: async () => {
        try { await api.patch(`/wishes/${id}`, { archived: true }); onRefresh(); }
        catch (err) { logger.error(err); }
      }
    });
  };

  const handleDeleteWish = (id) => {
    setConfirmModal({
      open: true, variant: 'danger', title: 'Удалить желание навсегда?',
      message: 'Это действие нельзя отменить.', confirmText: 'Удалить',
      onConfirm: async () => {
        try { await api.delete(`/wishes/${id}`); onRefresh(); }
        catch (err) { logger.error(err); }
      }
    });
  };

  const handleOpenFund = async (wish) => {
    setFundWish(wish); setFundAmount(''); setFundWarning(null); setFundAccountId(''); setFundModalOpen(true);
    try {
      const dashRes = await api.get('/dashboard');
      setFundAvailable(dashRes.data.family ? dashRes.data.family.available : dashRes.data.personal.available);
    } catch (err) { logger.error(err); setFundAvailable(0); }
  };

  const restoreWish = async (id) => {
    try { await api.patch(`/wishes/${id}`, { archived: false, status: 'active' }); onRefresh(); } catch (err) { logger.error(err); }
  };

  const handleFund = async (amount, skipWarning = false) => {
    if (!fundWish || !amount || amount <= 0 || fundLoading) return;
    setFundLoading(true);
    try {
      const res = await api.post(`/wishes/${fundWish.id}/fund`, { amount: Number(amount), skipWarning, account_id: fundAccountId || undefined });
      if (res.data.warning && !skipWarning) {
        setFundWarning(res.data.warning);
        return;
      }
      setFundModalOpen(false); setFundWish(null); setFundWarning(null); onRefresh();
    } catch (err) { logger.error(err); }
    finally { setFundLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => { setEditingWishId(null); reset({ priority: 2, status: 'active', scope: 'personal', created_at: todayStr }); setWishModalOpen(true); }} className="btn-primary px-6 py-3 flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-sm">add</span>
          Добавить желание
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeWishes.map(wish => {
          const progress = wish.progress || ((Number(wish.saved_amount) / Number(wish.cost)) * 100);
          const remaining = Math.max(0, Number(wish.cost) - Number(wish.saved_amount));
          const isCompleted = progress >= 100;
          return (
            <div key={wish.id} className={`p-6 rounded-3xl transition-all duration-300 ${isCompleted ? 'bg-secondary/5 border-2 border-secondary/30' : 'bg-surface-container-lowest shadow-card border border-outline-variant/60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined ${wish.priority === 1 ? 'text-error' : wish.priority === 2 ? 'text-yellow-600' : 'text-secondary'}`}>
                      {wish.priority === 1 ? 'priority_high' : wish.priority === 2 ? 'signal_cellular_alt' : 'trending_down'}
                    </span>
                    <h3 className={`text-lg font-bold font-headline truncate ${isCompleted ? 'text-secondary line-through' : 'text-on-surface'}`}>{wish.name}</h3>
                    {(wish.visibility === 'personal' || wish.scope === 'personal') && <span className="material-symbols-outlined text-sm text-on-surface-variant">lock</span>}
                     {(wish.visibility === 'family' || wish.scope === 'family' || wish.scope === 'shared') && <span className="material-symbols-outlined text-sm text-primary">home</span>}
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">{formatMoney(wish.saved_amount)} / {formatMoney(wish.cost)} ₽</p>
                </div>
                <div className="flex gap-1 shrink-0 ml-3">
                  <button onClick={() => handleEditWish(wish)} className="w-9 h-9 flex items-center justify-center rounded-xl text-primary hover:bg-primary/10"><span className="material-symbols-outlined text-sm">edit</span></button>
                  <button onClick={() => handleArchiveWish(wish.id)} className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined text-sm">archive</span></button>
                </div>
              </div>
              <div className="mb-4">
                <div className="progress-bar">
                  <div className={`progress-bar-fill ${isCompleted ? 'bg-secondary' : 'bg-tertiary'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs font-bold text-on-surface-variant uppercase">Осталось: {formatMoney(remaining)} ₽</span>
                  <span className="text-xs font-bold text-on-surface-variant uppercase">{Math.round(progress)}%</span>
                </div>
              </div>
              {!isCompleted && remaining > 0 && (
                <button onClick={() => handleOpenFund(wish)} className="w-full btn-secondary py-3 text-sm">
                  <span className="material-symbols-outlined text-sm mr-1">savings</span>
                  Выделить средства
                </button>
              )}
            </div>
          );
        })}
        {activeWishes.length === 0 && (
          <div className="col-span-2 bg-surface-container-lowest p-12 rounded-3xl text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-3">favorite</span>
            <h3 className="text-lg font-bold text-on-surface mb-1">Нет активных желаний</h3>
            <p className="text-on-surface-variant text-sm">Создайте первое желание</p>
          </div>
        )}
      </div>

      {showArchived && archivedWishes.length > 0 && (
        <div className="bg-surface-container p-6 rounded-3xl">
          <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
            Архив выполненных
          </h3>
          <div className="space-y-3">
            {archivedWishes.map(w => (
              <div key={w.id} className="flex justify-between items-center p-4 bg-surface-container-lowest rounded-3xl">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">check_circle</span>
                  <span className="text-on-surface-variant line-through font-medium">{w.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-on-surface-variant font-medium">{formatMoney(w.saved_amount)} / {formatMoney(w.cost)} ₽</span>
                  <button onClick={() => restoreWish(w.id)} className="text-xs text-primary font-semibold hover:underline">Вернуть</button>
                  <button onClick={() => handleDeleteWish(w.id)} className="text-xs text-error font-semibold hover:underline">Удалить</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={wishModalOpen} onClose={() => setWishModalOpen(false)} title={editingWishId ? 'Редактировать желание' : 'Новое желание'}>
        <form onSubmit={handleSubmit(handleWishSubmit)} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Название</label>
            <input {...register('name', { required: true })} className="input-ghost" placeholder="Например: Наушники" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Стоимость</label>
              <FormattedInput value={watch('cost') || ''} onChange={(v) => setValue('cost', v)} className="input-ghost" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Накоплено</label>
              <FormattedInput value={watch('saved_amount') || ''} onChange={(v) => setValue('saved_amount', v)} className="input-ghost" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Категория</label>
              <select {...register('category_id')} className="select-ghost">
                <option value="">Без категории</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Приоритет</label>
              <select {...register('priority')} className="select-ghost">
                <option value="1">★ Высокий</option>
                <option value="2">★★ Средний</option>
                <option value="3">★★★ Низкий</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Статус</label>
            <select {...register('status')} className="select-ghost">
              <option value="active">Активно</option>
              <option value="completed">Выполнено</option>
              <option value="postponed">Отложено</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-4 bg-surface-container rounded-3xl">
            <div>
              <span className="text-sm font-semibold text-on-surface">Скрыть от семьи</span>
              <p className="text-xs text-on-surface-variant">Желание будет видно только вам</p>
            </div>
            <Toggle checked={watch('scope') === 'personal'} onChange={() => setValue('scope', watch('scope') === 'personal' ? 'family' : 'personal')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setWishModalOpen(false)} className="btn-ghost px-6 py-3">Отмена</button>
            <button type="submit" className="btn-primary px-8 py-3">Сохранить</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={fundModalOpen} onClose={() => { setFundModalOpen(false); setFundWish(null); }} title="Выделить средства">
        {fundWish && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined">favorite</span>
              </div>
              <div>
                <p className="font-bold text-on-surface font-headline">{fundWish.name}</p>
                <p className="text-xs text-on-surface-variant">Пополнение желания</p>
              </div>
            </div>
            <div className={`rounded-3xl p-4 ${fundAvailable > 0 ? 'bg-secondary/5' : 'bg-error/5'}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-on-surface-variant">Свободные средства:</span>
                <span className={`text-xl font-bold font-headline ${fundAvailable > 0 ? 'text-secondary' : 'text-error'}`}>{formatMoney(fundAvailable)} ₽</span>
              </div>
            </div>
            {fundWarning && (
              <div className="p-4 bg-warning-container rounded-3xl border-l-4 border-warning flex items-start gap-3">
                <span className="material-symbols-outlined text-warning mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-warning-container">Осторожно!</p>
                  <p className="text-xs text-on-warning-container/80 mt-1">После взноса свободных средств останется: {formatMoney(fundWarning.afterContribution)} ₽</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Счёт списания</label>
              <select value={fundAccountId} onChange={(e) => setFundAccountId(e.target.value)} className="select-ghost">
                <option value="">Выберите счёт</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)} ₽)</option>
                ))}
              </select>
            </div>
            <div className="bg-surface-container rounded-3xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Стоимость</span>
                <span className="font-semibold text-on-surface">{formatMoney(fundWish.cost)} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Накоплено</span>
                <span className="font-semibold text-secondary">{formatMoney(fundWish.saved_amount)} ₽</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-outline-variant/20">
                <span className="text-on-surface-variant font-bold">Осталось</span>
                <span className="font-bold text-error">{formatMoney(Math.max(0, Number(fundWish.cost) - Number(fundWish.saved_amount)))} ₽</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Сумма пополнения</label>
              <FormattedInput value={fundAmount} onChange={setFundAmount} className="input-ghost text-lg font-bold" placeholder="0" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Доля от остатка</p>
              <div className="grid grid-cols-3 gap-2">
                {fundOptions.map(f => (
                  <button key={f.label} onClick={() => setFundAmount(String(f.value))} className={`relative px-3 py-3 rounded-3xl transition-all text-center ${f.accent ? (fundAmount === String(f.value) ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'bg-secondary/10 text-secondary hover:bg-secondary/20') : (fundAmount === String(f.value) ? 'bg-tertiary text-white shadow-lg shadow-tertiary/20' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest')}`}>
                    <div className="text-sm font-bold">{f.label}</div>
                    <div className={`text-xs mt-0.5 ${f.accent ? (fundAmount === String(f.value) ? 'text-white/80' : 'text-secondary/70') : (fundAmount === String(f.value) ? 'text-white/80' : 'text-on-surface-variant')}`}>{formatMoney(f.value)} ₽</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setFundModalOpen(false); setFundWish(null); setFundWarning(null); }} className="btn-ghost px-6 py-3">Отмена</button>
              {fundWarning ? (
                <button type="button" onClick={() => handleFund(Number(fundAmount), true)} className="btn-primary px-8 py-3 bg-error hover:bg-error/90">Всё равно выделить</button>
              ) : (
                <button type="button" disabled={!fundAmount || Number(fundAmount) <= 0 || fundLoading} onClick={() => handleFund(Number(fundAmount))} className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                  {fundLoading ? 'Загрузка...' : 'Выделить'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}
