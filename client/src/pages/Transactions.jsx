import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    categoryId: '',
    includePrivate: 'all'
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  // Состояния для упрощённого выбора периода
  const [datePreset, setDatePreset] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Функция для обновления фильтров при смене пресета
  const updateDateFilter = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    let start = '', end = '';

    switch (preset) {
      case 'today':
        start = end = today.toISOString().slice(0,10);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        start = end = yesterday.toISOString().slice(0,10);
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        start = weekStart.toISOString().slice(0,10);
        end = today.toISOString().slice(0,10);
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        start = monthStart.toISOString().slice(0,10);
        end = today.toISOString().slice(0,10);
        break;
      case 'custom':
        start = customStart;
        end = customEnd;
        break;
      default:
        break;
    }
    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  };

  // Обновляем фильтры при изменении custom дат
  useEffect(() => {
    if (datePreset === 'custom') {
      setFilters(prev => ({ ...prev, startDate: customStart, endDate: customEnd }));
    }
  }, [customStart, customEnd, datePreset]);

  // Загрузка транзакций и категорий
  const fetchData = async () => {
    try {
      const [transRes, catRes] = await Promise.all([
        api.get('/transactions', { params: filters }),
        api.get('/categories')
      ]);
      setTransactions(transRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Инициализируем фильтр "сегодня" при первом рендере
    if (datePreset === 'today') {
      const today = new Date().toISOString().slice(0,10);
      setFilters(prev => ({ ...prev, startDate: today, endDate: today }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.type, filters.categoryId, filters.includePrivate]);

  const onSubmit = async (data) => {
    try {
      if (editingId) {
        await api.put(`/transactions/${editingId}`, data);
      } else {
        await api.post('/transactions', data);
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

  const openEditModal = (transaction) => {
    setEditingId(transaction.id);
    setValue('amount', transaction.amount);
    setValue('type', transaction.type);
    setValue('category_id', transaction.category_id);
    setValue('date', transaction.date);
    setValue('comment', transaction.comment || '');
    setValue('is_private', transaction.is_private || false);
    setModalOpen(true);
  };

  const deleteTransaction = async (id) => {
    if (window.confirm('Удалить операцию?')) {
      try {
        await api.delete(`/transactions/${id}`);
        fetchData();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Ошибка');
      }
    }
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: '',
      categoryId: '',
      includePrivate: 'all'
    });
    setDatePreset('custom');
    setCustomStart('');
    setCustomEnd('');
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Операции</h1>
        <button
          onClick={() => {
            setEditingId(null);
            reset({ type: 'expense', is_private: false });
            setModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          + Добавить операцию
        </button>
      </div>

      {/* Блок фильтров */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Период</label>
            <select
              value={datePreset}
              onChange={(e) => updateDateFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="today">Сегодня</option>
              <option value="yesterday">Вчера</option>
              <option value="week">Эта неделя</option>
              <option value="month">Этот месяц</option>
              <option value="custom">Произвольный период</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип операции</label>
            <select
              value={filters.type}
              onChange={e => setFilters({ ...filters, type: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Все типы</option>
              <option value="income">Доходы</option>
              <option value="expense">Расходы</option>
            </select>
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата от</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата до</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Категория</label>
            <select
              value={filters.categoryId}
              onChange={e => setFilters({ ...filters, categoryId: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Все категории</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Скрытые операции</label>
            <select
              value={filters.includePrivate}
              onChange={e => setFilters({ ...filters, includePrivate: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Все операции</option>
              <option value="only_visible">Только видимые</option>
              <option value="only_private">Только скрытые</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button onClick={resetFilters} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            Сбросить все фильтры
          </button>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {filters.startDate && filters.endDate
              ? `${filters.startDate} – ${filters.endDate}`
              : 'Фильтр не выбран'}
          </div>
        </div>
      </div>

      {/* Список транзакций */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Категория</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Сумма</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Комментарий</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Автор</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map(t => (
                <tr key={t.id} className={t.is_hidden ? 'bg-gray-50 dark:bg-gray-900/40' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {t.category_name}
                    {t.is_private && !t.is_hidden && <span className="ml-2 text-xs text-gray-400">🔒</span>}
                    {t.is_hidden && <span className="ml-2 text-xs text-gray-400">🔒 Скрыто</span>}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)} ₽
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{t.comment || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{t.user_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!t.is_hidden && (
                      <>
                        <button onClick={() => openEditModal(t)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-2">✏️</button>
                        <button onClick={() => deleteTransaction(t.id)} className="text-red-600 hover:text-red-900">🗑️</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Нет операций</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Редактировать операцию' : 'Добавить операцию'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сумма</label>
            <input
              type="number"
              step="0.01"
              {...register('amount', { required: true, min: 0.01 })}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
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
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Дата</label>
            <input type="date" {...register('date', { required: true })} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Комментарий</label>
            <textarea {...register('comment')} rows="2" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" {...register('is_private')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Скрыть от семьи (сюрприз)</label>
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