import { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import api, { downloadFile } from '../services/api';
import { formatMoney } from '../utils/format';
import logger from '../utils/logger';
import { SkeletonChart } from '../components/ui/Skeleton';
import { localDateStr } from '../utils/date';
import Modal from '../components/Modal';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Title, Tooltip, Legend, ArcElement, Filler
);

export default function Analytics({ space = 'personal' }) {
  const navigate = useNavigate();
  const { selectedMember } = useOutletContext() || {};
  const [dynamics, setDynamics] = useState({ labels: [], income: [], expense: [] });
  const [expensesByCat, setExpensesByCat] = useState([]);
  const [incomeByCat, setIncomeByCat] = useState([]);
  const [pillowHistory, setPillowHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodPreset, setPeriodPreset] = useState('12m');
  const todayStr = localDateStr();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [compareMode, setCompareMode] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [netWorth, setNetWorth] = useState(null);
  const [drillDown, setDrillDown] = useState({ open: false, title: '', transactions: [], loading: false });
  const [budgets, setBudgets] = useState([]);
  const [forecast, setForecast] = useState(null);

  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#E5E7EB' : '#0b1c30';
  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(199,196,216,0.3)';

  useEffect(() => {
    const observer = new MutationObserver(() => forceUpdate());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const resolvePeriod = () => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    if (periodPreset === 'custom' && startDate && endDate) return { start: startDate, end: endDate };
    const monthsBack = periodPreset === '3m' ? 3 : periodPreset === '6m' ? 6 : 12;
    const start = new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1), 1);
    return { start: localDateStr(start), end: localDateStr(end) };
  };

  const { start: periodStart, end: periodEnd } = resolvePeriod();
  const periodLabel = periodPreset === 'custom' ? `${periodStart} – ${periodEnd}` : (periodPreset === '3m' ? '3 месяца' : periodPreset === '6m' ? '6 месяцев' : '12 месяцев');

  const apiParams = useMemo(() => {
    const p = { startDate: periodStart, endDate: periodEnd, start: periodStart, end: periodEnd };
    if (selectedMember?.id) p.memberId = selectedMember.id;
    return p;
  }, [periodStart, periodEnd, selectedMember]);

  useEffect(() => {
    const fetchDynamics = async () => {
      try {
        const res = await api.get('/reports/dynamics', { params: apiParams });
        setDynamics(res.data);
      } catch (err) { logger.error('Dynamics fetch error:', err); }
    };

    const fetchExpensesByCat = async () => {
      try {
        const res = await api.get('/reports/expenses-by-category', { params: apiParams });
        setExpensesByCat(res.data);
      } catch (err) { logger.error('Expenses by category fetch error:', err); }
    };

    const fetchIncomeByCat = async () => {
      try {
        const res = await api.get('/reports/income-by-category', { params: apiParams });
        setIncomeByCat(res.data);
      } catch (err) { logger.error('Income by category fetch error:', err); }
    };

    const fetchPillowHistory = async () => {
      try {
        const res = await api.get('/safety-pillow/history', { params: { limit: 12 } });
        setPillowHistory(res.data?.items || res.data || []);
      } catch (err) { logger.error('Pillow history fetch error:', err); }
    };

    const fetchComparison = async () => {
      try {
        const res = await api.get('/reports/compare', { params: apiParams });
        setComparison(res.data);
      } catch (err) { logger.error('Comparison fetch error:', err); }
    };

    const fetchNetWorth = async () => {
      try {
        const res = await api.get('/reports/net-worth', { params: { months: periodPreset === '3m' ? 3 : periodPreset === '6m' ? 6 : 12 } });
        setNetWorth(res.data);
      } catch (err) { logger.error('Net worth fetch error:', err); }
    };

    const fetchBudgets = async () => {
      try {
        const today = new Date();
        const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const res = await api.get('/budgets', { params: { month } });
        setBudgets(res.data?.items || []);
      } catch (err) { /* budgets may not exist */ }
    };

    const fetchForecast = async () => {
      try {
        const res = await api.get('/reports/forecast', { params: apiParams });
        setForecast(res.data);
      } catch (err) { logger.error('Forecast fetch error:', err); }
    };

    setLoading(true);
    setComparison(null);
    setNetWorth(null);
    setForecast(null);
    Promise.allSettled([
      fetchDynamics(),
      fetchExpensesByCat(),
      fetchIncomeByCat(),
      fetchPillowHistory(),
      fetchComparison(),
      fetchNetWorth(),
      fetchBudgets(),
      fetchForecast(),
    ]).finally(() => setLoading(false));
  }, [periodPreset, startDate, endDate, periodStart, periodEnd, selectedMember, apiParams]);

  const chartOptions = useCallback(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: 'circle' } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)} ₽` } },
    },
    scales: {
      x: { ticks: { color: textColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { color: gridColor } },
      y: { ticks: { color: textColor, callback: (v) => `${formatMoney(v)} ₽` }, grid: { color: gridColor } },
    },
  }), [textColor, gridColor]);

  const donutOptions = useCallback(() => ({
    responsive: true, maintainAspectRatio: false,
    cutout: '65%',
    onClick: (_, elements) => {
      if (elements.length > 0) handleDrillDown(elements[0].index);
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatMoney(ctx.parsed)} ₽` } },
    },
    // handleDrillDown объявлен ниже и пересоздаётся каждый рендер; добавлять в deps нельзя
    // (TDZ — он определён после этого useCallback). Поведение drill-down не зависит от мемоизации.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const pillowBarOptions = useCallback(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${formatMoney(ctx.parsed.y)} ₽` } } },
    scales: {
      x: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { display: false } },
      y: { ticks: { color: 'rgba(255,255,255,0.7)', callback: (v) => `${formatMoney(v)} ₽` }, grid: { color: 'rgba(255,255,255,0.1)' } },
    },
  }), []);

  const donutColors = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#0ea5e9', '#6b7280'];

  const lineData = useMemo(() => ({
    labels: dynamics.labels,
    datasets: [
      { label: 'Доходы', data: dynamics.income, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', pointRadius: 3, pointHoverRadius: 5, borderWidth: 2.5, tension: 0.35, fill: true },
      { label: 'Расходы', data: dynamics.expense, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)', pointRadius: 3, pointHoverRadius: 5, borderWidth: 2.5, tension: 0.35, fill: true },
    ],
  }), [dynamics]);

  const topN = (data, n = 5) => {
    const sorted = [...data].sort((a, b) => Number(b.total) - Number(a.total));
    const top = sorted.slice(0, n);
    const rest = sorted.slice(n);
    const restTotal = rest.reduce((s, x) => s + Number(x.total || 0), 0);
    const out = [...top];
    if (restTotal > 0) out.push({ name: 'Остальное', total: restTotal });
    return out;
  };

  const donutData = (data) => {
    const processed = topN(data, 5);
    const total = processed.reduce((s, x) => s + Number(x.total || 0), 0);
    return {
      labels: processed.map(item => item.name),
      datasets: [{
        data: processed.map(item => Number(item.total)),
        backgroundColor: donutColors.slice(0, processed.length),
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 8,
      }],
      total,
    };
  };

  const pillowBarData = useMemo(() => ({
    labels: pillowHistory.slice(-6).map(h => {
      const d = new Date(h.calculated_at);
      return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
    }),
    datasets: [{
      data: pillowHistory.slice(-6).map(h => Number(h.safety_pillow)),
      backgroundColor: pillowHistory.slice(-6).map((_, i) => {
        const opacity = 0.25 + (i / 5) * 0.75;
        return `rgba(255, 255, 255, ${opacity})`;
      }),
      borderRadius: 8,
      borderSkipped: false,
    }],
  }), [pillowHistory]);

  const netWorthLineData = useMemo(() => {
    if (!netWorth?.monthly) return null;
    return {
      labels: netWorth.monthly.map(m => m.label),
      datasets: [
        { label: 'Капитал', data: netWorth.monthly.map(m => m.netWorth), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.15)', pointRadius: 3, pointHoverRadius: 5, borderWidth: 2.5, tension: 0.35, fill: true },
        { label: 'Норма сбережений %', data: netWorth.monthly.map(m => m.savingsRate), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', pointRadius: 3, pointHoverRadius: 5, borderWidth: 2, tension: 0.35, fill: false, yAxisID: 'y1' },
      ],
    };
  }, [netWorth]);

  const netWorthOptions = useCallback(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: 'circle' } },
      tooltip: { callbacks: { label: (ctx) => ctx.dataset.label === 'Норма сбережений %' ? `${ctx.parsed.y}%` : `${formatMoney(ctx.parsed.y)} ₽` } },
    },
    scales: {
      x: { ticks: { color: textColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { color: gridColor } },
      y: { ticks: { color: textColor, callback: (v) => `${formatMoney(v)} ₽` }, grid: { color: gridColor }, position: 'left' },
      y1: { ticks: { color: textColor, callback: (v) => `${v}%` }, grid: { display: false }, position: 'right' },
    },
  }), [textColor, gridColor]);

  const budgetBarData = useMemo(() => {
    const expenseBudgets = budgets.filter(b => b.category_type === 'expense');
    if (expenseBudgets.length === 0) return null;
    return {
      labels: expenseBudgets.map(b => b.category_name),
      datasets: [
        { label: 'Лимит', data: expenseBudgets.map(b => Number(b.limit_amount)), backgroundColor: 'rgba(99,102,241,0.5)', borderRadius: 6, borderSkipped: false },
        { label: 'Факт', data: expenseBudgets.map(b => Number(b.actual_amount)), backgroundColor: expenseBudgets.map(b => Number(b.actual_amount) > Number(b.limit_amount) ? '#ef4444' : '#10b981'), borderRadius: 6, borderSkipped: false },
      ],
    };
  }, [budgets]);

  const budgetBarOptions = useCallback(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: 'circle' } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)} ₽` } },
    },
    scales: {
      x: { ticks: { color: textColor, maxRotation: 20, autoSkip: false }, grid: { display: false } },
      y: { ticks: { color: textColor, callback: (v) => `${formatMoney(v)} ₽` }, grid: { color: gridColor } },
    },
  }), [textColor, gridColor]);

  const handleDrillDown = async (index) => {
    const donutSource = expensesByCat.length > 0 ? expensesByCat : incomeByCat;
    const processed = topN(donutSource, 5);
    const cat = processed[index];
    if (!cat || cat.name === 'Остальное') return;

    setDrillDown({ open: true, title: cat.name, transactions: [], loading: true });

    try {
      const params = { categoryName: cat.name, startDate: periodStart, endDate: periodEnd };
      if (selectedMember?.id) params.memberId = selectedMember.id;
      const res = await api.get('/reports/category-transactions', { params });
      setDrillDown(prev => ({ ...prev, transactions: res.data, loading: false }));
    } catch (err) {
      logger.error('Drill-down fetch error:', err);
      setDrillDown(prev => ({ ...prev, loading: false }));
    }
  };

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const handleExport = async (format) => {
    setExportDropdownOpen(false);
    const fmt = format === 'excel' ? 'xlsx' : 'csv';
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    const params = periodPreset === 'custom' && startDate && endDate
      ? `?startDate=${startDate}&endDate=${endDate}`
      : `?startDate=${periodStart}&endDate=${periodEnd}`;
    const memberParam = selectedMember?.id ? `&memberId=${selectedMember.id}` : '';
    await downloadFile(`/api/export/analytics?format=${fmt}${params.replace('?', '&')}${memberParam}`, `analytics-${localDateStr()}.${ext}`);
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-6">
        <SkeletonChart />
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );

  const expensesDonut = donutData(expensesByCat);
  const incomeDonut = donutData(incomeByCat);

  return (
    <div id="analytics-content" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Назад
          </button>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Аналитика</h2>
          <p className="text-on-surface-variant text-sm mt-1">{periodLabel}</p>
        </div>
        <div className="flex gap-2 relative">
          {comparison?.current && (
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`px-4 py-2.5 text-sm rounded-xl font-medium transition-all flex items-center gap-2 ${
                compareMode ? 'bg-primary text-white shadow-button' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-sm">compare_arrows</span>
              Сравнение
            </button>
          )}
          <div className="relative">
            <button onClick={() => setExportDropdownOpen(!exportDropdownOpen)} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">download</span> Экспорт
              <span className="material-symbols-outlined text-sm">{exportDropdownOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-card overflow-hidden z-50">
                <button onClick={() => handleExport('excel')} className="w-full px-4 py-3 text-left text-sm hover:bg-surface-container flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">table_chart</span> Excel (.xlsx)
                </button>
                <button onClick={() => handleExport('csv')} className="w-full px-4 py-3 text-left text-sm hover:bg-surface-container flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">description</span> CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-2 rounded-3xl shadow-card inline-flex">
        <div className="flex bg-surface-container p-1 rounded-xl">
          {[
            { key: '3m', label: '3 мес' },
            { key: '6m', label: '6 мес' },
            { key: '12m', label: '12 мес' },
            { key: 'custom', label: 'Свой', icon: 'tune' },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodPreset(p.key)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                periodPreset === p.key
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {p.icon && <span className="material-symbols-outlined text-sm">{p.icon}</span>}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {periodPreset === 'custom' && (
        <div className="flex gap-3 items-center">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="select-ghost py-2.5 text-sm" />
          <span className="material-symbols-outlined text-on-surface-variant">arrow_forward</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="select-ghost py-2.5 text-sm" />
        </div>
      )}

      {/* Comparison Section */}
      {compareMode && comparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-card">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Текущий период</p>
            <p className="text-sm text-on-surface-variant mb-3">{comparison.current.startDate} – {comparison.current.endDate}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface">Доходы</span>
                <span className="text-sm font-bold text-[#10b981]">{formatMoney(comparison.current.income)} ₽</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface">Расходы</span>
                <span className="text-sm font-bold text-[#ef4444]">{formatMoney(comparison.current.expense)} ₽</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-card">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Прошлый период</p>
            <p className="text-sm text-on-surface-variant mb-3">{comparison.previous.startDate} – {comparison.previous.endDate}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface">Доходы</span>
                <span className="text-sm font-bold text-[#10b981]">{formatMoney(comparison.previous.income)} ₽</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface">Расходы</span>
                <span className="text-sm font-bold text-[#ef4444]">{formatMoney(comparison.previous.expense)} ₽</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-card">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Изменение</p>
            <p className="text-sm text-on-surface-variant mb-3">Текущий vs прошлый</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface">Доходы</span>
                <span className={`text-sm font-bold ${comparison.changes.income > 0 ? 'text-[#10b981]' : comparison.changes.income < 0 ? 'text-[#ef4444]' : 'text-on-surface'}`}>
                  {comparison.changes.income > 0 ? '+' : ''}{comparison.changes.income}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface">Расходы</span>
                <span className={`text-sm font-bold ${comparison.changes.expense < 0 ? 'text-[#10b981]' : comparison.changes.expense > 0 ? 'text-[#ef4444]' : 'text-on-surface'}`}>
                  {comparison.changes.expense > 0 ? '+' : ''}{comparison.changes.expense}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Line Chart */}
      <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <h3 className="text-xl font-bold font-headline mb-1">Динамика доходов и расходов</h3>
        <p className="text-sm text-on-surface-variant mb-6">Сравнение по месяцам за выбранный период</p>
        <div className="h-72 md:h-80 relative z-10">
          <Line data={lineData} options={chartOptions()} />
        </div>
      </div>

      {/* Forecast Card - 7.7 */}
      {forecast?.currentMonth && (
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 rounded-3xl shadow-button relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-white/80">trending_up</span>
              <h3 className="text-xl font-bold font-headline text-white">Прогноз до конца месяца</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-white/60">Потрачено</p>
                <p className="text-2xl font-extrabold text-white">{formatMoney(forecast.currentMonth.expense)} ₽</p>
                <p className="text-xs text-white/40">{forecast.currentMonth.daysPassed} из {forecast.currentMonth.daysInMonth} дн.</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Прогноз расходов</p>
                <p className="text-2xl font-extrabold text-white">{formatMoney(forecast.forecast.projectedExpense)} ₽</p>
                <p className="text-xs text-white/40">На основе среднего за 3 мес</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Прогноз доходов</p>
                <p className="text-2xl font-extrabold text-white">{formatMoney(forecast.forecast.projectedIncome)} ₽</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Прогноз остатка</p>
                <p className={`text-2xl font-extrabold ${forecast.forecast.projectedSurplus >= 0 ? 'text-white' : 'text-red-300'}`}>
                  {forecast.forecast.projectedSurplus >= 0 ? '+' : ''}{formatMoney(forecast.forecast.projectedSurplus)} ₽
                </p>
                <p className={`text-xs ${forecast.forecast.confidence === 'high' ? 'text-green-200' : forecast.forecast.confidence === 'medium' ? 'text-yellow-200' : 'text-red-200'}`}>
                  {forecast.forecast.confidence === 'high' ? 'Высокая точность' : forecast.forecast.confidence === 'medium' ? 'Средняя точность' : 'Низкая точность'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Net Worth + Savings Rate - 7.3 & 7.4 */}
      {netWorth && netWorthLineData && (
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold font-headline mb-1">Капитал и норма сбережений</h3>
              <p className="text-sm text-on-surface-variant">Динамика чистой стоимости + % сбережений</p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-on-surface-variant">Активы</p>
                <p className="text-lg font-bold text-[#10b981]">{formatMoney(netWorth.currentAssets)} ₽</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Долги</p>
                <p className="text-lg font-bold text-[#ef4444]">–{formatMoney(netWorth.currentLiabilities)} ₽</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Капитал</p>
                <p className="text-lg font-bold text-primary">{formatMoney(netWorth.currentNetWorth)} ₽</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Сбережения</p>
                <p className="text-lg font-bold text-[#f59e0b]">{netWorth.currentSavingsRate}%</p>
              </div>
            </div>
          </div>
          <div className="h-72 md:h-80">
            <Line data={netWorthLineData} options={netWorthOptions()} />
          </div>
        </div>
      )}

      {/* Budget Overlay - 7.6 */}
      {budgetBarData && budgets.filter(b => b.category_type === 'expense').length > 0 && (
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card relative overflow-hidden">
          <h3 className="text-xl font-bold font-headline mb-1">Бюджет vs Факт</h3>
          <p className="text-sm text-on-surface-variant mb-6">Сравнение лимитов с фактическими расходами</p>
          <div className="h-64 md:h-72">
            <Bar data={budgetBarData} options={budgetBarOptions()} />
          </div>
        </div>
      )}

      {/* Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
          <h3 className="text-xl font-bold font-headline mb-1">Расходы по категориям</h3>
          <p className="text-sm text-on-surface-variant mb-6">Куда уходят деньги (кликните для деталей)</p>
          {expensesByCat.length > 0 ? (
            <div className="relative cursor-pointer">
              <div className="h-56 md:h-64"><Doughnut data={expensesDonut} options={donutOptions()} /></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-extrabold font-headline text-on-surface leading-tight">{formatMoney(expensesDonut.total)} ₽</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant/50 mt-1">Всего</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2">pie_chart</span>
              <p className="text-sm">Нет данных</p>
            </div>
          )}
          {expensesByCat.length > 0 && (
            <div className="mt-4 space-y-2">
              {topN(expensesByCat, 5).map((cat, i) => {
                const pct = expensesDonut.total > 0 ? Math.round((Number(cat.total) / expensesDonut.total) * 100) : 0;
                return (
                  <button key={cat.name} onClick={() => handleDrillDown(i)} className="w-full flex items-center justify-between py-1 hover:bg-surface-container px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: donutColors[i % donutColors.length] }}></div>
                      <span className="text-sm text-on-surface">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-on-surface">{formatMoney(cat.total)} ₽</span>
                      <span className="text-xs text-on-surface-variant font-semibold">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
          <h3 className="text-xl font-bold font-headline mb-1">Доходы по категориям</h3>
          <p className="text-sm text-on-surface-variant mb-6">Источники дохода (кликните для деталей)</p>
          {incomeByCat.length > 0 ? (
            <div className="relative cursor-pointer">
              <div className="h-56 md:h-64"><Doughnut data={incomeDonut} options={donutOptions()} /></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-extrabold font-headline text-on-surface leading-tight">{formatMoney(incomeDonut.total)} ₽</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant/50 mt-1">Всего</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2">pie_chart</span>
              <p className="text-sm">Нет данных</p>
            </div>
          )}
          {incomeByCat.length > 0 && (
            <div className="mt-4 space-y-2">
              {topN(incomeByCat, 5).map((cat, i) => {
                const pct = incomeDonut.total > 0 ? Math.round((Number(cat.total) / incomeDonut.total) * 100) : 0;
                return (
                  <button key={cat.name} onClick={() => handleDrillDown(i)} className="w-full flex items-center justify-between py-1 hover:bg-surface-container px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: donutColors[i % donutColors.length] }}></div>
                      <span className="text-sm text-on-surface">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-on-surface">{formatMoney(cat.total)} ₽</span>
                      <span className="text-xs text-on-surface-variant font-semibold">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pillow History */}
      {pillowHistory.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-8 rounded-3xl shadow-button relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 relative">
            <div>
              <h3 className="text-xl font-bold font-headline text-white">Динамика подушки безопасности</h3>
              <p className="text-sm text-white/60 mt-1">История изменений</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold font-headline text-white">{formatMoney(pillowHistory[pillowHistory.length - 1]?.safety_pillow || 0)} ₽</p>
              <p className="text-sm text-white/60 mt-1">Текущая подушка</p>
            </div>
          </div>
          <div className="h-48 md:h-56 relative z-10">
            <Bar data={pillowBarData} options={pillowBarOptions()} />
          </div>
        </div>
      )}

      {/* Drill-Down Modal - 7.5 */}
      <Modal isOpen={drillDown.open} onClose={() => setDrillDown({ open: false, title: '', transactions: [], loading: false })}>
        <div className="p-6 space-y-4 min-w-[320px] md:min-w-[500px]">
          <h3 className="text-xl font-bold font-headline">{drillDown.title}</h3>
          {drillDown.loading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
            </div>
          ) : drillDown.transactions.length === 0 ? (
            <p className="text-on-surface-variant text-sm">Нет операций в этом периоде</p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {drillDown.transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${tx.type === 'income' ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}></span>
                    <div>
                      <p className="text-sm font-medium text-on-surface">{tx.comment || tx.categoryName}</p>
                      <p className="text-xs text-on-surface-variant">{new Date(tx.date).toLocaleDateString('ru-RU')} · {tx.userName}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {tx.type === 'income' ? '+' : '–'}{formatMoney(tx.amount)} ₽
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
