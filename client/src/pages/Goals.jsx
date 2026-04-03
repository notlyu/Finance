import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import Modal from '../components/Modal';
import ForecastModal from '../components/ForecastModal';
import { formatMoney } from '../utils/format';
import Button from '../components/ui/Button';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [contribModalOpen, setContribModalOpen] = useState(false);
  const [contribGoal, setContribGoal] = useState(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribSelectedLabel, setContribSelectedLabel] = useState('');
  const [contribAvailable, setContribAvailable] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showCelebration, setShowCelebration] = useState(null);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [forecastGoal, setForecastGoal] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchData = async () => {
    try {
      const [gRes, cRes] = await Promise.all([
        api.get('/goals', { params: { archived: showArchived } }),
        api.get('/categories')
      ]);
      setGoals(gRes.data);
      setCategories(cRes.data.filter(c => c.type === 'expense'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      setModalOpen(false);
      reset();
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка');
    }
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
      try {
        await api.delete(`/goals/${id}`);
        fetchData();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Ошибка');
      }
    }
  };

  const openContribModal = async (goal) => {
    setContribGoal(goal);
    setContribAmount('');
    setContribSelectedLabel('');
    setContribModalOpen(true);
    try {
      const res = await api.get('/dashboard');
      setContribAvailable(res.data.availableFunds || 0);
    } catch (err) {
      console.error(err);
      setContribAvailable(0);
    }
  };

  const openForecast = (goal) => {
    setForecastGoal(goal);
    setForecastOpen(true);
  };

  const handleContribute = async (amount) => {
    if (!contribGoal || !amount || amount <= 0) return;
    try {
      // Найти категорию по умолчанию
      const cat = categories.find(c => /накоп|сбереж|цел/i.test(c.name)) || categories[0];
      const res = await api.post(`/goals/${contribGoal.id}/contribute`, {
        amount,
        createTransaction: true,
        category_id: cat?.id,
        comment: `Пополнение цели: ${contribGoal.name}`,
      });
      setContribModalOpen(false);
      setContribGoal(null);
      setContribSelectedLabel('');
      fetchData();
      const newAmount = res.data.current_amount;
      if (newAmount >= Number(contribGoal.target_amount)) {
        setShowCelebration(contribGoal.name);
        setTimeout(() => setShowCelebration(null), 3000);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  // Процентные кнопки — считаем от остатка цели, проверяем хватает ли свободных средств
  const contribOptions = useMemo(() => {
    if (!contribGoal) return [];
    const remaining = Math.max(0, Number(contribGoal.target_amount) - Number(contribGoal.current_amount));
    const pcts = [10, 25, 50, 75, 90, 100];
    return pcts.map(pct => {
      const value = Math.round(remaining * (pct / 100) * 100) / 100;
      const canAfford = value <= contribAvailable;
      return { label: `${pct}%`, value, pct, canAfford };
    }).filter(o => o.value > 0);
  }, [contribGoal, contribAvailable]);

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  const activeGoals = goals.filter(g => !g.archived && !g.achieved);
  const archivedGoals = goals.filter(g => g.archived || g.achieved);

  return (
    <div className="space-y-6">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <h3 className="text-2xl font-bold text-green-600">Цель достигнута!</h3>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{showCelebration}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Цели накоплений</h1>
        <div className="flex gap-2">
          {archivedGoals.length > 0 && (
            <button onClick={() => setShowArchived(!showArchived)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
              {showArchived ? 'Скрыть архив' : 'Архив'}
            </button>
          )}
          <button
            onClick={() => { setEditingId(null); reset({ auto_contribute_enabled: false, auto_contribute_type: 'percentage', auto_contribute_value: '', is_family_goal: false, target_date: todayStr }); setModalOpen(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            + Добавить цель
          </button>
        </div>
      </div>

      {/* Активные цели */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeGoals.map(goal => {
          const progress = goal.progress || ((Number(goal.current_amount) / Number(goal.target_amount)) * 100);
          const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));
          const achieved = goal.achieved || (Number(goal.current_amount) >= Number(goal.target_amount));
          return (
            <div key={goal.id} className={`rounded-lg shadow p-4 border transition-all duration-300 ${
              achieved
                ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className={`text-lg font-medium flex items-center gap-2 ${achieved ? 'text-green-700 dark:text-green-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                    {achieved && <span className="text-green-500 text-lg animate-pulse">✓</span>}
                    {goal.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatMoney(goal.current_amount)} / {formatMoney(goal.target_amount)} ₽
                  </p>
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => openEditModal(goal)} className="text-indigo-600 dark:text-indigo-400 p-1">✏️</button>
                  <button onClick={() => deleteGoal(goal.id)} className="text-red-600 p-1">🗑️</button>
                </div>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-3">
                <div className={`h-2.5 rounded-full transition-all duration-700 ${achieved ? 'bg-green-500' : 'bg-green-600'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
              </div>

              <div className="mt-2 flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">Осталось: {formatMoney(remaining)} ₽</span>
                <span className="text-gray-500 dark:text-gray-400">{Math.round(progress)}%</span>
              </div>

              {goal.target_date && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Срок: {new Date(goal.target_date).toLocaleDateString()}</p>
              )}
              {goal.interest_rate > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">Ставка: {goal.interest_rate}% годовых</p>
              )}
              {goal.auto_contribute_enabled && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                  Авто: {goal.auto_contribute_type === 'percentage' ? `${goal.auto_contribute_value}% от дохода` : `${formatMoney(goal.auto_contribute_value)} ₽/мес`}
                </p>
              )}

              {achieved && (
                <div className="mt-2 text-center text-sm text-green-600 dark:text-green-400 font-semibold animate-pulse">
                  🎉 Цель достигнута! Перемещена в архив
                </div>
              )}

              <button
                onClick={() => openContribModal(goal)}
                className="mt-3 w-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 py-2 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-500/25 transition font-medium"
              >
                Пополнить
              </button>
              <button
                onClick={() => openForecast(goal)}
                className="mt-2 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-1"
              >
                📊 Прогноз накоплений
              </button>
            </div>
          );
        })}
        {activeGoals.length === 0 && <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center py-8">Нет активных целей</p>}
      </div>

      {/* Архив целей */}
      {showArchived && archivedGoals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">📦 Архив выполненных</h2>
          <div className="space-y-2">
            {archivedGoals.map(g => (
              <div key={g.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="line-through text-gray-500 dark:text-gray-400">{g.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{formatMoney(g.current_amount)} / {formatMoney(g.target_amount)} ₽</span>
                  <button
                    onClick={async () => {
                      try {
                        await api.put(`/goals/${g.id}`, { archived: false });
                        fetchData();
                      } catch (err) { console.error(err); }
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Вернуть
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модальное окно пополнения цели */}
      <Modal isOpen={contribModalOpen} onClose={() => { setContribModalOpen(false); setContribGoal(null); }} title="Пополнить цель">
        {contribGoal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Цель: <span className="font-medium text-gray-900 dark:text-gray-100">{contribGoal.name}</span>
            </p>

            {/* Свободные средства */}
            <div className={`rounded-md p-3 text-sm border ${contribAvailable > 0 ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Свободные средства семьи:</span>
                <span className={`font-bold text-lg ${contribAvailable > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{formatMoney(contribAvailable)} ₽</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Целевая сумма:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatMoney(contribGoal.target_amount)} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Накоплено:</span>
                <span className="font-medium text-green-600">{formatMoney(contribGoal.current_amount)} ₽</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1">
                <span className="text-gray-600 dark:text-gray-300">Осталось:</span>
                <span className="font-medium text-red-600">{formatMoney(Math.max(0, Number(contribGoal.target_amount) - Number(contribGoal.current_amount)))} ₽</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сумма пополнения (₽)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={contribAmount}
                onChange={e => setContribAmount(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg font-medium"
                placeholder="Введите сумму"
              />
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">% от свободных средств:</p>
              <div className="grid grid-cols-3 gap-2">
                {contribOptions.map(o => (
                  <button
                    key={o.label}
                    onClick={() => {
                      if (!o.canAfford) return;
                      setContribAmount(String(o.value));
                      setContribSelectedLabel(o.label);
                    }}
                    disabled={!o.canAfford}
                    className={`relative px-3 py-3 rounded-xl transition border-2 text-center ${
                      !o.canAfford
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                        : o.pct === 100
                          ? contribSelectedLabel === o.label
                            ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-200 dark:shadow-green-900/30'
                            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40'
                          : contribSelectedLabel === o.label
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
                            : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                    }`}
                  >
                    <div className="text-sm font-semibold">{o.label}</div>
                    <div className={`text-xs mt-0.5 ${o.pct === 100 ? 'text-green-100' : 'opacity-70'}`}>{formatMoney(o.value)} ₽</div>
                    {!o.canAfford && <div className="text-[10px] text-red-400 mt-0.5">нет средств</div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setContribModalOpen(false); setContribGoal(null); }}>Отмена</Button>
              <Button variant="primary" disabled={!contribAmount || Number(contribAmount) <= 0} onClick={() => handleContribute(Number(contribAmount))}>
                Пополнить
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Прогнозный калькулятор */}
      <ForecastModal
        goal={forecastGoal}
        isOpen={forecastOpen}
        onClose={() => { setForecastOpen(false); setForecastGoal(null); }}
      />

      {/* Модальное окно добавления/редактирования */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Редактировать цель' : 'Новая цель'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Название</label>
            <input {...register('name', { required: true })} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Целевая сумма (₽)</label>
            <input type="number" step="0.01" {...register('target_amount', { required: true, min: 0.01 })} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Категория цели</label>
            <select {...register('category_id')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Без категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Срок (дата)</label>
            <input type="date" {...register('target_date')} defaultValue={todayStr} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Годовая ставка (%)</label>
            <input type="number" step="0.01" {...register('interest_rate')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Текущая сумма (₽)</label>
            <input type="number" step="0.01" {...register('current_amount')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" {...register('is_family_goal')} className="h-4 w-4 text-indigo-600" />
            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Семейная цель</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" {...register('auto_contribute_enabled')} className="h-4 w-4 text-indigo-600" />
            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Автозачисление</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Тип</label>
              <select {...register('auto_contribute_type')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="percentage">% от дохода</option>
                <option value="fixed">Фикс. сумма</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Значение</label>
              <input type="number" step="0.01" {...register('auto_contribute_value')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Отмена</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Сохранить</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
