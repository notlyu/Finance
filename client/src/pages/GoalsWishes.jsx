import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import ForecastModal from '../components/ForecastModal';
import FormattedInput from '../components/ui/FormattedInput';
import { formatMoney } from '../utils/format';
import { showError } from '../utils/toast';

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

export default function GoalsWishes({ space = 'personal' }) {
  const [goals, setGoals] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('goals');

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
  const [showArchived, setShowArchived] = useState(false);
  const [showCelebration, setShowCelebration] = useState(null);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [forecastGoal, setForecastGoal] = useState(null);

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

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchGoals = async () => {
    try {
      const res = await api.get('/goals', { params: { archived: showArchived } });
      setGoals(res.data);
    } catch (err) { console.error('Goals fetch error:', err); }
  };

  const fetchWishes = async () => {
    try {
      const res = await api.get('/wishes', { params: { showArchived } });
      setWishes(res.data);
    } catch (err) { console.error('Wishes fetch error:', err); }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.filter(c => c.type === 'expense'));
    } catch (err) { console.error('Categories fetch error:', err); }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data || []);
    } catch (err) { console.error('Accounts fetch error:', err); }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchGoals(),
      fetchWishes(),
      fetchCategories(),
      fetchAccounts(),
    ]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [showArchived]);

  const activeGoals = useMemo(() => goals.filter(g => !g.archived && !g.achieved), [goals]);
  const archivedGoals = useMemo(() => goals.filter(g => g.archived || g.achieved), [goals]);
  const activeWishes = useMemo(() => wishes.filter(w => !w.archived && w.status !== 'completed'), [wishes]);
  const archivedWishes = useMemo(() => wishes.filter(w => w.archived || w.status === 'completed'), [wishes]);

  const contribOptions = useMemo(() => {
    if (!contribGoal) return [];
    const remaining = Math.max(0, Number(contribGoal.target_amount) - Number(contribGoal.current_amount));
    return [10, 25, 50, 75, 90, 100].map(pct => {
      const value = Math.round(remaining * (pct / 100) * 100) / 100;
      return { label: `${pct}%`, value, pct, canAfford: value <= contribAvailable };
    }).filter(o => o.value > 0);
  }, [contribGoal, contribAvailable]);

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

  const handleGoalSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (data.category_id) payload.category_id = Number(data.category_id);
      if (payload.interest_rate) payload.interest_rate = Number(payload.interest_rate);
      if (payload.auto_contribute_value) payload.auto_contribute_value = Number(payload.auto_contribute_value);
      payload.current_amount = Number(payload.current_amount || 0);
      // Use scope directly, fallback to is_family_goal for backward compatibility
      payload.scope = data.scope || (data.is_family_goal ? 'family' : 'personal');
      delete payload.is_family_goal;
      if (editingGoalId) {
        await api.put(`/goals/${editingGoalId}`, payload);
      } else {
        await api.post('/goals', payload);
      }
      setGoalModalOpen(false); reset(); setEditingGoalId(null); fetchGoals();
    } catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
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

  const handleDeleteGoal = (id) => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Удалить цель?',
      message: 'Это действие нельзя отменить. Все накопления будут потеряны.',
      confirmText: 'Удалить',
      onConfirm: async () => {
        try { await api.delete(`/goals/${id}`); fetchGoals(); }
        catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
      }
    });
  };

  const handleOpenContrib = async (goal) => {
    setContribGoal(goal); setContribAmount(''); setContribSelectedLabel(''); setContribWarning(null); setContribAccountId(''); setContribModalOpen(true);
    try {
      const [dashRes, accRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/accounts'),
      ]);
      setContribAvailable(dashRes.data.family ? dashRes.data.family.available : dashRes.data.personal.available);
      setAccounts(accRes.data || []);
    } catch (err) { console.error(err); setContribAvailable(0); }
  };

  const restoreGoal = async (id) => {
    try { await api.put(`/goals/${id}`, { archived: false }); fetchGoals(); } catch (err) { console.error(err); }
  };

  const restoreWish = async (id) => {
    try { await api.put(`/wishes/${id}`, { archived: false, status: 'active' }); fetchWishes(); } catch (err) { console.error(err); }
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
      setContribModalOpen(false); setContribGoal(null); setContribSelectedLabel(''); setContribWarning(null); fetchGoals();
      if (res.data.current_amount >= Number(contribGoal.target_amount)) {
        setShowCelebration(`Цель: ${contribGoal.name}`);
        setTimeout(() => setShowCelebration(null), 3000);
      }
    } catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
    finally { setContribLoading(false); }
  };

  const handleWishSubmit = async (data) => {
    try {
      const payload = { ...data, category_id: data.category_id ? Number(data.category_id) : undefined, created_at: todayStr };
      payload.visibility = data.scope === 'personal' ? 'personal' : 'family';
      if (editingWishId) { await api.put(`/wishes/${editingWishId}`, payload); }
      else { await api.post('/wishes', payload); }
      setWishModalOpen(false); reset(); setEditingWishId(null); fetchWishes();
    } catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
  };

  const handleEditWish = (wish) => {
    setEditingWishId(wish.id);
    setValue('name', wish.name); setValue('cost', wish.cost); setValue('priority', wish.priority);
    setValue('status', wish.status); setValue('saved_amount', wish.saved_amount);
    setValue('scope', wish.visibility === 'personal' ? 'personal' : 'family'); setValue('category_id', wish.category_id);
    setWishModalOpen(true);
  };

  const handleDeleteWish = (id) => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Удалить желание?',
      message: 'Это действие нельзя отменить.',
      confirmText: 'Удалить',
      onConfirm: async () => {
        try { await api.delete(`/wishes/${id}`); fetchWishes(); }
        catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
      }
    });
  };

  const handleOpenFund = async (wish) => {
    setFundWish(wish); setFundAmount(''); setFundWarning(null); setFundAccountId(''); setFundModalOpen(true);
    try {
      const [dashRes, accRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/accounts'),
      ]);
      setFundAvailable(dashRes.data.family ? dashRes.data.family.available : dashRes.data.personal.available);
      setAccounts(accRes.data || []);
    } catch (err) { console.error(err); setFundAvailable(0); }
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
      setFundModalOpen(false); setFundWish(null); setFundWarning(null); fetchWishes();
      if (res.data.saved_amount >= Number(fundWish.cost)) {
        setShowCelebration(`Желание: ${fundWish.name}`);
        setTimeout(() => setShowCelebration(null), 3000);
      }
    } catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
    finally { setFundLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-surface-container-lowest rounded-3xl shadow-ambient p-8 text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <h3 className="text-2xl font-bold text-secondary font-headline">Достигнуто!</h3>
            <p className="text-on-surface-variant mt-1">{showCelebration}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Назад
          </Link>
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">Цели и Желания</h2>
        </div>
        <div className="flex gap-2">
          {archivedGoals.length > 0 || archivedWishes.length > 0 ? (
            <button onClick={() => setShowArchived(!showArchived)} className="btn-ghost px-4 py-3 text-sm">
              {showArchived ? 'Скрыть архив' : 'Архив'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors ${activeTab === 'goals' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          Цели ({activeGoals.length})
        </button>
        <button
          onClick={() => setActiveTab('wishes')}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors ${activeTab === 'wishes' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          Желания ({activeWishes.length})
        </button>
      </div>

      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingGoalId(null); reset({ auto_contribute_enabled: false, auto_contribute_type: 'percentage', auto_contribute_value: '', scope: 'personal', target_date: todayStr }); setGoalModalOpen(true); }}
              className="btn-primary px-6 py-3 flex items-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Добавить цель
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {activeGoals.map(goal => {
              const progress = goal.progress || ((Number(goal.current_amount) / Number(goal.target_amount)) * 100);
              const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));
              const achieved = goal.achieved || (Number(goal.current_amount) >= Number(goal.target_amount));
              return (
                <div key={goal.id} className="group bg-surface-container-lowest rounded-[2rem] p-8 transition-all hover:shadow-2xl hover:shadow-indigo-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 flex gap-1">
                    <button onClick={() => handleEditGoal(goal)} className="w-9 h-9 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDeleteGoal(goal.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-error hover:bg-error-container">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-0">
                    <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
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
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-primary">{Math.round(progress)}% выполнено</span>
                        <span className="text-on-surface-variant">Осталось: {formatMoney(remaining)} ₽</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <button onClick={() => handleOpenContrib(goal)} className="py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                          <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                          Пополнить
                        </button>
                        <button onClick={() => { setForecastGoal(goal); setForecastOpen(true); }} className="py-4 bg-surface-container text-on-surface rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors active:scale-95">
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
              <div className="col-span-2 bg-surface-container-lowest rounded-[2rem] p-16 text-center">
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
                  <div key={g.id} className="group bg-surface-container-lowest/50 rounded-[2rem] p-8 border border-outline-variant/20 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-secondary/5 pointer-events-none"></div>
                    <div className="absolute top-0 right-0 p-6">
                      <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-secondary">
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
                      <div className="pt-4">
                        <button onClick={() => restoreGoal(g.id)} className="w-full py-4 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-surface-container-high transition-colors">
                          Вернуть в активные
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'wishes' && (
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
                <div key={wish.id} className={`p-6 rounded-3xl transition-all duration-300 ${isCompleted ? 'bg-secondary/5 border-2 border-secondary/30' : 'bg-surface-container-lowest shadow-card'}`}>
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
                      <button onClick={() => handleEditWish(wish)} className="w-9 h-9 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10"><span className="material-symbols-outlined text-sm">edit</span></button>
                      <button onClick={() => handleDeleteWish(wish.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-error hover:bg-error-container"><span className="material-symbols-outlined text-sm">delete</span></button>
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
                  <div key={w.id} className="flex justify-between items-center p-4 bg-surface-container-lowest rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary">check_circle</span>
                      <span className="text-on-surface-variant line-through font-medium">{w.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-on-surface-variant font-medium">{formatMoney(w.saved_amount)} / {formatMoney(w.cost)} ₽</span>
                      <button onClick={() => restoreWish(w.id)} className="text-xs text-primary font-semibold hover:underline">Вернуть</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          <label className="flex items-center justify-between p-4 bg-surface-container rounded-2xl cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-on-surface">Семейная цель</span>
              <p className="text-xs text-on-surface-variant">Доступна всем членам семьи</p>
            </div>
            <button type="button" onClick={() => setValue('scope', watch('scope') === 'personal' ? 'family' : 'personal')} className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${watch('scope') === 'personal' ? 'bg-outline-variant' : 'bg-primary'}`}>
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${watch('scope') === 'personal' ? 'translate-x-0.5' : 'translate-x-5'}`}></div>
            </button>
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
            {contribWarning && (
              <div className="p-4 bg-warning-container rounded-2xl border-l-4 border-warning flex items-start gap-3">
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
                  <button key={o.label} onClick={() => { if (o.canAfford) { setContribAmount(String(o.value)); setContribSelectedLabel(o.label); } }} disabled={!o.canAfford} className={`relative px-3 py-3 rounded-2xl transition-all text-center ${!o.canAfford ? 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed' : contribSelectedLabel === o.label ? (o.pct === 100 ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'bg-primary text-white shadow-button') : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'}`}>
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
          <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl">
            <div>
              <span className="text-sm font-semibold text-on-surface">Скрыть от семьи</span>
              <p className="text-xs text-on-surface-variant">Желание будет видно только вам</p>
            </div>
            <button type="button" onClick={() => setValue('scope', watch('scope') === 'personal' ? 'family' : 'personal')} className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${watch('scope') === 'personal' ? 'bg-primary' : 'bg-outline-variant'}`}>
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${watch('scope') === 'personal' ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
            </button>
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
            <div className={`rounded-2xl p-4 ${fundAvailable > 0 ? 'bg-secondary/5' : 'bg-error/5'}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-on-surface-variant">Свободные средства:</span>
                <span className={`text-xl font-bold font-headline ${fundAvailable > 0 ? 'text-secondary' : 'text-error'}`}>{formatMoney(fundAvailable)} ₽</span>
              </div>
            </div>
            {fundWarning && (
              <div className="p-4 bg-warning-container rounded-2xl border-l-4 border-warning flex items-start gap-3">
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
            <div className="bg-surface-container rounded-2xl p-4 space-y-2">
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
                  <button key={f.label} onClick={() => setFundAmount(String(f.value))} className={`relative px-3 py-3 rounded-2xl transition-all text-center ${f.accent ? (fundAmount === String(f.value) ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'bg-secondary/10 text-secondary hover:bg-secondary/20') : (fundAmount === String(f.value) ? 'bg-tertiary text-white shadow-lg shadow-tertiary/20' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest')}`}>
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
