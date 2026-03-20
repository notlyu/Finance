import { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [safetyPillow, setSafetyPillow] = useState(null);
  const [balance, setBalance] = useState({ income: 0, expense: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transRes, goalsRes, wishesRes, safetyRes] = await Promise.all([
          api.get('/transactions', { params: { limit: 5 } }),
          api.get('/goals'),
          api.get('/wishes'),
          api.get('/safety-pillow/current')
        ]);

        setTransactions(transRes.data);
        setGoals(goalsRes.data);
        setWishes(wishesRes.data);
        setSafetyPillow(safetyRes.data);

        // Расчёт баланса (за последний месяц)
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const recent = transRes.data.filter(t => new Date(t.date) >= oneMonthAgo);
        const income = recent.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = recent.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        setBalance({ income, expense, total: income - expense });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Главная</h1>

      {/* Баланс за месяц */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Доходы за месяц</p>
          <p className="text-2xl font-bold text-green-600">{balance.income.toLocaleString()} ₽</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Расходы за месяц</p>
          <p className="text-2xl font-bold text-red-600">{balance.expense.toLocaleString()} ₽</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Свободные средства</p>
          <p className="text-2xl font-bold text-indigo-600">{balance.total.toLocaleString()} ₽</p>
        </div>
      </div>

      {/* Подушка безопасности */}
      {safetyPillow && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Подушка безопасности</p>
              <p className="text-xl font-bold">{safetyPillow.current.toLocaleString()} ₽</p>
              <p className="text-xs text-gray-500">Цель: {safetyPillow.target.toLocaleString()} ₽</p>
            </div>
            <div className="w-32">
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(safetyPillow.progress, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{Math.round(safetyPillow.progress)}%</p>
            </div>
          </div>
          <Link to="/safety-pillow" className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 inline-block">Подробнее →</Link>
        </div>
      )}

      {/* Последние операции */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium">Последние операции</h2>
          <Link to="/transactions" className="text-sm text-indigo-600">Все операции →</Link>
        </div>
        <div className="space-y-2">
          {transactions.slice(0, 5).map(t => (
            <div key={t.id} className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="font-medium">{t.category_name || (t.is_hidden ? 'Скрытая операция' : '')}</p>
                <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
              </div>
              <p className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ₽
              </p>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-gray-500">Нет операций</p>}
        </div>
      </div>

      {/* Прогресс по целям */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium">Цели накоплений</h2>
          <Link to="/goals" className="text-sm text-indigo-600">Все цели →</Link>
        </div>
        <div className="space-y-3">
          {goals.slice(0, 3).map(g => {
            const progress = (g.current_amount / g.target_amount) * 100;
            return (
              <div key={g.id}>
                <div className="flex justify-between text-sm">
                  <span>{g.name}</span>
                  <span>{g.current_amount.toLocaleString()} / {g.target_amount.toLocaleString()} ₽</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
              </div>
            );
          })}
          {goals.length === 0 && <p className="text-gray-500">Нет активных целей</p>}
        </div>
      </div>

      {/* Желания с высоким приоритетом */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium">Активные желания</h2>
          <Link to="/wishes" className="text-sm text-indigo-600">Все желания →</Link>
        </div>
        <div className="space-y-3">
          {wishes.filter(w => w.status === 'active').slice(0, 3).map(w => {
            const progress = (w.saved_amount / w.cost) * 100;
            return (
              <div key={w.id}>
                <div className="flex justify-between text-sm">
                  <span>{w.name} {w.is_private && '🔒'}</span>
                  <span>{w.saved_amount.toLocaleString()} / {w.cost.toLocaleString()} ₽</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
              </div>
            );
          })}
          {wishes.filter(w => w.status === 'active').length === 0 && <p className="text-gray-500">Нет активных желаний</p>}
        </div>
      </div>
    </div>
  );
}