import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/format';

const LEVEL_CONFIG = {
  minimal: { label: 'Минимальный', months: 3, icon: 'shield', color: 'text-error', bg: 'bg-error-container dark:bg-error/10', bar: 'bg-error', ring: 'ring-error/20', border: 'border-l-4 border-error' },
  comfortable: { label: 'Комфортный', months: 6, icon: 'security', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/10', bar: 'bg-yellow-500', ring: 'ring-yellow-500/20', border: 'border-l-4 border-yellow-400' },
  optimal: { label: 'Оптимальный', months: 12, icon: 'verified', color: 'text-secondary', bg: 'bg-secondary-container dark:bg-secondary/10', bar: 'bg-secondary', ring: 'ring-secondary/20', border: 'border-l-4 border-secondary' },
};

const MONTH_PRESETS = [
  { value: 3, label: '3 мес', icon: 'shield' },
  { value: 6, label: '6 мес', icon: 'security' },
  { value: 9, label: '9 мес', icon: 'verified' },
  { value: 12, label: '12 мес', icon: 'workspace_premium' },
  { value: 18, label: '18 мес', icon: 'star' },
  { value: 24, label: '24 мес', icon: 'emoji_events' },
];

function EditorialLabel({ children, className = '' }) {
  return (
    <span className={`text-[0.6875rem] uppercase tracking-[0.05em] text-on-surface-variant ${className}`}>
      {children}
    </span>
  );
}

function LevelCard({ keyName, level }) {
  const c = LEVEL_CONFIG[keyName];
  const isReached = level.reached;
  const isCurrent = !isReached && level.progress > 0;
  
  return (
    <div className={`p-5 rounded-2xl flex items-center gap-4 bg-surface-container-lowest dark:bg-surface-container-low ${c.border} hover:shadow-[var(--md-shadow-premium)] transition-all`}>
      <div className={`w-12 h-12 ${c.bg} ${c.color} rounded-xl flex items-center justify-center`}>
        <span className="material-symbols-outlined text-2xl">{c.icon}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm text-on-surface-variant">{c.label} ({level.months} мес)</p>
        <p className="font-bold text-lg text-on-surface">{formatMoney(level.target)} ₽</p>
      </div>
      {isReached ? (
        <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      ) : isCurrent ? (
        <div className="w-2 h-2 rounded-full bg-surface-variant"></div>
      ) : (
        <div className="w-2 h-2 rounded-full bg-surface-dim"></div>
      )}
    </div>
  );
}

function CategoryExpense({ category, amount, pct, color }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 ${color.bg} ${color.text} rounded-lg flex items-center justify-center`}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{color.icon}</span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-on-surface">{category}</span>
          <span className="font-bold text-on-surface">{formatMoney(amount)} ₽</span>
        </div>
        <div className="h-1.5 w-full bg-surface-container dark:bg-surface-container-high rounded-full overflow-hidden">
          <div className={`h-full ${color.fill} rounded-full`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    </div>
  );
}

function HistoryTable({ history }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-outline-variant/20">
            <th className="pb-4 text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Дата</th>
            <th className="pb-4 text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Подушка</th>
            <th className="pb-4 text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Цель</th>
            <th className="pb-4 text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Прогресс</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {history.slice(0, 8).map((record, i) => (
            <tr key={record.id} className="hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors">
              <td className="py-4 text-sm font-medium text-on-surface">{new Date(record.calculated_at).toLocaleDateString('ru-RU')}</td>
              <td className="py-4 text-sm font-bold text-secondary">+ {formatMoney(record.value)} ₽</td>
              <td className="py-4 text-sm text-on-surface-variant">{formatMoney(record.target_value)} ₽</td>
              <td className="py-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-container dark:bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: `${Math.min(record.target_value > 0 ? (record.value / record.target_value) * 100 : 0, 100)}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-on-surface-variant w-10">{record.target_value > 0 ? Math.round((record.value / record.target_value) * 100) : 0}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SafetyPillow({ space = 'personal' }) {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState({ months: 3 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [monthsInput, setMonthsInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchPillow = async () => {
    try {
      const res = await api.get('/safety-pillow/current');
      setData(res.data);
    } catch (err) { console.error('Safety pillow fetch error:', err); }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/safety-pillow/settings');
      setSettings(res.data);
      setMonthsInput(String(res.data.months || 3));
    } catch (err) { console.error('Settings fetch error:', err); }
  };

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    await Promise.allSettled([
      fetchPillow(),
      fetchSettings(),
    ]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const saveMonths = async (months) => {
    const m = parseInt(months);
    if (isNaN(m) || m < 1 || m > 24) return;
    try {
      await api.put('/safety-pillow/settings', { months: m });
      setSettings({ months: m });
      setMonthsInput(String(m));
      setShowCustomInput(false);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
      fetchSettings();
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  if (!data) return (
    <div className="bg-error-container rounded-3xl p-6 flex items-center gap-3">
      <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
      <p className="text-on-error-container text-sm">{loadError || 'Ошибка загрузки'}</p>
    </div>
  );

  const { liquidFunds, reservedTotal, monthlyAverage, target, months, progress, levels, recommendation, topCategories, history } = data;

  const categoryColors = [
    { icon: 'home', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', fill: 'bg-blue-500' },
    { icon: 'restaurant', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', fill: 'bg-orange-500' },
    { icon: 'directions_car', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', fill: 'bg-indigo-500' },
    { icon: 'health_and_safety', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', fill: 'bg-green-500' },
    { icon: 'more_horiz', bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', fill: 'bg-slate-400' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <EditorialLabel>Подушка безопасности</EditorialLabel>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Финансовая защита</h1>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Hero Card - Main Stats */}
        <section className="lg:col-span-8 bg-surface-container-lowest dark:bg-surface-container-low rounded-[2rem] p-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div>
                <EditorialLabel className="mb-2 block">Доступные средства</EditorialLabel>
                <h2 className="text-[3.5rem] font-extrabold tracking-[-0.03em] text-on-surface leading-none font-headline">
                  {formatMoney(liquidFunds)} <span className="text-2xl font-medium text-outline-variant ml-1">₽</span>
                </h2>
              </div>
              <div className="flex flex-col items-end">
                <span className="bg-secondary-container dark:bg-secondary/20 text-on-secondary-container dark:text-secondary px-3 py-1 rounded-full text-xs font-bold mb-2">
                  Цель: {settings.months} месяцев
                </span>
                <div className="text-right">
                  <span className="text-sm text-on-surface-variant">Ср. расходы:</span>
                  <span className="font-bold text-on-surface ml-2">{formatMoney(monthlyAverage)} ₽ / мес</span>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  <span className="font-semibold text-on-surface">Зарезервировано ({months} мес.)</span>
                </div>
                <span className="text-xl font-bold text-primary">{Math.round(progress)}%</span>
              </div>
              <div className="h-4 w-full bg-surface-container-high dark:bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
              </div>
            </div>

            {/* Recommendation Block */}
            {recommendation.shortfall > 0 ? (
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-white shrink-0">
                  <span className="material-symbols-outlined">lightbulb</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-on-surface leading-tight">Рекомендация: Пополняйте на {formatMoney(recommendation.monthlyAmount)} ₽ / мес</p>
                  <p className="text-sm text-on-surface-variant mt-1">Это позволит достичь цели через {recommendation.monthsToTarget} месяцев.</p>
                </div>
                <button className="text-primary font-bold text-sm hover:underline px-4">Подробнее</button>
              </div>
            ) : (
              <div className="bg-secondary-container dark:bg-secondary/10 border border-secondary/20 rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
                </div>
                <p className="font-bold text-secondary text-lg">Подушка безопасности сформирована!</p>
              </div>
            )}
          </div>
        </section>

        {/* Protection Levels */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          <h3 className="text-xl font-bold font-headline mb-2">Уровни защиты</h3>
          {Object.entries(levels).map(([key, level]) => (
            <LevelCard key={key} keyName={key} level={level} />
          ))}
        </section>

        {/* Expenses Breakdown */}
        <section className="lg:col-span-5 bg-surface-container-lowest dark:bg-surface-container-low rounded-[2rem] p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold font-headline">Базовые расходы</h3>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">settings_suggest</span>
            </button>
          </div>
          <div className="space-y-5">
            {topCategories && topCategories.length > 0 ? topCategories.slice(0, 5).map((cat, i) => (
              <CategoryExpense 
                key={i}
                category={cat.name} 
                amount={cat.amount} 
                pct={cat.pct} 
                color={categoryColors[i] || categoryColors[4]} 
              />
            )) : (
              <p className="text-on-surface-variant text-sm text-center py-4">Нет данных о расходах</p>
            )}
          </div>
        </section>

        {/* History Table */}
        <section className="lg:col-span-7 bg-surface-container-lowest dark:bg-surface-container-low rounded-[2rem] p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold font-headline">История пополнений</h3>
            <div className="flex gap-2">
              <span className="bg-surface-container dark:bg-surface-container-high text-on-surface-variant text-xs font-bold px-3 py-1 rounded-full">За год</span>
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">filter_list</span>
            </div>
          </div>
          {history && history.length > 0 ? (
            <HistoryTable history={history} />
          ) : (
            <p className="text-on-surface-variant text-sm text-center py-8">Нет истории</p>
          )}
        </section>
      </div>

      {/* Settings Section */}
      <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-[2rem]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold font-headline">Настройки подушки</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Целевая подушка: <strong className="text-on-surface">{settings.months}</strong> × среднемесячные расходы
            </p>
          </div>
          {settingsSaved && (
            <span className="text-secondary text-sm font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Сохранено
            </span>
          )}
        </div>

        {/* Month Presets */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
          {MONTH_PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => saveMonths(preset.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                settings.months === preset.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-outline-variant/30 text-on-surface-variant hover:border-outline-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined">{preset.icon}</span>
              <span className="text-sm font-bold">{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className="px-4 py-2.5 text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            Свой период
          </button>
          {showCustomInput && (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                min="1"
                max="24"
                value={monthsInput}
                onChange={e => setMonthsInput(e.target.value)}
                className="w-32 px-4 py-2.5 text-sm bg-surface-container dark:bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary"
                placeholder="1-24"
              />
              <span className="text-sm text-on-surface-variant">мес</span>
              <button
                onClick={() => saveMonths(monthsInput)}
                disabled={!monthsInput || parseInt(monthsInput) < 1 || parseInt(monthsInput) > 24}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}