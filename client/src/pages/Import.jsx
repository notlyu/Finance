import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const FIELDS = [
  { key: 'date', label: 'Дата' },
  { key: 'amount', label: 'Сумма' },
  { key: 'type', label: 'Тип' },
  { key: 'category', label: 'Категория' },
  { key: 'comment', label: 'Комментарий' },
];

export default function Import() {
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [step, setStep] = useState('input');

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    try {
      const res = await api.get('/import/template');
      setTemplate(res.data);
    } catch (err) { console.error(err); }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((h, idx) => row[h] = values[idx] || '');
        rows.push(row);
      }
    }

    return { headers, rows };
  };

  const detectMapping = (headers) => {
    const map = {};
    FIELDS.forEach(({ key }) => {
      const found = headers.find(h =>
        new RegExp(`^${key}$|date|data|period|дата|amount|sum|сумма|стоимость|type|вид|приход|расход|category|категория|статья|comment|description|заметка|описание`, 'i').test(h)
      );
      if (found) map[key] = found;
    });
    return map;
  };

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsv(text);
      const { headers, rows } = parseCSV(text);
      setHeaders(headers);
      setRows(rows.slice(0, 5));
      setMapping(detectMapping(headers));
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleTextareaSubmit = async () => {
    if (!csv.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/import/import', { csv });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.response?.data?.message || 'Ошибка' });
    } finally { setLoading(false); }
  };

  const handleMappedSubmit = async () => {
    if (!csv.trim()) return;
    setLoading(true);
    try {
      const allRows = parseCSV(csv).rows;
      const res = await api.post('/import/import', { data: allRows, mapping });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.response?.data?.message || 'Ошибка' });
    } finally { setLoading(false); }
  };

  const handleMappingChange = (field, value) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Импорт из CSV</h2>
        <p className="text-sm text-on-surface-variant">Загрузите операции из банковской выписки</p>
      </div>

      {step === 'input' && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/10' : 'border-outline/20'
            }`}
          >
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <p className="text-sm text-on-surface-variant mb-2">Перетащите CSV файл сюда или нажмите для выбора</p>
              <p className="text-xs text-on-surface-variant/60">Только .csv файлы</p>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-2">Или вставьте CSV данные</label>
            <textarea value={csv} onChange={e => setCsv(e.target.value)}
              className="w-full h-48 px-4 py-3 bg-surface rounded-xl border border-outline/20 font-mono text-sm"
              placeholder="date,amount,category,comment&#10;2024-01-15,5000,Зарплата,Зарплата за январь&#10;2024-01-16,1500,Продукты,Пятёрочка"
            />
          </div>

          <button onClick={handleTextareaSubmit} disabled={loading || !csv.trim()}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50">
            {loading ? 'Импорт...' : 'Импортировать'}
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-4">
            <h3 className="font-medium">Сопоставление колонок</h3>
            <div className="grid grid-cols-2 gap-4">
              {FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">{label}</label>
                  <select
                    value={mapping[key] || ''}
                    onChange={(e) => handleMappingChange(key, e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-xl border border-outline/20 text-sm"
                  >
                    <option value="">Не выбрано</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-4">
            <h3 className="font-medium">Предпросмотр (первые 5 строк)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline/20">
                    {FIELDS.map(({ key, label }) => (
                      <th key={key} className="text-left p-2">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-outline/10">
                      {FIELDS.map(({ key }) => (
                        <td key={key} className="p-2">{mapping[key] ? row[mapping[key]] : '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => { setStep('input'); setCsv(''); setRows([]); setHeaders([]); }}
              className="flex-1 py-3 bg-surface rounded-xl font-medium">
              Назад
            </button>
            <button
              onClick={handleMappedSubmit}
              disabled={loading || !mapping.date || !mapping.amount}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? 'Импорт...' : 'Импортировать'}
            </button>
          </div>
        </div>
      )}

      {template?.example && step === 'input' && (
        <div className="bg-surface-container-lowest rounded-2xl p-4">
          <p className="text-xs font-medium text-on-surface-variant mb-2">Пример формата:</p>
          <div className="font-mono text-xs space-y-1 text-on-surface-variant">
            <p>{template.columns.join(',')}</p>
            {template.example.slice(0, 3).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className={`rounded-2xl p-4 ${result.error ? 'bg-error-container' : 'bg-secondary-container'}`}>
          {result.error ? (
            <p className="text-error">{result.error}</p>
          ) : (
            <div>
              <p className="font-medium">Импорт завершён!</p>
              <p className="text-sm">Добавлено: {result.imported}</p>
              {result.skipped > 0 && <p className="text-sm">Пропущено: {result.skipped}</p>}
              {result.errors?.length > 0 && (
                <div className="mt-2 text-sm">
                  <p>Ошибки:</p>
                  <ul className="list-disc list-inside">
                    {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
