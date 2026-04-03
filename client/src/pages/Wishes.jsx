import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';
import Button from '../components/ui/Button';

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
  const { register, handleSubmit, reset, setValue } = useForm();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchData = async () => {
    try {
      const [wRes, cRes] = await Promise.all([
        api.get('/wishes', { params: { showArchived } }),
        api.get('/categories')
      ]);
      setWishes(wRes.data);
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
      const payload = {
        ...data,
        category_id: data.category_id ? Number(data.category_id) : undefined,
        created_at: todayStr
      };
      if (editingId) {
        await api.put(`/wishes/${editingId}`, payload);
      } else {
        await api.post('/wishes', payload);
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

  const openEditModal = (wish) => {
    setEditingId(wish.id);
    setValue('name', wish.name);
    setValue('cost', wish.cost);
    setValue('priority', wish.priority);
    setValue('status', wish.status);
    setValue('saved_amount', wish.saved_amount);
    setValue('is_private', wish.is_private);
    setValue('category_id', wish.category_id);
    setModalOpen(true);
  };

  const deleteWish = async (id) => {
    if (window.confirm('Удалить желание?')) {
      try {
        await api.delete(`/wishes/${id}`);
        fetchData();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Ошибка');
      }
    }
  };

  const openFundModal = async (wish) => {
    setFundWish(wish);
    setFundAmount('');
    setFundModalOpen(true);
    // Загрузить свободные средства с дашборда
    try {
      const res = await api.get('/dashboard');
      setFundAvailable(res.data.availableFunds || 0);
    } catch (err) {
      console.error(err);
      setFundAvailable(0);
    }
  };

  const handleFund = async (amount) => {
    if (!fundWish || !amount || amount <= 0) return;
    try {
      const res = await api.post(`/wishes/${fundWish.id}/fund`, { amount: Number(amount) });
      setFundModalOpen(false);
      setFundWish(null);
      fetchData();
      // Check if wish is now completed — show celebration
      const newSaved = res.data.saved_amount;
      if (newSaved >= Number(fundWish.cost)) {
        setShowCelebration(fundWish.name);
        setTimeout(() => setShowCelebration(null), 3000);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  // Доли от остатка + полное закрытие
  const fundOptions = useMemo(() => {
    if (!fundWish) return [];
    const remaining = Math.max(0, Number(fundWish.cost) - Number(fundWish.saved_amount));
    const opts = [
      { label: 'Полностью', value: remaining, accent: true },
      { label: '1/2', value: Math.round(remaining * 0.5 * 100) / 100 },
      { label: '1/3', value: Math.round(remaining / 3 * 100) / 100 },
      { label: '2/3', value: Math.round(remaining * 2 / 3 * 100) / 100 },
      { label: '1/4', value: Math.round(remaining * 0.25 * 100) / 100 },
      { label: '3/4', value: Math.round(remaining * 0.75 * 100) / 100 },
    ];
    return opts.filter(o => o.value > 0);
  }, [fundWish]);

  const priorityLabels = { 1: 'Высокий', 2: 'Средний', 3: 'Низкий' };
  const priorityColors = {
    1: 'text-red-500',
    2: 'text-yellow-500',
    3: 'text-green-500',
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  const activeWishes = wishes.filter(w => !w.archived && w.status !== 'completed');
  const archivedWishes = wishes.filter(w => w.archived || w.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <h3 className="text-2xl font-bold text-green-600">Желание выполнено!</h3>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{showCelebration}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Желания</h1>
        <div className="flex gap-2">
          {archivedWishes.length > 0 && (
            <button onClick={() => setShowArchived(!showArchived)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
              {showArchived ? 'Скрыть архив' : 'Архив'}
            </button>
          )}
          <button
            onClick={() => { setEditingId(null); reset({ priority: 2, status: 'active', is_private: false, created_at: todayStr }); setModalOpen(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            + Добавить желание
          </button>
        </div>
      </div>

      {/* Активные желания */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeWishes.map(wish => {
          const progress = wish.progress || ((Number(wish.saved_amount) / Number(wish.cost)) * 100);
          const remaining = Math.max(0, Number(wish.cost) - Number(wish.saved_amount));
          const isCompleted = progress >= 100;
          return (
            <div key={wish.id} className={`rounded-lg shadow p-4 border transition-all duration-300 ${
              isCompleted
                ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10 shadow-green-200 dark:shadow-green-900/20'
                : wish.is_hidden
                  ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}>
              {wish.is_hidden ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">🔒 Скрытое желание</div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={priorityColors[wish.priority] || 'text-gray-400'}>
                          {'★'.repeat(Math.min(wish.priority, 3))}{'☆'.repeat(Math.max(0, 3 - wish.priority))}
                        </span>
                        <h3 className={`text-lg font-medium ${isCompleted ? 'text-green-700 dark:text-green-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {wish.name}
                        </h3>
                        {wish.is_private && <span className="text-xs">🔒</span>}
                        {isCompleted && <span className="text-green-500 text-lg animate-pulse">✓</span>}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatMoney(wish.saved_amount)} / {formatMoney(wish.cost)} ₽
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <button onClick={() => openEditModal(wish)} className="text-indigo-600 dark:text-indigo-400 p-1">✏️</button>
                      <button onClick={() => deleteWish(wish.id)} className="text-red-600 p-1">🗑️</button>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-3">
                    <div className={`h-2.5 rounded-full transition-all duration-700 ${isCompleted ? 'bg-green-500' : 'bg-purple-600'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                  </div>

                  <div className="mt-2 flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Осталось: {formatMoney(remaining)} ₽</span>
                    <span className="text-gray-500 dark:text-gray-400">{Math.round(progress)}%</span>
                  </div>

                  {isCompleted && (
                    <div className="mt-2 text-center text-sm text-green-600 dark:text-green-400 font-semibold animate-pulse">
                      🎉 Желание выполнено! Перемещено в архив
                    </div>
                  )}

                      {/* Быстрое пополнение долями — только если не выполнено */}
                      {!isCompleted && remaining > 0 && (
                        <>
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Быстрое пополнение:</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {fundOptions.slice(1, 5).map(f => (
                                <button
                                  key={f.label}
                                  onClick={() => handleFund(f.value)}
                                  className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-500/25 transition"
                                >
                                  {f.label} ({formatMoney(f.value)} ₽)
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => openFundModal(wish)}
                            className="mt-2 w-full bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 py-2 rounded-md hover:bg-purple-200 dark:hover:bg-purple-500/25 transition font-medium"
                          >
                            Выделить средства
                          </button>
                        </>
                      )}
                </>
              )}
            </div>
          );
        })}
        {activeWishes.length === 0 && <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center py-8">Нет активных желаний</p>}
      </div>

      {/* Архив желаний */}
      {showArchived && archivedWishes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">📦 Архив выполненных</h2>
          <div className="space-y-2">
            {archivedWishes.map(w => (
              <div key={w.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="line-through text-gray-500 dark:text-gray-400">{w.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{formatMoney(w.saved_amount)} / {formatMoney(w.cost)} ₽</span>
                  <button
                    onClick={async () => {
                      try {
                        await api.put(`/wishes/${w.id}`, { archived: false, status: 'active' });
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

      {/* Модальное окно добавления/редактирования желания */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Редактировать желание' : 'Новое желание'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Название</label>
            <input {...register('name', { required: true })} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Стоимость (₽)</label>
            <input type="number" step="0.01" {...register('cost', { required: true, min: 0.01 })} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Категория желания</label>
            <select {...register('category_id')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Без категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Приоритет</label>
            <select {...register('priority')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="1">★ Высокий</option>
              <option value="2">★★ Средний</option>
              <option value="3">★★★ Низкий</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Статус</label>
            <select {...register('status')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="active">Активно</option>
              <option value="completed">Выполнено</option>
              <option value="postponed">Отложено</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Уже накоплено (₽)</label>
            <input type="number" step="0.01" {...register('saved_amount')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" {...register('is_private')} className="h-4 w-4 text-indigo-600" />
            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Скрыть от семьи (сюрприз)</label>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Отмена</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Сохранить</button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно выделения средств — БЕЗ выбора категории */}
      <Modal isOpen={fundModalOpen} onClose={() => { setFundModalOpen(false); setFundWish(null); }} title="Выделить средства">
        {fundWish && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Пополнение: <span className="font-medium text-gray-900 dark:text-gray-100">{fundWish.name}</span>
            </p>

            {/* Свободные средства */}
            <div className={`rounded-md p-3 text-sm border ${fundAvailable > 0 ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Свободные средства семьи:</span>
                <span className={`font-bold text-lg ${fundAvailable > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{formatMoney(fundAvailable)} ₽</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Стоимость:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatMoney(fundWish.cost)} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Накоплено:</span>
                <span className="font-medium text-green-600">{formatMoney(fundWish.saved_amount)} ₽</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1">
                <span className="text-gray-600 dark:text-gray-300">Осталось:</span>
                <span className="font-medium text-red-600">{formatMoney(Math.max(0, Number(fundWish.cost) - Number(fundWish.saved_amount)))} ₽</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сумма пополнения (₽)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={fundAmount}
                onChange={e => setFundAmount(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg font-medium"
                placeholder="Введите сумму"
              />
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Выберите долю от остатка:</p>
              <div className="grid grid-cols-3 gap-2">
                {fundOptions.map(f => (
                  <button
                    key={f.label}
                    onClick={() => setFundAmount(String(f.value))}
                    className={`relative px-3 py-3 rounded-xl transition border-2 text-center ${
                      f.accent
                        ? fundAmount === String(f.value)
                          ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-200 dark:shadow-green-900/30'
                          : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40'
                        : fundAmount === String(f.value)
                          ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200 dark:shadow-purple-900/30'
                          : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-500/20'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${f.accent ? '' : ''}`}>{f.label}</div>
                    <div className={`text-xs mt-0.5 ${f.accent ? 'text-green-100' : 'opacity-70'}`}>{formatMoney(f.value)} ₽</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setFundModalOpen(false); setFundWish(null); }}>Отмена</Button>
              <Button variant="primary" disabled={!fundAmount || Number(fundAmount) <= 0} onClick={() => handleFund(Number(fundAmount))}>
                Пополнить
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
