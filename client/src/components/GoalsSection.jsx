import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import ForecastModal from './ForecastModal';
import FormattedInput from './ui/FormattedInput';
import { formatMoney } from '../utils/format';
import api from '../services/api';
import logger from '../utils/logger';
import Toggle from './ui/Toggle';

const categoryIcons = {
  car: 'directions_car',
  travel: 'flight',
  home: 'home',
  education: 'school',
  tech: 'devices',
  health: 'favorite',
  default: 'track_changes',
};

function getGoalIcon(name) {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lower.includes(key)) return icon;
  }
  return categoryIcons.default;
}

export default function GoalsSection({ goals, showArchived, categories, accounts, todayStr, onRefresh }) {
  const activeGoals = useMemo(() => goals.filter(g => !g.archived && !g.achieved), [goals]);
  const archivedGoals = useMemo(() => goals.filter(g => g.archived || g.achieved), [goals]);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [contribModalOpen, setContribModalOpen] = useState(false);
  const [contribGoal, setContribGoal] = useState(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribSelectedLabel, setContribSelectedLabel] = useState('');
  const [contribAvailable, setContribAvailable] = useState(0);
  const [contribAccountId, setContribAccountId] = useState('');
  const [contribWarning, setContribWarning] = useState(null);
  const [contribLoading, setContribLoading] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [forecastGoal, setForecastGoal] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, title: '', message: '', variant: 'danger', confirmText: '' });
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const contribOptions = useMemo(() => {
    if (!contribGoal) return [];
    const remaining = Math.max(0, Number(contribGoal.target_amount) - Number(contribGoal.current_amount));
    return [10, 25, 50, 75, 90, 100].map(pct => {
      const value = Math.round(remaining * (pct / 100) * 100) / 100;
      return { label: `${pct}%`, value, pct, canAfford: value <= contribAvailable };
    }).filter(o => o.value > 0);
  }, [contribGoal, contribAvailable]);

  const handleGoalSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (data.category_id) payload.category_id = Number(data.category_id);
      if (payload.interest_rate) payload.interest_rate = Number(payload.interest_rate);
      if (payload.auto_contribute_value) payload.auto_contribute_value = Number(payload.auto_contribute_value);
      payload.current_amount = Number(payload.current_amount || 0);
      payload.scope = data.scope || (data.is_family_goal ? 'family' : 'personal');
      delete payload.is_family_goal;
      if (editingGoalId) {
        await api.patch(`/goals/${editingGoalId}`, payload);
      } else {
        await api.post('/goals', payload);
      }
      setGoalModalOpen(false); reset(); setEditingGoalId(null); onRefresh();
    } catch (err) { logger.error(err); }
  };

  const handleEditGoal = (goal) => {
    setEditingGoalId(goal.id);
    setValue('name', goal.name);
    setValue('target_amount', goal.target_amount);
    setValue('target_date', goal.target_date?.slice(0, 10) || '');
    setValue('interest_rate', goal.interest_rate || '');
    setValue('current_amount', goal.current_amount);
    setValue('auto_contribute_enabled', goal.auto_contribute_enabled);
    setValue('auto_contribute_type', goal.auto_contribute_type || 'percentage');
    setValue('auto_contribute_value', goal.auto_contribute_value || '');
    setValue('scope', goal.visibility === 'family' ? 'family' : 'personal');
    setValue('category_id', goal.category_id);
    setGoalModalOpen(true);
  };

  const handleArchiveGoal = (id) => {
    setConfirmModal({
      open: true, variant: 'warning', title: 'Архивировать цель?',
      message: 'Цель будет перемещена в архив.',
      confirmText: 'Архивировать',
      onConfirm: async () => {
        try { await api.patch(`/goals/${id}`, { is_archived: true }); onRefresh(); }
        catch (err) { logger.error(err); }
      }
    });
  };

  const handleDeleteGoal = (id) => {
    setConfirmModal({
      open: true, variant: 'danger', title: 'Удалить цель навсегда?',
      message: 'Это действие нельзя отменить. Все накопления будут потеряны.',
      confirmText: 'Удалить',
      onConfirm: async () => {
        try { await api.delete(`/goals/${id}`); onRefresh(); }
        catch (err) { logger.error(err); }
      }
    });
  };

  const handleOpenContrib = async (goal) => {
    setContribGoal(goal); setContribAmount(''); setContribSelectedLabel(''); setContribWarning(null); setContribAccountId(''); setContribModalOpen(true);
    try {
      const dashRes = await api.get('/dashboard');
      setContribAvailable(dashRes.data.family ? dashRes.data.family.available : dashRes.data.personal.available);
    } catch (err) { logger.error(err); setContribAvailable(0); }
  };

  const restoreGoal = async (id) => {
    try { await api.patch(`/goals/${id}`, { archived: false }); onRefresh(); } catch (err) { logger.error(err); }
  };

  const handleContribute = async (amount, skipWarning = false) => {
    if (!contribGoal || !amount || amount <= 0 || contribLoading) return;
    setContribLoading(true);
    try {
      const res = await api.post(`/goals/${contribGoal.id}/contribute`, {
        amount, createTransaction: true, comment: `Пополнение цели: ${contribGoal.name}`, skipWarning, account_id: contribAccountId || undefined,
      });
      if (res.data.warning && !skipWarning) {
        setContribWarning(res.data.warning);
        return;
      }
      setContribModalOpen(false); setContribGoal(null); setContribSelectedLabel(''); setContribWarning(null); onRefresh();
    } catch (err) { logger.error(err); }
    finally { setContribLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => { setEditingGoalId(null); reset({ auto_contribute_enabled: false, auto_contribute_type: 'percentage', auto_contribute_value: '', scope: 'personal', target_date: todayStr }); setGoalModalOpen(true); }} className="btn-primary px-6 py-3 flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-sm">add</span>
          Добавить цель
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {activeGoals.map(goal => {
          const progress = goal.progress || ((Number(goal.current_amount) / Number(goal.target_amount)) * 100);
          const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));
          return (
            <div key={goal.id} className="group bg-surface-container-lowest rounded-3xl p-8 transition-all hover:shadow-2xl hover:shadow-indigo-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 flex gap-1">
                <button onClick={() => handleEditGoal(goal)} className="w-9 h-9 flex items-center justify-center rounded-xl text-primary hover:bg-primary/10">
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button onClick={() => handleArchiveGoal(goal.id)} className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container">
                  <span className="material-symbols-outlined text-sm">archive</span>
                </button>
              </div>
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-0">
                <div className="w-12 h-12 rounded-3xl bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{getGoalIcon(goal.name)}</span>
                </div>
              </div>
              <div className="pr-20">
                <div className="mb-12">
                  <h3 className="text-2xl font-headline font-bold text-on-surface mb-1">{goal.name}</h3>
                  {goal.target_date && (
                    <p className="text-sm text-on-surface-variant/60 font-medium">
                      Срок: {new Date(goal.target_date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <span className="text-sm font-semibold text-on-surface-variant/50 uppercase tracking-tighter">Накоплено</span>
                      <div className="text-3xl font-headline font-extrabold text-primary">{formatMoney(goal.current_amount)} ₽</div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-on-surface-variant/50 uppercase tracking-tighter">Всего</span>
                      <div className="text-xl font-headline font-bold text-on-surface">{formatMoney(goal.target_amount)} ₽</div>
                    </div>
                  </div>
                  <div className="relative w-full h-4 bg-surface-container rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-primary">{Math.round(progress)}% выполнено</span>
                    <span className="text-on-surface-variant">Осталось: {formatMoney(remaining)} ₽</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button onClick={() => handleOpenContrib(goal)} className="py-4 bg-primary text-white rounded-3xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                      <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                      Пополнить
                    </button>
                    <button onClick={() => { setForecastGoal(goal); setForecastOpen(true); }} className="py-4 bg-surface-container text-on-surface rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors active:scale-95">
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      Прогноз
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {activeGoals.length === 0 && (
          <div className="col-span-2 bg-surface-container-lowest rounded-3xl p-16 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-primary">track_changes</span>
            </div>
            <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Нет активных целей</h3>
            <p className="text-on-surface-variant text-sm mb-6">Создайте первую цель накоплений</p>
            <button onClick={() => { reset({ auto_contribute_enabled: false, auto_contribute_type: 'percentage', auto_contribute_value: '', scope: 'personal', target_date: todayStr }); setGoalModalOpen(true); }} className="btn-primary px-8 py-3 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span>
              Добавить цель
            </button>
          </div>
        )}
      </div>

      {showArchived && archivedGoals.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-2xl font-headline font-bold text-on-surface">Архив выполненных</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {archivedGoals.map(g => (
              <div key={g.id} className="group bg-surface-container-lowest/50 rounded-3xl p-8 border border-outline-variant/20 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-secondary/5 pointer-events-none"></div>
                <div className="absolute top-0 right-0 p-6">
                  <div className="w-12 h-12 rounded-3xl bg-secondary-container flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                </div>
                <div className="mb-12">
                  <h3 className="text-2xl font-headline font-bold text-on-surface line-through decoration-secondary decoration-2 mb-1">{g.name}</h3>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-sm font-semibold text-on-surface-variant/50 uppercase">Собрано</span>
                      <div className="text-3xl font-headline font-extrabold text-secondary">{formatMoney(g.current_amount)} ₽</div>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button onClick={() => restoreGoal(g.id)} className="flex-1 py-4 bg-surface-container text-on-surface rounded-3xl font-bold hover:bg-surface-container-high transition-colors">
                      Вернуть в активные
                    </button>
                    <button onClick={() => handleDeleteGoal(g.id)} className="py-4 px-4 bg-error-container text-error rounded-3xl font-bold hover:opacity-90 transition-colors" title="Удалить навсегда">
                      <span className="material-symbols-outlined text-sm">delete_forever</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={goalModalOpen} onClose={() => setGoalModalOpen(false)} title={editingGoalId ? 'Редактировать цель' : 'Новая цель'}>
        <form onSubmit={handleSubmit(handleGoalSubmit)} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Название</label>
            <input {...register('name', { required: true })} className="input-ghost" placeholder="Например: Новая машина" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Целевая сумма</label>
              <FormattedInput value={watch('target_amount') || ''} onChange={(v) => setValue('target_amount', v)} className="input-ghost" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Текущая сумма</label>
              <FormattedInput value={watch('current_amount') || ''} onChange={(v) => setValue('current_amount', v)} className="input-ghost" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Срок</label>
              <input type="date" {...register('target_date')} defaultValue={todayStr} className="select-ghost" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Ставка (%)</label>
              <input type="number" step="0.01" {...register('interest_rate')} className="input-ghost" placeholder="0" />
            </div>
          </div>
          <label className="flex items-center justify-between p-4 bg-surface-container rounded-3xl cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-on-surface">Семейная цель</span>
              <p className="text-xs text-on-surface-variant">Доступна всем членам семьи</p>
            </div>
            <Toggle checked={watch('scope') !== 'personal'} onChange={() => setValue('scope', watch('scope') === 'personal' ? 'family' : 'personal')} />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setGoalModalOpen(false)} className="btn-ghost px-6 py-3">Отмена</button>
            <button type="submit" className="btn-primary px-8 py-3">Сохранить</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={contribModalOpen} onClose={() => { setContribModalOpen(false); setContribGoal(null); }} title="Пополнить цель">
        {contribGoal && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">{getGoalIcon(contribGoal.name)}</span>
              </div>
              <div>
                <p className="font-bold text-on-surface font-headline">{contribGoal.name}</p>
                <p className="text-xs text-on-surface-variant">Пополнение цели</p>
              </div>
            </div>
            <div className={`rounded-3xl p-4 ${contribAvailable > 0 ? 'bg-secondary/5' : 'bg-error/5'}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-on-surface-variant">Свободные средства:</span>
                <span className={`text-xl font-bold font-headline ${contribAvailable > 0 ? 'text-secondary' : 'text-error'}`}>{formatMoney(contribAvailable)} ₽</span>
              </div>
            </div>
            {contribWarning && (
              <div className="p-4 bg-warning-container rounded-3xl border-l-4 border-warning flex items-start gap-3">
                <span className="material-symbols-outlined text-warning mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-warning-container">Осторожно!</p>
                  <p className="text-xs text-on-warning-container/80 mt-1">После взноса свободных средств останется: {formatMoney(contribWarning.afterContribution)} ₽</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Счёт списания</label>
              <select value={contribAccountId} onChange={(e) => setContribAccountId(e.target.value)} className="select-ghost">
                <option value="">Выберите счёт</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)} ₽)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Сумма пополнения</label>
              <FormattedInput value={contribAmount} onChange={setContribAmount} className="input-ghost text-lg font-bold" placeholder="0" min={1} max={contribAvailable} label="Сумма пополнения" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">% от остатка цели</p>
              <div className="grid grid-cols-3 gap-2">
                {contribOptions.map(o => (
                  <button key={o.label} onClick={() => { if (o.canAfford) { setContribAmount(String(o.value)); setContribSelectedLabel(o.label); } }} disabled={!o.canAfford} className={`relative px-3 py-3 rounded-3xl transition-all text-center ${!o.canAfford ? 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed' : contribSelectedLabel === o.label ? (o.pct === 100 ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'bg-primary text-white shadow-button') : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'}`}>
                    <div className="text-sm font-bold">{o.label}</div>
                    <div className={`text-xs mt-0.5 ${contribSelectedLabel === o.label ? 'text-white/80' : 'text-on-surface-variant'}`}>{formatMoney(o.value)} ₽</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setContribModalOpen(false); setContribGoal(null); setContribWarning(null); }} className="btn-ghost px-6 py-3">Отмена</button>
              {contribWarning ? (
                <button type="button" onClick={() => handleContribute(Number(contribAmount), true)} className="btn-primary px-8 py-3 bg-error hover:bg-error/90">Всё равно пополнить</button>
              ) : (
                <button type="button" disabled={!contribAmount || Number(contribAmount) <= 0 || contribLoading} onClick={() => handleContribute(Number(contribAmount))} className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                  {contribLoading ? 'Загрузка...' : 'Пополнить'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ForecastModal goal={forecastGoal} isOpen={forecastOpen} onClose={() => { setForecastOpen(false); setForecastGoal(null); }} />

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
