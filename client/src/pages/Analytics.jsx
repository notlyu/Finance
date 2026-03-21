import { useState, useEffect } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import api from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Analytics() {
  const [dynamics, setDynamics] = useState({ labels: [], income: [], expense: [] });
  const [expensesByCat, setExpensesByCat] = useState([]);
  const [incomeByCat, setIncomeByCat] = useState([]);
  const [pillowHistory, setPillowHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dynamicsRes, expensesRes, incomeRes, pillowRes] = await Promise.all([
          api.get('/reports/dynamics'),
          api.get('/reports/expenses-by-category'),
          api.get('/reports/income-by-category'),
          api.get('/safety-pillow/history', { params: { limit: 12 } }),
        ]);
        setDynamics(dynamicsRes.data);
        setExpensesByCat(expensesRes.data);
        setIncomeByCat(incomeRes.data);
        setPillowHistory(pillowRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  const lineData = {
    labels: dynamics.labels,
    datasets: [
      {
        label: 'Доходы',
        data: dynamics.income,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        tension: 0.3,
      },
      {
        label: 'Расходы',
        data: dynamics.expense,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.3,
      },
    ],
  };

  const pieData = (data, label) => ({
    labels: data.map(item => item.name),
    datasets: [
      {
        label,
        data: data.map(item => item.total),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        ],
      },
    ],
  });

  const pillowLineData = {
    labels: pillowHistory.map(h => new Date(h.calculated_at).toLocaleDateString()).reverse(),
    datasets: [
      {
        label: 'Подушка безопасности',
        data: pillowHistory.map(h => h.value).reverse(),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        tension: 0.3,
      },
    ],
  };

  const exportCSV = () => {
    // Простой экспорт транзакций за последние 3 месяца
    api.get('/transactions', { params: { startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0,10) } })
      .then(res => {
        const transactions = res.data;
        const headers = ['Дата', 'Категория', 'Сумма', 'Тип', 'Комментарий'];
        const rows = transactions.map(t => [
          t.date,
          t.category_name,
          t.amount,
          t.type === 'income' ? 'Доход' : 'Расход',
          t.comment || '',
        ]);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'transactions.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(err => console.error(err));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>
        <button
          onClick={exportCSV}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          📊 Экспорт CSV
        </button>
      </div>

      {/* Динамика доходов и расходов */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium mb-4">Динамика доходов и расходов (по месяцам)</h2>
        <Line data={lineData} />
      </div>

      {/* Расходы по категориям */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-4">Расходы по категориям</h2>
          {expensesByCat.length > 0 ? (
            <Pie data={pieData(expensesByCat, 'Расходы')} />
          ) : (
            <p className="text-gray-500">Нет данных</p>
          )}
        </div>

        {/* Доходы по категориям */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-4">Доходы по категориям</h2>
          {incomeByCat.length > 0 ? (
            <Pie data={pieData(incomeByCat, 'Доходы')} />
          ) : (
            <p className="text-gray-500">Нет данных</p>
          )}
        </div>
      </div>

      {/* График подушки безопасности */}
      {pillowHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-4">Динамика подушки безопасности</h2>
          <Line data={pillowLineData} />
        </div>
      )}
    </div>
  );
}