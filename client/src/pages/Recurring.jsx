import { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useForm } from 'react-hook-form';
import { formatMoney } from '../utils/format';
import SectionHeader from '../components/ui/SectionHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function Recurring() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, catRes] = await Promise.all([
        api.get('/recurring'),
        api.get('/categories'),
      ]);
      setItems(recRes.data || []);
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
  }, []);

  const onCreate = async (data) => {
    try {
      await api.post('/recurring', {
        type: data.type,
        amount: Number(data.amount),
        category_id: Number(data.category_id),
        day_of_month: Number(data.day_of_month),
        comment: data.comment,
        is_private: !!data.is_private,
      });
      setModalOpen(false);
      reset();
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/recurring/${item.id}`, { active: !item.active });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Удалить регулярную операцию?')) return;
    try {
      await api.delete(`/recurring/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Регулярные операции"
        subtitle="Автоматически создаются раз в месяц (день 1–28)."
        right={
          <Button
            variant="primary"
            onClick={() => {
              reset({ type: 'expense', day_of_month: 1, is_private: false });
              setModalOpen(true);
            }}
          >
            + Добавить
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Активно</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Тип</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Категория</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Сумма</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">День</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Комментарий</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => toggleActive(i)}
                      className={`px-3 py-1.5 rounded-md text-sm ${
                        i.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {i.active ? 'Да' : 'Нет'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{i.type === 'income' ? 'Доход' : 'Расход'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{i.category_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatMoney(i.amount)} ₽</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{i.day_of_month}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{i.comment || '—'}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button onClick={() => remove(i.id)} className="text-red-600 hover:underline">Удалить</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    Нет регулярных операций
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Новая регулярная операция">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Тип</label>
            <select {...register('type', { required: true })} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="expense">Расход</option>
              <option value="income">Доход</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Категория</label>
            <select {...register('category_id', { required: true })} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Выберите категорию</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.type === 'income' ? 'Доход' : 'Расход'})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сумма (₽)</label>
              <input type="number" step="1" {...register('amount', { required: true, min: 1 })} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">День месяца</label>
              <input type="number" min="1" max="28" {...register('day_of_month', { required: true, min: 1, max: 28 })} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Комментарий</label>
            <input {...register('comment')} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" {...register('is_private')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Скрыть от семьи</label>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Отмена</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Сохранить</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

