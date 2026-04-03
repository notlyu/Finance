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
import { formatMoney } from '../utils/format';
import * as XLSX from 'xlsx';

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
  const [periodPreset, setPeriodPreset] = useState('12m'); // 3m,6m,12m,custom
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#E5E7EB' : '#111827';
  const gridColor = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.35)';

  const resolvePeriod = () => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 1); // start of next month
    if (periodPreset === 'custom' && startDate && endDate) {
      return { start: startDate, end: endDate };
    }
    const monthsBack = periodPreset === '3m' ? 3 : periodPreset === '6m' ? 6 : 12;
    const start = new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1), 1);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  };

  const period = resolvePeriod();
  const periodLabel = periodPreset === 'custom' ? `${period.start} – ${period.end}` : (periodPreset === '3m' ? '3 месяца' : periodPreset === '6m' ? '6 месяцев' : '12 месяцев');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dynamicsRes, expensesRes, incomeRes, pillowRes] = await Promise.all([
          api.get('/reports/dynamics', { params: { startDate: period.start, endDate: period.end } }),
          api.get('/reports/expenses-by-category', { params: { startDate: period.start, endDate: period.end } }),
          api.get('/reports/income-by-category', { params: { startDate: period.start, endDate: period.end } }),
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
  }, [periodPreset, startDate, endDate]);

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textColor,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)} ₽`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: textColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
        grid: { color: gridColor },
      },
      y: {
        ticks: {
          color: textColor,
          callback: (v) => `${formatMoney(v)} ₽`,
        },
        grid: { color: gridColor },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textColor,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatMoney(ctx.parsed)} ₽`,
        },
      },
    },
  };

  const lineData = {
    labels: dynamics.labels,
    datasets: [
      {
        label: 'Доходы',
        data: dynamics.income,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.18)',
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Расходы',
        data: dynamics.expense,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const topN = (data, n = 6) => {
    const sorted = [...data].sort((a, b) => Number(b.total) - Number(a.total));
    const top = sorted.slice(0, n);
    const rest = sorted.slice(n);
    const restTotal = rest.reduce((s, x) => s + Number(x.total || 0), 0);
    const out = [...top];
    if (restTotal > 0) out.push({ name: 'Остальное', total: restTotal });
    return out;
  };

  const pieData = (data, label) => {
    const processed = topN(data, 6);
    return {
      labels: processed.map(item => item.name),
    datasets: [
      {
        label,
          data: processed.map(item => Number(item.total)),
        backgroundColor: [
          '#4F46E5',
          '#0EA5E9',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#A855F7',
          '#14B8A6',
          '#F97316',
        ],
        borderColor: isDark ? 'rgba(17,24,39,0.8)' : 'rgba(255,255,255,0.9)',
        borderWidth: 1,
      },
    ],
    };
  };

  const pillowLineData = {
    labels: pillowHistory.map(h => new Date(h.calculated_at).toLocaleDateString()).reverse(),
    datasets: [
      {
        label: 'Подушка безопасности',
        data: pillowHistory.map(h => Number(h.value)).reverse(),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.18)',
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const exportCSV = () => {
    const params = periodPreset === 'custom' && startDate && endDate
      ? `?startDate=${startDate}&endDate=${endDate}`
      : `?startDate=${period.start}&endDate=${period.end}`;
    window.open(`/api/reports/export${params}`, '_blank');
  };

  const exportExcel = () => {
    const params = periodPreset === 'custom' && startDate && endDate
      ? `?startDate=${startDate}&endDate=${endDate}`
      : `?startDate=${period.start}&endDate=${period.end}`;
    api.get('/reports/export' + params, { responseType: 'blob' })
      .then(res => {
        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Аналитика</h1>
        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            📊 CSV
          </button>
          <button
            onClick={exportExcel}
            className="bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 px-4 py-2 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-500/25"
          >
            ⬇️ Excel
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Период отчёта</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{periodLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="3m">Последние 3 месяца</option>
              <option value="6m">Последние 6 месяцев</option>
              <option value="12m">Последние 12 месяцев</option>
              <option value="custom">Произвольный</option>
            </select>
            {periodPreset === 'custom' && (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Динамика доходов и расходов */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">Динамика доходов и расходов (по месяцам)</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Сравнение доходов и расходов по месяцам за выбранный период.
        </p>
        <div className="h-72 md:h-80">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>

      {/* Расходы по категориям */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">Расходы по категориям</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Куда уходят деньги за выбранный период отчёта.
          </p>
          {expensesByCat.length > 0 ? (
            <div className="h-72 md:h-80">
              <Pie data={pieData(expensesByCat, 'Расходы')} options={pieOptions} />
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Нет данных</p>
          )}
        </div>

        {/* Доходы по категориям */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">Доходы по категориям</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Источники дохода по категориям.
          </p>
          {incomeByCat.length > 0 ? (
            <div className="h-72 md:h-80">
              <Pie data={pieData(incomeByCat, 'Доходы')} options={pieOptions} />
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Нет данных</p>
          )}
        </div>
      </div>

      {/* График подушки безопасности */}
      {pillowHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">Динамика подушки безопасности</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Как менялась “подушка” по пересчётам.
          </p>
          <div className="h-64 md:h-72">
            <Line data={pillowLineData} options={lineOptions} />
          </div>
        </div>
      )}
    </div>
  );
}