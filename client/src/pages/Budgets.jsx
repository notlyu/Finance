import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useForm } from 'react-hook-form';
import { formatMoney } from '../utils/format';
import SectionHeader from '../components/ui/SectionHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetsRes, catRes] = await Promise.all([
        api.get('/budgets', { params: { month } }),
        api.get('/categories'),
      ]);
      setItems(budgetsRes.data?.items || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const onCreate = async (data) => {
    try {
      await api.post('/budgets', {
        month,
        type: data.type,
        category_id: Number(data.category_id),
        limit_amount: Number(data.limit_amount),
      });
      setModalOpen(false);
      reset();
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const onUpdate = async (id, nextLimit) => {
    try {
      await api.put(`/budgets/${id}`, { limit_amount: Number(nextLimit) });
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Удалить бюджет?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const totals = useMemo(() => {
    const byType = { income: { limit: 0, actual: 0 }, expense: { limit: 0, actual: 0 } };
    for (const i of items) {
      byType[i.type].limit += Number(i.limit_amount || 0);
      byType[i.type].actual += Number(i.actual_amount || 0);
    }
    return byType;
  }, [items]);

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Бюджеты"
        subtitle="План/факт по категориям за месяц."
        right={
          <>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            <Button
              variant="primary"
              onClick={() => {
                reset({ type: 'expense' });
                setModalOpen(true);
              }}
            >
              + Добавить
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Расходы (всего)</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatMoney(totals.expense.actual)} / {formatMoney(totals.expense.limit)} ₽
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Доходы (всего)</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatMoney(totals.income.actual)} / {formatMoney(totals.income.limit)} ₽
          </p>
        </Card>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Тип</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Категория</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">План</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Факт</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Прогресс</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((b) => {
                const progress = Math.min(100, Math.round(Number(b.progress || 0)));
                const isOver = Number(b.actual_amount || 0) > Number(b.limit_amount || 0);
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {b.type === 'expense' ? 'Расход' : 'Доход'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {b.category_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {formatMoney(b.limit_amount)} ₽
                    </td>
                    <td className={`px-4 py-3 text-sm ${isOver ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                      {formatMoney(b.actual_amount)} ₽
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-40 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`${isOver ? 'bg-red-600' : 'bg-indigo-600'} h-2 rounded-full`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{progress}%</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => {
                          const next = prompt('Новый план (₽):', String(Math.trunc(Number(b.limit_amount || 0))));
                          if (!next) return;
                          onUpdate(b.id, next);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline mr-3"
                      >
                        Изменить
                      </button>
                      <button onClick={() => onDelete(b.id)} className="text-red-600 hover:underline">
                        Удалить
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="Нет бюджетов" description="Добавьте первый бюджет на этот месяц." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Новый бюджет">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Тип</label>
            <select
              {...register('type', { required: true })}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="expense">Расход</option>
              <option value="income">Доход</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Категория</label>
            <select
              {...register('category_id', { required: true })}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Выберите категорию</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'income' ? 'Доход' : 'Расход'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">План (₽)</label>
            <input
              type="number"
              step="1"
              {...register('limit_amount', { required: true, min: 1 })}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Отмена
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Сохранить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

