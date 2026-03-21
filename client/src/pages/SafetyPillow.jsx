import { useState, useEffect } from 'react';
import api from '../services/api';

export default function SafetyPillow() {
  const [pillow, setPillow] = useState(null);
  const [settings, setSettings] = useState({ months: 3 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [pillowRes, settingsRes, historyRes] = await Promise.all([
        api.get('/safety-pillow/current'),
        api.get('/safety-pillow/settings'),
        api.get('/safety-pillow/history'),
      ]);
      setPillow(pillowRes.data);
      setSettings(settingsRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      console.error(err);
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
      <h1 className="text-2xl font-bold text-gray-900">Подушка безопасности</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <p className="text-sm text-gray-500">Текущая подушка</p>
            <p className="text-3xl font-bold text-indigo-600">{pillow.current.toLocaleString()} ₽</p>
            <p className="text-sm text-gray-500 mt-1">Цель: {pillow.target.toLocaleString()} ₽</p>
            <p className="text-xs text-gray-400">Средние расходы в месяц: {pillow.monthlyAverage.toLocaleString()} ₽</p>
          </div>
          <div className="w-48 mt-4 md:mt-0">
            <div className="bg-gray-200 rounded-full h-3">
              <div className="bg-indigo-600 h-3 rounded-full" style={{ width: `${Math.min(pillow.progress, 100)}%` }}></div>
            </div>
            <p className="text-sm text-gray-600 mt-1 text-center">{Math.round(pillow.progress)}% от цели</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium">Настройки</h2>
            <p className="text-sm text-gray-500">
              Подушка рассчитывается как <strong>{settings.months}</strong> × среднемесячные расходы
            </p>
          </div>
          <button onClick={updateSettings} className="text-indigo-600 text-sm">Изменить</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">История подушки</h2>
        {history.length === 0 ? (
          <p className="text-gray-500">Нет данных</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Значение</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Цель</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map(record => (
                  <tr key={record.id}>
                    <td className="px-4 py-2 text-sm">{new Date(record.calculated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm font-medium">{Number(record.value).toLocaleString()} ₽</td>
                    <td className="px-4 py-2 text-sm">{Number(record.target_value).toLocaleString()} ₽</td>
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