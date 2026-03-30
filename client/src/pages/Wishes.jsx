import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';

export default function Wishes() {
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  const fetchWishes = async () => {
    try {
      const res = await api.get('/wishes');
      setWishes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishes();
  }, []);

  const onSubmit = async (data) => {
    try {
      if (editingId) {
        await api.put(`/wishes/${editingId}`, data);
      } else {
        await api.post('/wishes', data);
      }
      setModalOpen(false);
      reset();
      setEditingId(null);
      fetchWishes();
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
    setModalOpen(true);
  };

  const deleteWish = async (id) => {
    if (window.confirm('Удалить желание?')) {
      try {
        await api.delete(`/wishes/${id}`);
        fetchWishes();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Ошибка');
      }
    }
  };

  const contribute = async (id) => {
    const amount = prompt('Сумма пополнения (руб):');
    if (!amount) return;
    try {
      await api.post(`/wishes/${id}/contribute`, { amount });
      fetchWishes();
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const priorityLabels = {
    1: 'Высокий',
    2: 'Выше среднего',
    3: 'Средний',
    4: 'Ниже среднего',
    5: 'Низкий',
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Список желаний</h1>
        <button
          onClick={() => {
            setEditingId(null);
            reset({ priority: 3, status: 'active', is_private: false });
            setModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          + Добавить желание
        </button>
      </div>

      {/* Список желаний */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wishes.map(wish => {
          const isHidden = wish.is_hidden;
          const progress = (Number(wish.saved_amount) / Number(wish.cost)) * 100;
          const remaining = Number(wish.cost) - Number(wish.saved_amount);
          return (
            <div key={wish.id} className={`rounded-lg shadow p-4 border ${
              isHidden
                ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {isHidden ? '🔒 Скрытое желание' : wish.name}
                    {!isHidden && wish.is_private && <span className="ml-2 text-xs text-gray-400">🔒</span>}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isHidden
                      ? 'Скрыто от вас'
                      : `${formatMoney(wish.saved_amount)} / ${formatMoney(wish.cost)} ₽`}
                  </p>
                </div>
                {!isHidden && (
                  <div className="flex space-x-2">
                    <button onClick={() => openEditModal(wish)} className="text-indigo-600 dark:text-indigo-400">✏️</button>
                    <button onClick={() => deleteWish(wish.id)} className="text-red-600">🗑️</button>
                  </div>
                )}
              </div>
              {!isHidden && (
                <>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                  </div>
                  <div className="mt-2 flex justify-between items-center text-sm">
                    <span className="text-gray-900 dark:text-gray-100">Осталось: {formatMoney(remaining)} ₽</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Приоритет: {priorityLabels[wish.priority] || wish.priority}
                    </span>
                  </div>
                  <button
                    onClick={() => contribute(wish.id)}
                    className="mt-3 w-full bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 py-1 rounded-md hover:bg-purple-200 dark:hover:bg-purple-500/25 transition"
                  >
                    Пополнить
                  </button>
                </>
              )}
            </div>
          );
        })}
        {wishes.length === 0 && <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center">Нет желаний. Добавьте первое!</p>}
      </div>

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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Приоритет</label>
            <select {...register('priority')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="1">1 – Высокий</option>
              <option value="2">2 – Выше среднего</option>
              <option value="3">3 – Средний</option>
              <option value="4">4 – Ниже среднего</option>
              <option value="5">5 – Низкий</option>
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
    </div>
  );
}