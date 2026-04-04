import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';

export default function Wishes() {
  const [wishes, setWishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [fundWish, setFundWish] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundAvailable, setFundAvailable] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showCelebration, setShowCelebration] = useState(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchData = async () => {
    try {
      const [wRes, cRes] = await Promise.all([
        api.get('/wishes', { params: { showArchived } }),
        api.get('/categories')
      ]);
      setWishes(wRes.data);
      setCategories(cRes.data.filter(c => c.type === 'expense'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [showArchived]);

  // Bento stats
  const totalBudget = useMemo(() => wishes.reduce((s, w) => s + Number(w.cost || 0), 0), [wishes]);
  const totalSaved = useMemo(() => wishes.reduce((s, w) => s + Number(w.saved_amount || 0), 0), [wishes]);
  const remainingTotal = useMemo(() => Math.max(0, totalBudget - totalSaved), [totalBudget, totalSaved]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, category_id: data.category_id ? Number(data.category_id) : undefined, created_at: todayStr };
      if (editingId) { await api.put(`/wishes/${editingId}`, payload); }
      else { await api.post('/wishes', payload); }
      setModalOpen(false); reset(); setEditingId(null); fetchData();
    } catch (err) { console.error(err); alert(err.response?.data?.message || 'Ошибка'); }
  };

  const openEditModal = (wish) => {
    setEditingId(wish.id);
    setValue('name', wish.name); setValue('cost', wish.cost); setValue('priority', wish.priority);
    setValue('status', wish.status); setValue('saved_amount', wish.saved_amount);
    setValue('is_private', wish.is_private); setValue('category_id', wish.category_id);
    setModalOpen(true);
  };

  const deleteWish = async (id) => {
    if (window.confirm('Удалить желание?')) {
      try { await api.delete(`/wishes/${id}`); fetchData(); }
      catch (err) { console.error(err); alert(err.response?.data?.message || 'Ошибка'); }
    }
  };

  const openFundModal = async (wish) => {
    setFundWish(wish); setFundAmount(''); setFundModalOpen(true);
    try { const res = await api.get('/dashboard'); setFundAvailable(res.data.availableFunds || 0); }
    catch (err) { console.error(err); setFundAvailable(0); }
  };

  const handleFund = async (amount) => {
    if (!fundWish || !amount || amount <= 0) return;
    try {
      const res = await api.post(`/wishes/${fundWish.id}/fund`, { amount: Number(amount) });
      setFundModalOpen(false); setFundWish(null); fetchData();
      if (res.data.saved_amount >= Number(fundWish.cost)) {
        setShowCelebration(fundWish.name);
        setTimeout(() => setShowCelebration(null), 3000);
      }
    } catch (err) { console.error(err); alert(err.response?.data?.message || 'Ошибка'); }
  };

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

  const priorityColors = { 1: 'text-error', 2: 'text-yellow-600', 3: 'text-secondary' };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );

  const activeWishes = wishes.filter(w => !w.archived && w.status !== 'completed');
  const archivedWishes = wishes.filter(w => w.archived || w.status === 'completed');

  return (
    <div className="space-y-8">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-surface-container-lowest rounded-3xl shadow-ambient p-8 text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <h3 className="text-2xl font-bold text-secondary font-headline">Желание выполнено!</h3>
            <p className="text-on-surface-variant mt-1">{showCelebration}</p>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Link to="/" className="hover:text-primary transition-colors">Главная</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-on-surface font-medium">Желания</span>
      </div>

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Желания</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            {activeWishes.length} активных, {archivedWishes.length} выполненных
          </p>
        </div>
        <div className="flex gap-2">
          {archivedWishes.length > 0 && (
            <button onClick={() => setShowArchived(!showArchived)} className="btn-ghost px-4 py-2.5 text-sm">
              {showArchived ? 'Скрыть архив' : 'Архив'}
            </button>
          )}
          <button
            onClick={() => { setEditingId(null); reset({ priority: 2, status: 'active', is_private: false, created_at: todayStr }); setModalOpen(true); }}
            className="btn-primary px-6 py-2.5 flex items-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Добавить желание
          </button>
        </div>
      </div>

      {/* Bento Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-card relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-tertiary/5 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined">favorite</span>
            </div>
            <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Общий бюджет</p>
          </div>
          <p className="text-3xl font-extrabold font-headline text-on-surface">{formatMoney(totalBudget)} ₽</p>
          <p className="text-xs text-on-surface-variant mt-2">Накоплено: {formatMoney(totalSaved)} ₽ ({totalBudget > 0 ? Math.round((totalSaved / totalBudget) * 100) : 0}%)</p>
        </div>
        <div className="bg-gradient-to-br from-primary to-primary-container text-white p-6 rounded-3xl shadow-button relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1">Доступно к распределению</p>
              <p className="text-3xl font-extrabold font-headline">{formatMoney(remainingTotal)} ₽</p>
              <p className="text-xs text-white/60 mt-2">Осталось накопить на все желания</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Wishes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeWishes.map(wish => {
          const progress = wish.progress || ((Number(wish.saved_amount) / Number(wish.cost)) * 100);
          const remaining = Math.max(0, Number(wish.cost) - Number(wish.saved_amount));
          const isCompleted = progress >= 100;
          return (
            <div key={wish.id} className={`p-6 rounded-3xl transition-all duration-300 ${
              isCompleted ? 'bg-secondary/5 border-2 border-secondary/30' : 'bg-surface-container-lowest shadow-card'
            }`}>
              {wish.is_hidden ? (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2">lock</span>
                  <p className="font-medium">Скрытое желание</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined ${priorityColors[wish.priority] || 'text-outline'}`}>
                          {wish.priority === 1 ? 'priority_high' : wish.priority === 2 ? 'signal_cellular_alt' : 'trending_down'}
                        </span>
                        <h3 className={`text-lg font-bold font-headline truncate ${isCompleted ? 'text-secondary line-through' : 'text-on-surface'}`}>
                          {wish.name}
                        </h3>
                        {wish.is_private && <span className="material-symbols-outlined text-sm text-on-surface-variant">lock</span>}
                        {isCompleted && <span className="material-symbols-outlined text-secondary animate-pulse">check_circle</span>}
                      </div>
                      <p className="text-sm text-on-surface-variant mt-1">
                        {formatMoney(wish.saved_amount)} / {formatMoney(wish.cost)} ₽
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-3">
                      <button onClick={() => openEditModal(wish)} className="w-9 h-9 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => deleteWish(wish.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-error hover:bg-error-container transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="progress-bar">
                      <div className={`progress-bar-fill ${isCompleted ? 'bg-secondary' : 'bg-tertiary'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs font-bold text-on-surface-variant uppercase">Осталось: {formatMoney(remaining)} ₽</span>
                      <span className="text-xs font-bold text-on-surface-variant uppercase">{Math.round(progress)}%</span>
                    </div>
                  </div>

                  {isCompleted && (
                    <div className="text-center text-sm text-secondary font-semibold animate-pulse mb-3">
                      🎉 Желание выполнено! Перемещено в архив
                    </div>
                  )}

                  {/* Quick fund + Fund button */}
                  {!isCompleted && remaining > 0 && (
                    <>
                      <div className="mb-3">
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Быстрое пополнение</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {fundOptions.slice(1, 5).map(f => (
                            <button key={f.label} onClick={() => handleFund(f.value)} className="chip hover:bg-tertiary-container hover:text-on-tertiary-container">
                              {f.label} ({formatMoney(f.value)} ₽)
                            </button>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => openFundModal(wish)} className="w-full btn-secondary py-3 text-sm">
                        <span className="material-symbols-outlined text-sm mr-1">savings</span>
                        Выделить средства
                      </button>
                    </>
                  )}
                </>
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

      {/* Archived Wishes */}
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
                  <button onClick={async () => { try { await api.put(`/wishes/${w.id}`, { archived: false, status: 'active' }); fetchData(); } catch (err) { console.error(err); } }} className="text-xs text-primary font-semibold hover:underline">
                    Вернуть
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Wish Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Редактировать желание' : 'Новое желание'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Название</label>
            <input {...register('name', { required: true })} className="input-ghost" placeholder="Например: Наушники" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Стоимость</label>
              <input type="number" step="0.01" {...register('cost', { required: true, min: 0.01 })} className="input-ghost" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Накоплено</label>
              <input type="number" step="0.01" {...register('saved_amount')} className="input-ghost" placeholder="0.00" />
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
            <button
              type="button"
              onClick={() => setValue('is_private', !watch('is_private'))}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                watch('is_private') ? 'bg-primary' : 'bg-outline-variant'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                watch('is_private') ? 'translate-x-5' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost px-6 py-3">Отмена</button>
            <button type="submit" className="btn-primary px-8 py-3">Сохранить</button>
          </div>
        </form>
      </Modal>

      {/* Fund Wish Modal */}
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
              <input type="number" step="0.01" min="0.01" value={fundAmount} onChange={e => setFundAmount(e.target.value)} className="input-ghost text-lg font-bold" placeholder="0.00" />
            </div>

            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Доля от остатка</p>
              <div className="grid grid-cols-3 gap-2">
                {fundOptions.map(f => (
                  <button
                    key={f.label}
                    onClick={() => setFundAmount(String(f.value))}
                    className={`relative px-3 py-3 rounded-2xl transition-all text-center ${
                      f.accent
                        ? fundAmount === String(f.value)
                          ? 'bg-secondary text-white shadow-lg shadow-secondary/20'
                          : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                        : fundAmount === String(f.value)
                          ? 'bg-tertiary text-white shadow-lg shadow-tertiary/20'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                    }`}
                  >
                    <div className="text-sm font-bold">{f.label}</div>
                    <div className={`text-xs mt-0.5 ${f.accent ? (fundAmount === String(f.value) ? 'text-white/80' : 'text-secondary/70') : (fundAmount === String(f.value) ? 'text-white/80' : 'text-on-surface-variant')}`}>{formatMoney(f.value)} ₽</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setFundModalOpen(false); setFundWish(null); }} className="btn-ghost px-6 py-3">Отмена</button>
              <button type="button" disabled={!fundAmount || Number(fundAmount) <= 0} onClick={() => handleFund(Number(fundAmount))} className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed">Пополнить</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
