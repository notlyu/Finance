import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';
import ContributeModal from '../components/ContributeModal';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  const fetchGoals = async () => {
    try {
      const res = await api.get('/goals');
      setGoals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const onSubmit = async (data) => {
    try {
      if (editingId) {
        await api.put(`/goals/${editingId}`, data);
      } else {
        await api.post('/goals', data);
      }
      setModalOpen(false);
      reset();
      setEditingId(null);
      fetchGoals();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const openEditModal = (goal) => {
    setEditingId(goal.id);
    setValue('name', goal.name);
    setValue('target_amount', goal.target_amount);
    setValue('target_date', goal.target_date?.slice(0,10) || '');
    setValue('interest_rate', goal.interest_rate || '');
    setValue('current_amount', goal.current_amount);
    setValue('auto_contribute_enabled', goal.auto_contribute_enabled);
    setValue('auto_contribute_type', goal.auto_contribute_type);
    setValue('auto_contribute_value', goal.auto_contribute_value);
    setModalOpen(true);
  };

  const deleteGoal = async (id) => {
    if (window.confirm('Удалить цель?')) {
      try {
        await api.delete(`/goals/${id}`);
        fetchGoals();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Ошибка');
      }
    }
  };

  const openContribute = (goal) => {
    setContributeGoal(goal);
    setContributeOpen(true);
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Цели накоплений</h1>
        <button
          onClick={() => {
            setEditingId(null);
            reset({
              auto_contribute_enabled: false,
              auto_contribute_type: 'percentage',
              auto_contribute_value: '',
            });
            setModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          + Добавить цель
        </button>
      </div>

      {/* Список целей */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(goal => {
          const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
          const remaining = Number(goal.target_amount) - Number(goal.current_amount);
          return (
            <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{goal.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatMoney(goal.current_amount)} / {formatMoney(goal.target_amount)} ₽
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => openEditModal(goal)} className="text-indigo-600 dark:text-indigo-400">✏️</button>
                  <button onClick={() => deleteGoal(goal.id)} className="text-red-600">🗑️</button>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
              </div>
              <div className="mt-2 flex justify-between items-center text-sm">
                <span className="text-gray-900 dark:text-gray-100">Осталось: {formatMoney(remaining)} ₽</span>
                {goal.target_date && (
                  <span className="text-gray-500 dark:text-gray-400">Срок: {new Date(goal.target_date).toLocaleDateString()}</span>
                )}
              </div>
              {goal.auto_contribute_enabled && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Автозачисление: {goal.auto_contribute_type === 'percentage'
                    ? `${goal.auto_contribute_value}% от дохода`
                    : `${goal.auto_contribute_value} ₽ в месяц`}
                </div>
              )}
              <button
                onClick={() => openContribute(goal)}
                className="mt-3 w-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 py-1 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-500/25 transition"
              >
                Пополнить
              </button>
            </div>
          );
        })}
        {goals.length === 0 && <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center">Нет целей. Добавьте первую!</p>}
      </div>

      <ContributeModal
        isOpen={contributeOpen}
        onClose={() => {
          setContributeOpen(false);
          setContributeGoal(null);
        }}
        title="Пополнить цель"
        subjectName={contributeGoal?.name}
        onContribute={async ({ amount, category_id }) => {
          if (!contributeGoal?.id) return;
          try {
            await api.post(`/goals/${contributeGoal.id}/contribute`, {
              amount,
              createTransaction: true,
              category_id,
              comment: `Пополнение цели: ${contributeGoal.name}`,
            });
            setContributeOpen(false);
            setContributeGoal(null);
            fetchGoals();
          } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Ошибка');
          }
        }}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Срок (дата)</label>
            <input type="date" {...register('target_date')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
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
            <input type="checkbox" {...register('auto_contribute_enabled')} className="h-4 w-4 text-indigo-600" />
            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Автозачисление</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Тип</label>
              <select {...register('auto_contribute_type')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="percentage">Процент от дохода</option>
                <option value="fixed">Фиксированная сумма</option>
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