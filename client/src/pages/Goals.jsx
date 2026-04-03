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
  const [showArchived, setShowArchived] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm();

  const fetchGoals = async () => {
    try {
      const res = await api.get('/goals', { params: { archived: showArchived } });
      setGoals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, [showArchived]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
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
    setValue('target_date', goal.target_date?.slice(0, 10) || '');
    setValue('interest_rate', goal.interest_rate || '');
    setValue('current_amount', goal.current_amount);
    setValue('auto_contribute_enabled', goal.auto_contribute_enabled);
    setValue('auto_contribute_type', goal.auto_contribute_type || 'percentage');
    setValue('auto_contribute_value', goal.auto_contribute_value || '');
    setValue('is_family_goal', !!goal.family_id);
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

  const activeGoals = goals.filter(g => !g.archived && !g.achieved);
  const archivedGoals = goals.filter(g => g.archived || g.achieved);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Цели накоплений</h1>
        <div className="flex gap-2">
          {archivedGoals.length > 0 && (
            <button onClick={() => setShowArchived(!showArchived)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
              {showArchived ? 'Скрыть архив' : 'Показать архив'}
            </button>
          )}
          <button
            onClick={() => { setEditingId(null); reset({ auto_contribute_enabled: false, auto_contribute_type: 'percentage', auto_contribute_value: '', is_family_goal: false }); setModalOpen(true); }}
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
            <div key={goal.id} className={`rounded-lg shadow p-4 border ${achieved ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    {achieved && <span className="text-green-500 animate-pulse">✓</span>}
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
                <div className={`h-2.5 rounded-full transition-all duration-500 ${achieved ? 'bg-green-500' : 'bg-green-600'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
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
                <div className="mt-2 text-center text-sm text-green-600 dark:text-green-400 font-medium animate-pulse">
                  ✓ Цель достигнута!
                </div>
              )}

              <button
                onClick={() => openContribute(goal)}
                className="mt-3 w-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 py-2 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-500/25 transition font-medium"
              >
                Пополнить
              </button>
            </div>
          );
        })}
        {activeGoals.length === 0 && <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center py-8">Нет активных целей</p>}
      </div>

      {/* Архив целей */}
      {showArchived && archivedGoals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">📦 Архив целей</h2>
          <div className="space-y-2">
            {archivedGoals.map(g => (
              <div key={g.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 opacity-60">
                <div>
                  <span className="line-through text-gray-500 dark:text-gray-400">{g.name}</span>
                  <span className="ml-2 text-xs text-green-600">✓</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{formatMoney(g.current_amount)} / {formatMoney(g.target_amount)} ₽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ContributeModal
        isOpen={contributeOpen}
        onClose={() => { setContributeOpen(false); setContributeGoal(null); }}
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
