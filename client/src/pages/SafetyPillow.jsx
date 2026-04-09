import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/format';

const LEVEL_CONFIG = {
  minimal: { label: 'Минимальная', months: 3, icon: 'shield', color: 'text-error', bg: 'bg-error/5', bar: 'bg-error', ring: 'ring-error/20' },
  comfortable: { label: 'Комфортная', months: 6, icon: 'security', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/10', bar: 'bg-yellow-500', ring: 'ring-yellow-500/20' },
  optimal: { label: 'Оптимальная', months: 12, icon: 'verified', color: 'text-secondary', bg: 'bg-secondary/5', bar: 'bg-secondary', ring: 'ring-secondary/20' },
};

const MONTH_PRESETS = [
  { value: 3, label: '3 мес', icon: 'shield' },
  { value: 6, label: '6 мес', icon: 'security' },
  { value: 9, label: '9 мес', icon: 'verified' },
  { value: 12, label: '12 мес', icon: 'workspace_premium' },
  { value: 18, label: '18 мес', icon: 'star' },
  { value: 24, label: '24 мес', icon: 'emoji_events' },
];

export default function SafetyPillow() {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState({ months: 3 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [monthsInput, setMonthsInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchData = async () => {
    try {
      setLoadError(null);
      const [pillowRes, settingsRes] = await Promise.all([
        api.get('/safety-pillow/current'),
        api.get('/safety-pillow/settings'),
      ]);
      setData(pillowRes.data);
      setSettings(settingsRes.data);
      setMonthsInput(String(settingsRes.data.months || 3));
    } catch (err) {
      console.error(err);
      setLoadError(err.response?.data?.message || 'Не удалось загрузить данные');
    } finally { setLoading(false); }
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
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );
  if (!data) return (
    <div className="bg-error-container rounded-3xl p-6 flex items-center gap-3">
      <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
      <p className="text-on-error-container text-sm">{loadError || 'Ошибка загрузки'}</p>
    </div>
  );

  const { liquidFunds, reservedTotal, monthlyAverage, target, months, progress, levels, recommendation, topCategories, history } = data;

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Назад
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Подушка безопасности</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Финансовая защита на {settings.months} месяцев расходов
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>savings</span>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Ликвидные средства</p>
            </div>
            <p className={`text-4xl font-extrabold font-headline ${liquidFunds >= 0 ? 'text-on-surface' : 'text-error'}`}>
              {formatMoney(liquidFunds)} ₽
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-on-surface-variant">
                Цель: <strong className="text-on-surface">{formatMoney(target)} ₽</strong> ({months} мес × {formatMoney(monthlyAverage)} ₽/мес)
              </p>
              {reservedTotal > 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">lock</span>
                  Зарезервировано: {formatMoney(reservedTotal)} ₽
                </p>
              )}
            </div>
          </div>
          <div className="w-full md:w-64">
            <div className="progress-bar h-3">
              <div className={`h-3 rounded-full transition-all duration-700 ${progress >= 100 ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
            </div>
            <p className="text-sm font-bold text-on-surface mt-2 text-center">{Math.round(progress)}% от цели</p>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {recommendation.shortfall > 0 ? (
        <div className="bg-primary/5 border-2 border-primary/20 rounded-3xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
            </div>
            <div>
              <p className="font-bold text-on-surface font-headline">Рекомендация</p>
              <p className="text-sm text-on-surface-variant mt-1">
                Откладывайте <strong className="text-primary">{formatMoney(recommendation.monthlyAmount)} ₽/мес</strong> чтобы достичь подушки за {recommendation.monthsToTarget} мес
              </p>
              <p className="text-xs text-on-surface-variant/60 mt-1">Не хватает: {formatMoney(recommendation.shortfall)} ₽</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-secondary/5 border-2 border-secondary/20 rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
            </div>
            <p className="font-bold text-secondary font-headline text-lg">Подушка безопасности сформирована!</p>
          </div>
        </div>
      )}

      {/* Protection Levels */}
      <div>
        <h3 className="text-xl font-bold font-headline mb-4">Уровни защиты</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(levels).map(([key, level]) => {
            const c = LEVEL_CONFIG[key];
            return (
              <div key={key} className={`p-6 rounded-3xl ${c.bg} ring-1 ${c.ring}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`material-symbols-outlined ${c.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
                  <span className={`font-bold font-headline ${c.color}`}>{c.label}</span>
                  {level.reached && <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>}
                </div>
                <p className="text-2xl font-extrabold font-headline text-on-surface">{formatMoney(level.target)} ₽</p>
                <p className="text-xs text-on-surface-variant mt-1">{level.months} мес расходов</p>
                <div className="progress-bar h-2 mt-4">
                  <div className={`h-2 rounded-full ${c.bar} transition-all duration-500`} style={{ width: `${Math.min(level.progress, 100)}%` }}></div>
                </div>
                <p className="text-xs font-bold text-on-surface-variant mt-2">{Math.round(level.progress)}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Expenses */}
      {topCategories && topCategories.length > 0 && (
        <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-card">
          <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant">pie_chart</span>
            Топ расходов (3 мес)
          </h3>
          <div className="space-y-3">
            {topCategories.map((cat, i) => (
              <div key={i} className="flex justify-between items-center py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-sm font-bold text-on-surface-variant">
                    {i + 1}
                  </div>
                  <span className="text-sm font-semibold text-on-surface">{cat.name}</span>
                </div>
                <span className="text-sm font-bold text-on-surface">{formatMoney(cat.amount)} ₽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold font-headline">Настройки подушки</h3>
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
                  ? 'border-primary bg-primary/5 text-primary'
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
            className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-2"
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
                className="input-ghost w-32 py-2.5 text-sm"
                placeholder="1-24"
              />
              <span className="text-sm text-on-surface-variant">мес</span>
              <button
                onClick={() => saveMonths(monthsInput)}
                disabled={!monthsInput || parseInt(monthsInput) < 1 || parseInt(monthsInput) > 24}
                className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Сохранить
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history && history.length > 0 && (
        <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-card">
          <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant">history</span>
            История
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-surface-container">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Подушка</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Цель</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Прогресс</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 12).map((record, i) => (
                  <tr key={record.id} className={`transition-colors hover:bg-surface-container ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{new Date(record.calculated_at).toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-3 text-sm font-bold text-on-surface">{formatMoney(record.value)} ₽</td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{formatMoney(record.target_value)} ₽</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="progress-bar flex-1 h-1.5">
                          <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${Math.min(record.target_value > 0 ? (record.value / record.target_value) * 100 : 0, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-on-surface-variant">{record.target_value > 0 ? Math.round((record.value / record.target_value) * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
