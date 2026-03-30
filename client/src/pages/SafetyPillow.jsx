import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/format';

const EMPTY_PILLOW = {
  current: 0,
  target: 0,
  monthlyAverage: 0,
  progress: 0,
};

export default function SafetyPillow() {
  const [pillow, setPillow] = useState(EMPTY_PILLOW);
  const [settings, setSettings] = useState({ months: 3 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchData = async () => {
    try {
      setLoadError(null);
      const [pillowRes, settingsRes, historyRes] = await Promise.all([
        api.get('/safety-pillow/current'),
        api.get('/safety-pillow/settings'),
        api.get('/safety-pillow/history'),
      ]);
      setPillow(pillowRes.data || EMPTY_PILLOW);
      setSettings(settingsRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      console.error(err);
      setPillow(EMPTY_PILLOW);
      setHistory([]);
      setLoadError(err.response?.data?.message || 'Не удалось загрузить данные подушки безопасности');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateSettings = async () => {
    const months = prompt('Количество месяцев для подушки (1-12):', settings.months);
    if (!months) return;
    try {
      await api.put('/safety-pillow/settings', { months: parseInt(months) });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Подушка безопасности</h1>

      {loadError ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">{loadError}</p>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              className="text-sm font-medium text-red-800 dark:text-red-200 underline"
            >
              Повторить
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Текущая подушка</p>
            <p className="text-3xl font-bold text-indigo-600">{formatMoney(pillow.current)} ₽</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Цель: {formatMoney(pillow.target)} ₽</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Средние расходы в месяц: {formatMoney(pillow.monthlyAverage)} ₽</p>
          </div>
          <div className="w-48 mt-4 md:mt-0">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full"
                style={{ width: `${Math.min(Number(pillow.progress || 0), 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 text-center">{Math.round(Number(pillow.progress || 0))}% от цели</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Настройки</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Подушка рассчитывается как <strong>{settings.months}</strong> × среднемесячные расходы
            </p>
          </div>
          <button onClick={updateSettings} className="text-indigo-600 dark:text-indigo-400 text-sm">Изменить</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">История подушки</h2>
        {history.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Нет данных</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Дата</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Значение</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Цель</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {history.map(record => (
                  <tr key={record.id}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{new Date(record.calculated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{formatMoney(record.value)} ₽</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{formatMoney(record.target_value)} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}