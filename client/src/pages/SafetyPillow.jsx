import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/format';

const LEVEL_COLORS = {
  minimal: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', bar: 'bg-red-500', icon: '🔴' },
  comfortable: { bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300', bar: 'bg-yellow-500', icon: '🟡' },
  optimal: { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', bar: 'bg-green-500', icon: '🟢' },
};

export default function SafetyPillow() {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState({ months: 3 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchData = async () => {
    try {
      setLoadError(null);
      const [pillowRes, settingsRes] = await Promise.all([
        api.get('/safety-pillow/current'),
        api.get('/safety-pillow/settings'),
      ]);
      setData(pillowRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      console.error(err);
      setLoadError(err.response?.data?.message || 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateSettings = async () => {
    const months = prompt('Количество месяцев для подушки (1-24):', settings.months);
    if (!months) return;
    const m = parseInt(months);
    if (isNaN(m) || m < 1 || m > 24) {
      alert('Введите число от 1 до 24');
      return;
    }
    try {
      await api.put('/safety-pillow/settings', { months: m });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;
  if (!data) return <div className="text-center py-10 text-red-500">{loadError || 'Ошибка загрузки'}</div>;

  const { liquidFunds, reservedTotal, monthlyAverage, target, months, progress, levels, recommendation, topCategories, history } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Подушка безопасности</h1>

      {/* Основная карточка */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ликвидные средства</p>
            <p className={`text-3xl font-bold ${liquidFunds >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
              {formatMoney(liquidFunds)} ₽
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Цель ({months} мес): {formatMoney(target)} ₽
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Средние расходы/мес: {formatMoney(monthlyAverage)} ₽
            </p>
            {reservedTotal > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Зарезервировано в целях/желаниях: {formatMoney(reservedTotal)} ₽
              </p>
            )}
          </div>
          <div className="w-full md:w-56">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-700 ${progress >= 100 ? 'bg-green-500' : 'bg-indigo-600'}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 text-center">
              {Math.round(progress)}% от цели
            </p>
          </div>
        </div>
      </div>

      {/* Рекомендация */}
      {recommendation.shortfall > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-medium text-indigo-900 dark:text-indigo-200">Рекомендация</p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                Откладывайте <strong>{formatMoney(recommendation.monthlyAmount)} ₽/мес</strong> чтобы достичь подушки за {recommendation.monthsToTarget} мес
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                Не хватает: {formatMoney(recommendation.shortfall)} ₽
              </p>
            </div>
          </div>
        </div>
      )}
      {recommendation.shortfall === 0 && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <p className="font-medium text-green-700 dark:text-green-300">Подушка безопасности сформирована!</p>
          </div>
        </div>
      )}

      {/* Уровни подушки */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Уровни защиты</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(levels).map(([key, level]) => {
            const c = LEVEL_COLORS[key];
            return (
              <div key={key} className={`rounded-lg border p-4 ${c.bg} ${c.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{c.icon}</span>
                  <span className={`font-semibold ${c.text}`}>{level.label}</span>
                  {level.reached && <span className="text-green-500 text-sm">✓</span>}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(level.target)} ₽</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{level.months} мес расходов</p>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
                  <div className={`h-2 rounded-full ${c.bar} transition-all duration-500`} style={{ width: `${Math.min(level.progress, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{Math.round(level.progress)}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Топ расходов */}
      {topCategories && topCategories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Топ расходов (3 мес)</h2>
          <div className="space-y-2">
            {topCategories.map((cat, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-900 dark:text-gray-100">{cat.name}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatMoney(cat.amount)} ₽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Настройки */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Настройки</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Целевая подушка: <strong>{settings.months}</strong> × среднемесячные расходы
            </p>
          </div>
          <button onClick={updateSettings} className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">Изменить</button>
        </div>
      </div>

      {/* История */}
      {history && history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">История</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Дата</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Подушка</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Цель</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {history.slice(0, 12).map(record => (
                  <tr key={record.id}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{new Date(record.calculated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{formatMoney(record.value)} ₽</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{formatMoney(record.target_value)} ₽</td>
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
