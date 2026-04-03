import { useState, useEffect } from 'react';
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
  const [editingId, setEditingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm();

  const fetchData = async () => {
    try {
      const [wRes, cRes] = await Promise.all([
        api.get('/wishes', { params: { showArchived: showArchived } }),
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
      const payload = { ...data, category_id: data.category_id ? Number(data.category_id) : undefined };
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
  };

  const handleFund = async (amount) => {
    if (!fundWish || !amount || amount <= 0) return;
    try {
      await api.post(`/wishes/${fundWish.id}/fund`, { amount: Number(amount) });
      setFundModalOpen(false);
      setFundWish(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const fundFractions = [
    { label: '1/2', value: 0.5 },
    { label: '1/3', value: 1/3 },
    { label: '1/4', value: 0.25 },
    { label: '1/5', value: 0.2 },
  ];

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Желания</h1>
        <div className="flex gap-2">
          {archivedWishes.length > 0 && (
            <button onClick={() => setShowArchived(!showArchived)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
              {showArchived ? 'Скрыть архив' : 'Показать архив'}
            </button>
          )}
          <button
            onClick={() => { setEditingId(null); reset({ priority: 2, status: 'active', is_private: false }); setModalOpen(true); }}
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
          return (
            <div key={wish.id} className={`rounded-lg shadow p-4 border ${wish.is_hidden ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
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
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{wish.name}</h3>
                        {wish.is_private && <span className="text-xs">🔒</span>}
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
                    <div className={`h-2.5 rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : 'bg-purple-600'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                  </div>

                  <div className="mt-2 flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Осталось: {formatMoney(remaining)} ₽</span>
                    <span className="text-gray-500 dark:text-gray-400">{Math.round(progress)}%</span>
                  </div>

                  {progress >= 100 && (
                    <div className="mt-2 text-center text-sm text-green-600 dark:text-green-400 font-medium animate-pulse">
                      ✓ Желание выполнено!
                    </div>
                  )}

                  {/* Быстрое пополнение долями */}
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Быстрое пополнение:</p>
                    <div className="flex gap-1 flex-wrap">
                      {fundFractions.map(f => (
                        <button
                          key={f.label}
                          onClick={() => {
                            const available = Math.max(0, remaining);
                            handleFund(Math.round(available * f.value * 100) / 100);
                          }}
                          className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-500/25 transition"
                        >
                          {f.label} ({formatMoney(Math.round(remaining * f.value * 100) / 100)} ₽)
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
            </div>
          );
        })}
        {activeWishes.length === 0 && <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center py-8">Нет активных желаний</p>}
      </div>

      {/* Архив желаний */}
      {showArchived && archivedWishes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">📦 Архив желаний</h2>
          <div className="space-y-2">
            {archivedWishes.map(w => (
              <div key={w.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 opacity-60">
                <div>
                  <span className="line-through text-gray-500 dark:text-gray-400">{w.name}</span>
                  <span className="ml-2 text-xs text-green-600">✓</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{formatMoney(w.saved_amount)} / {formatMoney(w.cost)} ₽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модальное окно добавления/редактирования */}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Категория расхода</label>
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

      {/* Модальное окно выделения средств */}
      <Modal isOpen={fundModalOpen} onClose={() => { setFundModalOpen(false); setFundWish(null); }} title="Выделить средства">
        {fundWish && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Пополнение: <span className="font-medium text-gray-900 dark:text-gray-100">{fundWish.name}</span>
            </p>
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Стоимость:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatMoney(fundWish.cost)} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Накоплено:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatMoney(fundWish.saved_amount)} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Осталось:</span>
                <span className="font-medium text-red-600">{formatMoney(Math.max(0, Number(fundWish.cost) - Number(fundWish.saved_amount)))} ₽</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сумма (₽)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={fundAmount}
                onChange={e => setFundAmount(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Введите сумму"
              />
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Быстрый выбор:</p>
              <div className="flex gap-1 flex-wrap">
                {fundFractions.map(f => {
                  const remaining = Math.max(0, Number(fundWish.cost) - Number(fundWish.saved_amount));
                  const val = Math.round(remaining * f.value * 100) / 100;
                  return (
                    <button
                      key={f.label}
                      onClick={() => setFundAmount(String(val))}
                      className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-500/25 transition"
                    >
                      {f.label} — {formatMoney(val)} ₽
                    </button>
                  );
                })}
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
