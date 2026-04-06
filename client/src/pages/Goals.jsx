import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import Modal from '../components/Modal';
import ForecastModal from '../components/ForecastModal';
import { formatMoney } from '../utils/format';

const categoryIcons = {
  car: 'directions_car',
  travel: 'flight',
  home: 'home',
  education: 'school',
  tech: 'devices',
  health: 'favorite',
  default: 'track_changes',
};

function getGoalIcon(goalName) {
  const name = goalName.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (name.includes(key)) return icon;
  }
  return categoryIcons.default;
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [contribModalOpen, setContribModalOpen] = useState(false);
  const [contribGoal, setContribGoal] = useState(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribSelectedLabel, setContribSelectedLabel] = useState('');
  const [contribAvailable, setContribAvailable] = useState(0);
  const [contribWarning, setContribWarning] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showCelebration, setShowCelebration] = useState(null);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [forecastGoal, setForecastGoal] = useState(null);
  const [goalTab, setGoalTab] = useState('family');
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchData = async () => {
    try {
      const res = await api.get('/goals', { params: { archived: showArchived } });
      setGoals(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [showArchived]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (data.category_id) payload.category_id = Number(data.category_id);
      if (payload.interest_rate) payload.interest_rate = Number(payload.interest_rate);
      if (payload.auto_contribute_value) payload.auto_contribute_value = Number(payload.auto_contribute_value);
      payload.current_amount = Number(payload.current_amount || 0);
      payload.is_family_goal = !!payload.is_family_goal;
      if (editingId) {
        await api.put(`/goals/${editingId}`, payload);
      } else {
        await api.post('/goals', payload);
      }
      setModalOpen(false); reset(); setEditingId(null); fetchData();
    } catch (err) { console.error(err); alert(err.response?.data?.message || 'Ошибка'); }
  };

  const openEditModal = (goal) => {
    setEditingId(goal.id);
    setValue('name', goal.name);
    setValue('target_amount', goal.target_amount);
    setValue('target_date', goal.target_date?.slice(0, 10) || '');
    setValue('interest_rate', goal.interest_rate || '');
    setValue('current_amount', goal.current_amount);
    setValue('auto_contribute_enabled', goal.auto_contribute_enabled);
    setValue('auto_contribute_type', goal.auto_contribute_type || 'percentage');
    setValue('auto_contribute_value', goal.auto_contribute_value || '');
    setValue('is_family_goal', !!goal.family_id);
    setValue('category_id', goal.category_id);
    setModalOpen(true);
  };

  const deleteGoal = async (id) => {
    if (window.confirm('Удалить цель?')) {
      try { await api.delete(`/goals/${id}`); fetchData(); }
      catch (err) { console.error(err); alert(err.response?.data?.message || 'Ошибка'); }
    }
  };

  const openContribModal = async (goal) => {
    setContribGoal(goal); setContribAmount(''); setContribSelectedLabel(''); setContribWarning(null); setContribModalOpen(true);
    try {
      const res = await api.get('/dashboard');
      setContribAvailable(res.data.family ? res.data.family.available : res.data.personal.available);
    } catch (err) { console.error(err); setContribAvailable(0); }
  };

  const openForecast = (goal) => { setForecastGoal(goal); setForecastOpen(true); };

  const handleContribute = async (amount, skipWarning = false) => {
    if (!contribGoal || !amount || amount <= 0) return;
    try {
      const res = await api.post(`/goals/${contribGoal.id}/contribute`, {
        amount, createTransaction: true, comment: `Пополнение цели: ${contribGoal.name}`, skipWarning,
      });
      if (res.data.warning && !skipWarning) {
        setContribWarning(res.data.warning);
        return;
      }
      setContribModalOpen(false); setContribGoal(null); setContribSelectedLabel(''); setContribWarning(null); fetchData();
      if (res.data.current_amount >= Number(contribGoal.target_amount)) {
        setShowCelebration(contribGoal.name);
        setTimeout(() => setShowCelebration(null), 3000);
      }
    } catch (err) { console.error(err); alert(err.response?.data?.message || 'Ошибка'); }
  };

  const contribOptions = useMemo(() => {
    if (!contribGoal) return [];
    const remaining = Math.max(0, Number(contribGoal.target_amount) - Number(contribGoal.current_amount));
    return [10, 25, 50, 75, 90, 100].map(pct => {
      const value = Math.round(remaining * (pct / 100) * 100) / 100;
      return { label: `${pct}%`, value, pct, canAfford: value <= contribAvailable };
    }).filter(o => o.value > 0);
  }, [contribGoal, contribAvailable]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );

  const activeGoals = goals.filter(g => !g.archived && !g.achieved);
  const archivedGoals = goals.filter(g => g.archived || g.achieved);

  const familyGoals = activeGoals.filter(g => g.family_id);
  const personalGoals = activeGoals.filter(g => !g.family_id);
  const displayGoals = goalTab === 'family' ? familyGoals : personalGoals;

  return (
    <div className="space-y-8">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-surface-container-lowest rounded-3xl shadow-ambient p-8 text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <h3 className="text-2xl font-bold text-secondary font-headline">Цель достигнута!</h3>
            <p className="text-on-surface-variant mt-1">{showCelebration}</p>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex gap-2 text-xs font-medium text-on-surface-variant/50 mb-2 uppercase tracking-widest">
            <span>Сбережения</span>
            <span>/</span>
            <span className="text-primary">Цели</span>
          </nav>
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">Цели накоплений</h2>
        </div>
        <div className="flex gap-2">
          {archivedGoals.length > 0 && (
            <button onClick={() => setShowArchived(!showArchived)} className="btn-ghost px-4 py-3 text-sm">
              {showArchived ? 'Скрыть архив' : 'Архив'}
            </button>
          )}
          <button
            onClick={() => { setEditingId(null); reset({ auto_contribute_enabled: false, auto_contribute_type: 'percentage', auto_contribute_value: '', is_family_goal: false, target_date: todayStr }); setModalOpen(true); }}
            className="btn-primary px-6 py-3 flex items-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Добавить цель
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setGoalTab('family')}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors ${goalTab === 'family' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          Семейные ({familyGoals.length})
        </button>
        <button
          onClick={() => setGoalTab('personal')}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors ${goalTab === 'personal' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          Мои ({personalGoals.length})
        </button>
      </div>

      {/* Active Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {displayGoals.map(goal => {
          const progress = goal.progress || ((Number(goal.current_amount) / Number(goal.target_amount)) * 100);
          const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));
          const achieved = goal.achieved || (Number(goal.current_amount) >= Number(goal.target_amount));
          return (
            <div key={goal.id} className="group bg-surface-container-lowest rounded-[2rem] p-8 transition-all hover:shadow-2xl hover:shadow-indigo-500/5 relative overflow-hidden">
              {/* Icon */}
              <div className="absolute top-0 right-0 p-6">
                <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {getGoalIcon(goal.name)}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div className="mb-12">
                <h3 className="text-2xl font-headline font-bold text-on-surface mb-1">{goal.name}</h3>
                {goal.target_date && (
                  <p className="text-sm text-on-surface-variant/60 font-medium">
                    Срок: {new Date(goal.target_date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Progress Section */}
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

                {/* Progress Bar */}
                <div className="relative w-full h-4 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-primary">{Math.round(progress)}% выполнено</span>
                  <span className="text-on-surface-variant">Осталось: {formatMoney(remaining)} ₽</span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={() => openContribModal(goal)}
                    className="py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                    Пополнить
                  </button>
                  <button
                    onClick={() => openForecast(goal)}
                    className="py-4 bg-surface-container text-on-surface rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    Прогноз
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {activeGoals.length === 0 && (
          <div className="col-span-2 bg-surface-container-lowest rounded-[2rem] p-16 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-primary">track_changes</span>
            </div>
            <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Нет активных целей</h3>
            <p className="text-on-surface-variant text-sm mb-6">Создайте первую цель накоплений</p>
            <button
              onClick={() => { reset({ auto_contribute_enabled: false, auto_contribute_type: 'percentage', auto_contribute_value: '', is_family_goal: false, target_date: todayStr }); setModalOpen(true); }}
              className="btn-primary px-8 py-3 inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Добавить цель
            </button>
          </div>
        )}
      </div>

      {/* Archived Goals */}
      {showArchived && archivedGoals.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-2xl font-headline font-bold text-on-surface">Архив выполненных</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {archivedGoals.map(g => (
              <div key={g.id} className="group bg-surface-container-lowest/50 rounded-[2rem] p-8 border border-outline-variant/20 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-secondary/5 pointer-events-none"></div>
                <div className="absolute top-0 right-0 p-6">
                  <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                </div>
                <div className="mb-12">
                  <h3 className="text-2xl font-headline font-bold text-on-surface line-through decoration-secondary decoration-2 mb-1">{g.name}</h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary text-white rounded-full text-[10px] font-bold uppercase tracking-widest mt-2">
                    <span className="material-symbols-outlined text-[12px]">done</span>
                    Цель достигнута!
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-sm font-semibold text-on-surface-variant/50 uppercase">Собрано</span>
                      <div className="text-3xl font-headline font-extrabold text-secondary">{formatMoney(g.current_amount)} ₽</div>
                    </div>
                  </div>
                  <div className="relative w-full h-4 bg-secondary-container/30 rounded-full">
                    <div className="absolute top-0 left-0 h-full bg-secondary rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={async () => { try { await api.put(`/goals/${g.id}`, { archived: false }); fetchData(); } catch (err) { console.error(err); } }}
                      className="w-full py-4 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-surface-container-high transition-colors"
                    >
                      Вернуть в активные
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      <Modal isOpen={contribModalOpen} onClose={() => { setContribModalOpen(false); setContribGoal(null); }} title="Пополнить цель">
        {contribGoal && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">{getGoalIcon(contribGoal.name)}</span>
              </div>
              <div>
                <p className="font-bold text-on-surface font-headline">{contribGoal.name}</p>
                <p className="text-xs text-on-surface-variant">Пополнение цели</p>
              </div>
            </div>

            <div className={`rounded-2xl p-4 ${contribAvailable > 0 ? 'bg-secondary/5' : 'bg-error/5'}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-on-surface-variant">Свободные средства:</span>
                <span className={`text-xl font-bold font-headline ${contribAvailable > 0 ? 'text-secondary' : 'text-error'}`}>{formatMoney(contribAvailable)} ₽</span>
              </div>
            </div>

            <div className="bg-surface-container rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Целевая сумма</span>
                <span className="font-semibold text-on-surface">{formatMoney(contribGoal.target_amount)} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Накоплено</span>
                <span className="font-semibold text-secondary">{formatMoney(contribGoal.current_amount)} ₽</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-outline-variant/20">
                <span className="text-on-surface-variant font-bold">Осталось</span>
                <span className="font-bold text-error">{formatMoney(Math.max(0, Number(contribGoal.target_amount) - Number(contribGoal.current_amount)))} ₽</span>
              </div>
            </div>

            {contribWarning && (
              <div className="p-4 bg-warning-container rounded-2xl border-l-4 border-warning flex items-start gap-3">
                <span className="material-symbols-outlined text-warning mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-warning-container">Осторожно!</p>
                  <p className="text-xs text-on-warning-container/80 mt-1">После взноса свободных средств останется: {formatMoney(contribWarning.afterContribution)} ₽</p>
                  <p className="text-xs text-on-warning-container/60">Порог предупреждения: {formatMoney(contribWarning.threshold)} ₽</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Сумма пополнения</label>
              <input type="number" step="0.01" min="0.01" value={contribAmount} onChange={e => setContribAmount(e.target.value)} className="input-ghost text-lg font-bold" placeholder="0.00" />
            </div>

            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">% от остатка цели</p>
              <div className="grid grid-cols-3 gap-2">
                {contribOptions.map(o => (
                  <button
                    key={o.label}
                    onClick={() => { if (o.canAfford) { setContribAmount(String(o.value)); setContribSelectedLabel(o.label); } }}
                    disabled={!o.canAfford}
                    className={`relative px-3 py-3 rounded-2xl transition-all text-center ${
                      !o.canAfford
                        ? 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
                        : contribSelectedLabel === o.label
                          ? o.pct === 100
                            ? 'bg-secondary text-white shadow-lg shadow-secondary/20'
                            : 'bg-primary text-white shadow-button'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                    }`}
                  >
                    <div className="text-sm font-bold">{o.label}</div>
                    <div className={`text-xs mt-0.5 ${contribSelectedLabel === o.label ? 'text-white/80' : 'text-on-surface-variant'}`}>{formatMoney(o.value)} ₽</div>
                    {!o.canAfford && <div className="text-[10px] text-error mt-0.5">нет средств</div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setContribModalOpen(false); setContribGoal(null); setContribWarning(null); }} className="btn-ghost px-6 py-3">Отмена</button>
              {contribWarning ? (
                <button type="button" onClick={() => handleContribute(Number(contribAmount), true)} className="btn-primary px-8 py-3 bg-error hover:bg-error/90">Всё равно пополнить</button>
              ) : (
                <button type="button" disabled={!contribAmount || Number(contribAmount) <= 0} onClick={() => handleContribute(Number(contribAmount))} className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed">Пополнить</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Forecast Modal */}
      <ForecastModal goal={forecastGoal} isOpen={forecastOpen} onClose={() => { setForecastOpen(false); setForecastGoal(null); }} />

      {/* Add/Edit Goal Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Редактировать цель' : 'Новая цель'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Название</label>
            <input {...register('name', { required: true })} className="input-ghost" placeholder="Например: Новая машина" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Целевая сумма</label>
              <input type="number" step="0.01" {...register('target_amount', { required: true, min: 0.01 })} className="input-ghost" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Текущая сумма</label>
              <input type="number" step="0.01" {...register('current_amount')} className="input-ghost" placeholder="0.00" />
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

          <label className="flex items-center justify-between p-4 bg-surface-container rounded-2xl cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-on-surface">Автозачисление</span>
              <p className="text-xs text-on-surface-variant">Автоматическое пополнение из доходов</p>
            </div>
            <button
              type="button"
              onClick={() => setValue('auto_contribute_enabled', !watch('auto_contribute_enabled'))}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                watch('auto_contribute_enabled') ? 'bg-primary' : 'bg-outline-variant'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                watch('auto_contribute_enabled') ? 'translate-x-5' : 'translate-x-0.5'
              }`}></div>
            </button>
          </label>

          {watch('auto_contribute_enabled') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Тип</label>
                <select {...register('auto_contribute_type')} className="select-ghost">
                  <option value="percentage">% от дохода</option>
                  <option value="fixed">Фикс. сумма</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Значение</label>
                <input type="number" step="0.01" {...register('auto_contribute_value')} className="input-ghost" placeholder="0" />
              </div>
            </div>
          )}

          <label className="flex items-center justify-between p-4 bg-surface-container rounded-2xl cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-on-surface">Семейная цель</span>
              <p className="text-xs text-on-surface-variant">Доступна всем членам семьи</p>
            </div>
            <button
              type="button"
              onClick={() => setValue('is_family_goal', !watch('is_family_goal'))}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                watch('is_family_goal') ? 'bg-primary' : 'bg-outline-variant'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                watch('is_family_goal') ? 'translate-x-5' : 'translate-x-0.5'
              }`}></div>
            </button>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost px-6 py-3">Отмена</button>
            <button type="submit" className="btn-primary px-8 py-3">Сохранить</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
