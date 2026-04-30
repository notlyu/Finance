import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Line, Doughnut } from 'react-chartjs-2';
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
  Filler,
} from 'chart.js';
import api, { API_BASE, downloadFile } from '../services/api';
import { formatMoney } from '../utils/format';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, ArcElement, Filler
);

export default function Analytics({ space = 'personal' }) {
  const { selectedMember } = useOutletContext() || {};
  const [dynamics, setDynamics] = useState({ labels: [], income: [], expense: [] });
  const [expensesByCat, setExpensesByCat] = useState([]);
  const [incomeByCat, setIncomeByCat] = useState([]);
  const [pillowHistory, setPillowHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodPreset, setPeriodPreset] = useState('12m');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [themeToggle, setThemeToggle] = useState(0);

  // Reactive dark mode detection
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#E5E7EB' : '#0b1c30';
  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(199,196,216,0.3)';

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeToggle(t => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const resolvePeriod = () => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    if (periodPreset === 'custom' && startDate && endDate) return { start: startDate, end: endDate };
    const monthsBack = periodPreset === '3m' ? 3 : periodPreset === '6m' ? 6 : 12;
    const start = new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1), 1);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  };

  const period = resolvePeriod();
  const periodLabel = periodPreset === 'custom' ? `${period.start} – ${period.end}` : (periodPreset === '3m' ? '3 месяца' : periodPreset === '6m' ? '6 месяцев' : '12 месяцев');

  useEffect(() => {
    const fetchDynamics = async () => {
      try {
        const apiParams = { startDate: period.start, endDate: period.end, start: period.start, end: period.end };
        if (selectedMember?.id) apiParams.memberId = selectedMember.id;
        const res = await api.get('/reports/dynamics', { params: apiParams });
        setDynamics(res.data);
      } catch (err) { console.error('Dynamics fetch error:', err); }
    };

    const fetchExpensesByCat = async () => {
      try {
        const apiParams = { startDate: period.start, endDate: period.end, start: period.start, end: period.end };
        if (selectedMember?.id) apiParams.memberId = selectedMember.id;
        const res = await api.get('/reports/expenses-by-category', { params: apiParams });
        setExpensesByCat(res.data);
      } catch (err) { console.error('Expenses by category fetch error:', err); }
    };

    const fetchIncomeByCat = async () => {
      try {
        const apiParams = { startDate: period.start, endDate: period.end, start: period.start, end: period.end };
        if (selectedMember?.id) apiParams.memberId = selectedMember.id;
        const res = await api.get('/reports/income-by-category', { params: apiParams });
        setIncomeByCat(res.data);
      } catch (err) { console.error('Income by category fetch error:', err); }
    };

    const fetchPillowHistory = async () => {
      try {
        const res = await api.get('/safety-pillow/history', { params: { limit: 12 } });
        setPillowHistory(res.data);
      } catch (err) { console.error('Pillow history fetch error:', err); }
    };

    setLoading(true);
    Promise.allSettled([
      fetchDynamics(),
      fetchExpensesByCat(),
      fetchIncomeByCat(),
      fetchPillowHistory(),
    ]).finally(() => setLoading(false));
  }, [periodPreset, startDate, endDate, selectedMember]);

  // ALL hooks before any early return
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
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatMoney(ctx.parsed)} ₽` } },
    },
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
      return d.toLocaleDateString('ru-RU', { month: 'short' });
    }),
    datasets: [{
      data: pillowHistory.slice(-6).map(h => Number(h.value)),
      backgroundColor: pillowHistory.slice(-6).map((_, i) => {
        const opacity = 0.25 + (i / 5) * 0.75;
        return `rgba(255, 255, 255, ${opacity})`;
      }),
      borderRadius: 8,
      borderSkipped: false,
    }],
  }), [pillowHistory]);

  const buildExportParams = () => {
    const params = periodPreset === 'custom' && startDate && endDate
      ? `?startDate=${startDate}&endDate=${endDate}`
      : `?startDate=${period.start}&endDate=${period.end}`;
    if (selectedMember?.id) return params.includes('?') ? `${params}&memberId=${selectedMember.id}` : `?memberId=${selectedMember.id}`;
    return params;
  };

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const handleExport = async (format) => {
    setExportDropdownOpen(false);
    const params = buildExportParams();
    const fmt = format === 'excel' ? 'xlsx' : 'csv';
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    await downloadFile(`/api/export/transactions?format=${fmt}${params.replace('?', '&')}`, `transactions-${new Date().toISOString().slice(0, 10)}.${ext}`);
  };

  const exportPDF = async () => {
    console.log('PDF export clicked');
    const element = document.getElementById('analytics-content');
    if (!element) return;
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const width = imgWidth * ratio;
    const height = imgHeight * ratio;
    
    let heightLeft = height;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, width, height);
    heightLeft -= pdfHeight;
    
    while (heightLeft > 0) {
      position = heightLeft - height;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, width, height);
      heightLeft -= pdfHeight;
    }
    
    pdf.save(`finance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );

  const expensesDonut = donutData(expensesByCat);
  const incomeDonut = donutData(incomeByCat);

  return (
    <div id="analytics-content" className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Назад
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Аналитика</h2>
          <p className="text-on-surface-variant text-sm mt-1">{periodLabel}</p>
        </div>
        <div className="flex gap-2 relative">
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

      {/* Period Selector - Segmented Control */}
      <div className="bg-surface-container-lowest p-2 rounded-2xl shadow-card inline-flex">
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
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
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

      {/* Line Chart */}
      <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <h3 className="text-xl font-bold font-headline mb-1">Динамика доходов и расходов</h3>
        <p className="text-sm text-on-surface-variant mb-6">Сравнение по месяцам за выбранный период</p>
        <div className="h-72 md:h-80 relative z-10">
          <Line data={lineData} options={chartOptions()} />
        </div>
      </div>

      {/* Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
          <h3 className="text-xl font-bold font-headline mb-1">Расходы по категориям</h3>
          <p className="text-sm text-on-surface-variant mb-6">Куда уходят деньги</p>
          {expensesByCat.length > 0 ? (
            <div className="relative">
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
          {/* Category list */}
          {expensesByCat.length > 0 && (
            <div className="mt-4 space-y-2">
              {topN(expensesByCat, 5).map((cat, i) => {
                const pct = expensesDonut.total > 0 ? Math.round((Number(cat.total) / expensesDonut.total) * 100) : 0;
                return (
                  <div key={cat.name} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: donutColors[i % donutColors.length] }}></div>
                      <span className="text-sm text-on-surface">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-on-surface">{formatMoney(cat.total)} ₽</span>
                      <span className="text-xs text-on-surface-variant font-semibold">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
          <h3 className="text-xl font-bold font-headline mb-1">Доходы по категориям</h3>
          <p className="text-sm text-on-surface-variant mb-6">Источники дохода</p>
          {incomeByCat.length > 0 ? (
            <div className="relative">
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
          {/* Category list */}
          {incomeByCat.length > 0 && (
            <div className="mt-4 space-y-2">
              {topN(incomeByCat, 5).map((cat, i) => {
                const pct = incomeDonut.total > 0 ? Math.round((Number(cat.total) / incomeDonut.total) * 100) : 0;
                return (
                  <div key={cat.name} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: donutColors[i % donutColors.length] }}></div>
                      <span className="text-sm text-on-surface">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-on-surface">{formatMoney(cat.total)} ₽</span>
                      <span className="text-xs text-on-surface-variant font-semibold">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pillow History - Fixed gradient card with white text */}
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
              <p className="text-3xl font-extrabold font-headline text-white">{formatMoney(pillowHistory[pillowHistory.length - 1]?.value || 0)} ₽</p>
              <p className="text-sm text-white/60 mt-1">Текущая подушка</p>
            </div>
          </div>
          <div className="h-48 md:h-56 relative z-10">
            <Line data={pillowBarData} options={pillowBarOptions()} />
          </div>
        </div>
      )}
    </div>
  );
}
