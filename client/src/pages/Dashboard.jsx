import { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { formatMoney } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10">Загрузка...</div>;
  if (!data) return <div className="text-center py-10 text-red-500">Ошибка загрузки данных</div>;

  const { month, totalBalance, reservedTotal, availableFunds, lastTransactions, activeGoals } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Главная</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Доходы за месяц</p>
          <p className="text-2xl font-bold text-green-600">{formatMoney(month.income)} ₽</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Расходы за месяц</p>
          <p className="text-2xl font-bold text-red-600">{formatMoney(month.expenses)} ₽</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Свободные средства</p>
          <p className={`text-2xl font-bold ${availableFunds >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
            {formatMoney(availableFunds)} ₽
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Общий баланс</p>
            <p className={`text-xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(totalBalance)} ₽</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Зарезервировано</p>
            <p className="text-xl font-bold text-yellow-600">{formatMoney(reservedTotal)} ₽</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Разница за месяц</p>
            <p className={`text-xl font-bold ${month.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(month.diff)} ₽</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Последние операции</h2>
          <Link to="/transactions" className="text-sm text-indigo-600 dark:text-indigo-400">Все операции →</Link>
        </div>
        <div className="space-y-2">
          {lastTransactions && lastTransactions.length > 0 ? lastTransactions.map(t => (
            <div key={t.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {t.is_hidden ? '🔒 Сюрприз' : (t.Category?.name || t.category_name || 'Без категории')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
              </div>
              <p className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                {t.type === 'income' ? '+' : '-'}{formatMoney(t.is_hidden ? 0 : t.amount)} ₽
              </p>
            </div>
          )) : <p className="text-gray-500 dark:text-gray-400">Нет операций</p>}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Цели накоплений</h2>
          <Link to="/goals" className="text-sm text-indigo-600 dark:text-indigo-400">Все цели →</Link>
        </div>
        <div className="space-y-3">
          {activeGoals && activeGoals.length > 0 ? activeGoals.map(g => {
            const progress = g.progress || ((Number(g.current_amount) / Number(g.target_amount)) * 100);
            const achieved = g.achieved || (Number(g.current_amount) >= Number(g.target_amount));
            return (
              <div key={g.id}>
                <div className="flex justify-between text-sm text-gray-900 dark:text-gray-100">
                  <span className="flex items-center gap-1">
                    {achieved && <span className="text-green-500">✓</span>}
                    {g.name}
                  </span>
                  <span>{formatMoney(g.current_amount)} / {formatMoney(g.target_amount)} ₽ ({Math.round(progress)}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                  <div className={`h-2 rounded-full transition-all duration-500 ${achieved ? 'bg-green-500' : 'bg-green-600'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
              </div>
            );
          }) : <p className="text-gray-500 dark:text-gray-400">Нет активных целей</p>}
        </div>
      </div>

      <div className="flex justify-center">
        <Link to="/transactions" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg shadow-lg transition-colors">
          + Добавить операцию
        </Link>
      </div>
    </div>
  );
}
