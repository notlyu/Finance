import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { showError } from '../utils/toast';

const EXPORT_TYPES = [
  { value: 'transactions', label: 'Операции', icon: 'receipt_long' },
  { value: 'goals', label: 'Цели', icon: 'track_changes' },
  { value: 'wishes', label: 'Желания', icon: 'favorite' },
  { value: 'budgets', label: 'Бюджеты', icon: 'account_balance_wallet' },
];

const FORMATS = [
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV (.csv)' },
];

export default function Export({ space = 'personal' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [type, setType] = useState(searchParams.get('type') || 'transactions');
  const [format, setFormat] = useState('xlsx');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await api.get(`/export/${type}`, {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv;charset=utf-8',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || 'Ошибка при экспорте');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Экспорт данных</h2>
        <p className="text-on-surface-variant text-sm mt-1">Выгрузите данные в Excel или CSV</p>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-card max-w-2xl">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Тип данных</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {EXPORT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`p-4 rounded-2xl border-2 transition-all text-center ${
                    type === t.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl mb-2">{t.icon}</span>
                  <p className="text-sm font-bold">{t.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Формат файла</label>
            <div className="flex gap-3">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    format === f.value
                      ? 'bg-primary text-white shadow-button'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Начало периода</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-ghost"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Конец периода</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-ghost"
              />
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full btn-primary py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin">refresh</span>
                Экспорт...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">download</span>
                Скачать {format === 'xlsx' ? 'Excel' : 'CSV'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
