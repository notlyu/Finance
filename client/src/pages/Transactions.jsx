import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import api, { downloadFile } from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import FormattedInput from '../components/ui/FormattedInput';
import { formatMoney } from '../utils/format';
import { showError } from '../utils/toast';

const categoryIconMap = {
  income: 'payments',
  expense: 'shopping_cart',
  food: 'restaurant',
  transport: 'directions_car',
  entertainment: 'movie',
  health: 'local_hospital',
  education: 'school',
  home: 'home',
  clothing: 'checkroom',
  gifts: 'card_giftcard',
  salary: 'work',
  freelance: 'laptop',
  investment: 'trending_up',
  other: 'more_horiz',
};

const getCategoryIcon = (catName) => {
  if (!catName) return 'receipt_long';
  const lower = catName.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIconMap)) {
    if (lower.includes(key)) return icon;
  }
  return 'receipt_long';
};

export default function Transactions({ space = 'personal' }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState({ items: [], limit: 30, offset: 0, hasMore: false });
  const [filters, setFilters] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { startDate: today, endDate: today, type: '', categoryId: '', includePrivate: 'all', q: '' };
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [datePreset, setDatePreset] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, title: '', message: '', variant: 'danger' });
  const [pendingBudgetWarning, setPendingBudgetWarning] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  
  const hasFamily = currentUser?.family_id;

  const updateDateFilter = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    let start = '', end = '';
    switch (preset) {
      case 'today':
        start = end = today.toISOString().slice(0, 10);
        break;
      case 'yesterday': {
        const y = new Date(today); y.setDate(today.getDate() - 1);
        start = end = y.toISOString().slice(0, 10);
        break;
      }
      case 'week': {
        const w = new Date(today); w.setDate(today.getDate() - today.getDay());
        start = w.toISOString().slice(0, 10); end = today.toISOString().slice(0, 10);
        break;
      }
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        end = today.toISOString().slice(0, 10);
        break;
      case 'custom':
        start = customStart; end = customEnd;
        break;
      default: break;
    }
    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  };

  useEffect(() => {
    if (datePreset === 'custom') {
      setFilters(prev => ({ ...prev, startDate: customStart, endDate: customEnd }));
    }
  }, [customStart, customEnd, datePreset]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.q) {
        fetchTransactions(0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.q, fetchTransactions]);

  useEffect(() => {
    api.get('/auth/me').then(res => setCurrentUser(res.data)).catch(console.error);
  }, []);

  const buildParams = (offset = 0) => {
    const params = { paginate: true, limit: page.limit, offset };
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.type) params.type = filters.type;
    if (filters.categoryId) params.categoryId = filters.categoryId;
    if (filters.includePrivate && filters.includePrivate !== 'all') params.includePrivate = filters.includePrivate;
    if (filters.q) params.q = filters.q;
    return params;
  };

  const fetchTransactions = useCallback(async (offset = 0) => {
    const params = buildParams(offset);
    try {
      const res = await api.get('/transactions', { params });
      const items = res.data?.items || [];
      const meta = res.data?.meta || {};
      setTransactions(items);
      setPage(prev => ({ ...prev, items, offset: meta.offset ?? offset, hasMore: !!meta.hasMore }));
    } catch (err) { console.error('Transactions fetch error:', err); }
  }, [buildParams]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) { console.error('Categories fetch error:', err); }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data || []);
    } catch (err) { console.error('Accounts fetch error:', err); }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchTransactions(0),
      fetchCategories(),
      fetchAccounts(),
    ]);
    setLoading(false);
  };

  const loadMore = async () => {
    try {
      const nextOffset = transactions.length;
      const res = await api.get('/transactions', { params: buildParams(nextOffset) });
      const items = res.data?.items || [];
      const meta = res.data?.meta || {};
      setTransactions(prev => [...prev, ...items]);
      setPage(prev => ({ ...prev, offset: meta.offset ?? nextOffset, hasMore: !!meta.hasMore }));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchTransactions(0);
  }, [filters.startDate, filters.endDate, filters.type, filters.categoryId, filters.includePrivate, fetchTransactions]);

  const onSubmit = async (data) => {
    try {
      if (editingId) {
        await api.put(`/transactions/${editingId}`, data);
      } else {
        const payload = { 
          ...data, 
          amount: Number(data.amount),
          category_id: Number(data.category_id)
        };
        if (data.account_id) payload.account_id = Number(data.account_id);
        if (!payload.date) payload.date = new Date().toISOString().slice(0, 10);
        const res = await api.post('/transactions', payload);
        if (res.data.budgetWarning) {
          const w = res.data.budgetWarning;
          setPendingBudgetWarning({ txId: res.data.transaction.id });
          setConfirmModal({
            open: true,
            variant: 'warning',
            title: '⚠️ Бюджет превышен',
            message: `Потрачено: ${w.spent} ₽\nПосле операции: ${w.newTotal} ₽\nЛимит: ${w.limit} ₽\nПревышение: ${w.overBy} ₽`,
             onConfirm: async () => {
               setModalOpen(false);
               reset();
               setEditingId(null);
               setPendingBudgetWarning(null);
               fetchTransactions(0);
             }
          });
          return;
        }
      }
      setModalOpen(false); reset(); setEditingId(null); fetchTransactions(0);
    } catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
  };

  const openEditModal = (t) => {
    setEditingId(t.id);
    setValue('amount', t.amount);
    setValue('type', t.type);
    setValue('category_id', t.category_id);
    setValue('account_id', t.account_id || '');
    setValue('date', t.date);
    setValue('comment', t.comment || '');
    setValue('scope', t.scope || (t.is_personal !== false ? 'personal' : 'family'));
    setModalOpen(true);
  };

  const deleteTransaction = async (id) => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Удалить операцию?',
      message: 'Это действие нельзя отменить.',
      confirmText: 'Удалить',
      onConfirm: async () => {
        try { await api.delete(`/transactions/${id}`); fetchTransactions(0); }
        catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
      }
    });
  };

  const duplicateTransaction = (t) => {
    setEditingId(null);
    setValue('amount', t.amount);
    setValue('type', t.type);
    setValue('category_id', t.category_id);
    setValue('account_id', t.account_id || '');
    setValue('date', new Date().toISOString().slice(0, 10));
    setValue('comment', t.comment || '');
    setValue('scope', t.scope || (t.is_personal !== false ? 'personal' : 'family'));
    setModalOpen(true);
  };

  const handleConfirmClose = async () => {
    if (pendingBudgetWarning) {
      try { await api.delete(`/transactions/${pendingBudgetWarning.txId}`); }
      catch (err) { console.error(err); }
    }
    setConfirmModal({ open: false });
    setPendingBudgetWarning(null);
  };

  const resetFilters = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFilters({ startDate: today, endDate: today, type: '', categoryId: '', includePrivate: 'all', q: '' });
    setDatePreset('today'); setCustomStart(''); setCustomEnd('');
  };

  const handleExport = async (format) => {
    setExportDropdownOpen(false);
    const params = [];
    if (filters.startDate) params.push(`startDate=${filters.startDate}`);
    if (filters.endDate) params.push(`endDate=${filters.endDate}`);
    if (filters.type) params.push(`type=${filters.type}`);
    if (filters.categoryId) params.push(`categoryId=${filters.categoryId}`);
    const query = params.length ? `?${params.join('&')}` : '';
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    await downloadFile(`/api/export/transactions?format=${format === 'excel' ? 'xlsx' : 'csv'}${query}`, `transactions-${new Date().toISOString().slice(0, 10)}.${ext}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Назад
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Операции</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            {transactions.length} операций за период
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(v => !v)}
            className="sm:hidden px-4 py-2.5 rounded-xl border-2 border-outline-variant text-on-surface-variant font-medium text-sm hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-lg mr-1 align-middle">filter_list</span>
            Фильтры
          </button>
          <div className="relative">
            <button onClick={() => setExportDropdownOpen(!exportDropdownOpen)} className="px-4 py-2.5 rounded-xl border-2 border-outline-variant text-on-surface-variant font-medium text-sm hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-lg mr-1 align-middle">download</span>
              Экспорт
              <span className="material-symbols-outlined text-sm ml-1">{exportDropdownOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-surface-container-lowest rounded-xl shadow-card overflow-hidden z-50">
                <button onClick={() => handleExport('excel')} className="w-full px-4 py-3 text-left text-sm hover:bg-surface-container flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">table_chart</span> Excel (.xlsx)
                </button>
                <button onClick={() => handleExport('csv')} className="w-full px-4 py-3 text-left text-sm hover:bg-surface-container flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">description</span> CSV
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              const today = new Date().toISOString().slice(0, 10);
              reset({ type: 'expense', scope: 'personal', date: today });
              setModalOpen(true);
            }}
            className="btn-primary px-6 py-2.5 flex items-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span className="hidden sm:inline">Добавить</span>
            <span className="sm:hidden">Добавить</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
        <input
          type="text"
          placeholder="Поиск по комментарию..."
          value={filters.q}
          onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && fetchData()}
          className="w-full pl-12 pr-4 py-3 bg-surface-container rounded-xl border-2 border-outline-variant focus:border-primary outline-none transition-colors text-on-surface placeholder:text-on-surface-variant/50"
        />
        {filters.q && (
          <button
            onClick={() => setFilters(prev => ({ ...prev, q: '' }))}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={`bg-surface-container p-6 rounded-3xl transition-all ${filtersOpen ? '' : 'hidden sm:block'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Период</label>
            <select
              value={datePreset}
              onChange={(e) => updateDateFilter(e.target.value)}
              className="select-ghost"
            >
              <option value="today">Сегодня</option>
              <option value="yesterday">Вчера</option>
              <option value="week">Эта неделя</option>
              <option value="month">Этот месяц</option>
              <option value="custom">Произвольный</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Тип</label>
            <select
              value={filters.type}
              onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="select-ghost"
            >
              <option value="">Все типы</option>
              <option value="income">Доходы</option>
              <option value="expense">Расходы</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Категория</label>
            <select
              value={filters.categoryId}
              onChange={e => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
              className="select-ghost"
            >
              <option value="">Все категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Фильтр</label>
            <select
              value={filters.includePrivate}
              onChange={e => setFilters(prev => ({ ...prev, includePrivate: e.target.value }))}
              className="select-ghost"
            >
              <option value="all">Все операции</option>
              <option value="my">Только мои</option>
              <option value="family">Семейные</option>
            </select>
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Дата от</label>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="select-ghost" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Дата до</label>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="select-ghost" />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button onClick={resetFilters} className="text-sm text-primary font-semibold hover:opacity-80 transition-colors">
            Сбросить все фильтры
          </button>
          <div className="text-xs text-on-surface-variant font-medium">
            {filters.startDate && filters.endDate
              ? `${filters.startDate} – ${filters.endDate}`
              : 'Фильтр не выбран'}
          </div>
        </div>
      </div>

      {/* Transaction List - Mobile Cards */}
      <div className="sm:hidden space-y-4">
        {transactions.map(t => (
          <div
            key={t.id}
            className={`p-5 rounded-2xl ${
              t.is_hidden
                ? 'bg-surface-container-low'
                : 'bg-surface-container-lowest shadow-card'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  t.is_hidden ? 'bg-surface-container-high text-outline' :
                  t.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-primary'
                }`}>
                  <span className="material-symbols-outlined">
                    {t.is_hidden ? 'lock' : getCategoryIcon(t.category_name)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-on-surface text-sm truncate">
                    {t.is_hidden ? '🔒 Сюрприз' : t.category_name}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {new Date(t.date).toLocaleDateString('ru-RU')} • {t.user_name}
                    {t.account_name && ` • ${t.account_name}`}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-bold font-headline ${t.type === 'income' ? 'text-secondary' : 'text-on-surface'}`}>
                  {t.type === 'income' ? '+' : '-'}{t.is_hidden ? '••••' : formatMoney(t.amount)} ₽
                </p>
              </div>
            </div>
            {t.comment && !t.is_hidden && (
              <p className="text-sm text-on-surface-variant mt-3">{t.comment}</p>
            )}
            {!t.is_hidden && (
              <div className="flex items-center justify-end gap-2 mt-3">
                <button onClick={() => duplicateTransaction(t)} title="Дублировать" className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant bg-surface-container hover:bg-surface-container-high hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-lg">content_copy</span>
                </button>
                <button onClick={() => openEditModal(t)} title="Изменить" className="w-10 h-10 flex items-center justify-center rounded-xl text-primary bg-primary/5 hover:bg-primary/10 transition-colors">
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button onClick={() => deleteTransaction(t.id)} title="Удалить" className="w-10 h-10 flex items-center justify-center rounded-xl text-error bg-error-container hover:opacity-90 transition-colors">
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            )}
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="bg-surface-container-lowest p-8 rounded-3xl text-center">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">receipt_long</span>
            <p className="text-on-surface-variant text-sm">Нет операций</p>
          </div>
        )}
        {page.hasMore && (
          <button onClick={loadMore} className="w-full py-3.5 rounded-2xl border-2 border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container transition-colors">
            Загрузить ещё
          </button>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-surface-container-lowest rounded-3xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Дата</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Категория</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Счет</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Сумма</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Комментарий</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Автор</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-on-surface-variant uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={t.id} className={`transition-colors hover:bg-surface-container ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">{new Date(t.date).toLocaleDateString('ru-RU')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        t.is_hidden ? 'bg-surface-container-high text-outline' :
                        t.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {t.is_hidden ? 'lock' : getCategoryIcon(t.category_name)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-on-surface">
                        {t.is_hidden ? '🔒 Сюрприз' : t.category_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">
                    {t.account_name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-bold font-headline ${t.type === 'income' ? 'text-secondary' : 'text-on-surface'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.is_hidden ? '••••' : formatMoney(t.amount)} ₽
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant max-w-48 truncate">{t.comment || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">{t.user_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {t.is_hidden ? (
                        <span className="text-xs text-on-surface-variant px-2">Скрыто</span>
                      ) : (
                        <>
                          <button onClick={() => duplicateTransaction(t)} title="Дублировать" className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                          <button onClick={() => openEditModal(t)} title="Редактировать" className="w-9 h-9 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button onClick={() => deleteTransaction(t.id)} title="Удалить" className="w-9 h-9 flex items-center justify-center rounded-lg text-error hover:bg-error-container transition-colors">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline mb-2">receipt_long</span>
                    <p className="text-on-surface-variant text-sm">Нет операций</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {page.hasMore && (
        <div className="hidden sm:flex justify-center">
          <button onClick={loadMore} className="px-8 py-3 rounded-2xl border-2 border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container transition-colors">
            Загрузить ещё
          </button>
        </div>
      )}

      {/* Modal: Add/Edit Transaction */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Редактировать операцию' : 'Добавить операцию'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Large Amount Input */}
          <div className="relative">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Сумма</label>
            <div className="relative">
              <FormattedInput
                value={watch('amount') || ''}
                onChange={(v) => setValue('amount', v)}
                className="w-full py-5 px-6 bg-surface-container-low border-2 border-transparent rounded-2xl text-3xl font-extrabold text-on-surface outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-outline/40"
                placeholder="0"
                min={1}
                max={999999999}
                label="Сумма"
                showValidation={true}
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-on-surface-variant">₽</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2 ml-1">
              Максимальная сумма: 999 999 999 ₽
            </p>
          </div>

          {/* Segmented Toggle: Income/Expense */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Тип</label>
            <div className="flex bg-surface-container p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setValue('type', 'expense')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
                  watch('type') === 'expense'
                    ? 'bg-error-container text-on-error-container shadow-sm'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-sm">trending_down</span>
                Расход
              </button>
              <button
                type="button"
                onClick={() => setValue('type', 'income')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
                  watch('type') === 'income'
                    ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-sm">trending_up</span>
                Доход
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Категория</label>
              <select {...register('category_id', { required: true })} className="select-ghost">
                <option value="">Выберите</option>
                {categories.filter(c => c.type === watch('type')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Дата</label>
              <input type="date" {...register('date', { required: true })} className="select-ghost" />
            </div>
          </div>
          {accounts.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Счет</label>
              <select {...register('account_id')} className="select-ghost">
                <option value="">Выберите счет</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Комментарий</label>
            <textarea {...register('comment')} rows="2" className="input-ghost" placeholder="Необязательно" />
          </div>
          <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl">
            <div>
              <span className="text-sm font-semibold text-on-surface">🔒 Скрытая операция</span>
              <p className="text-xs text-on-surface-variant">Операция будет видна только вам (другие участники увидят «Сюрприз» вместо суммы)</p>
            </div>
            <button
              type="button"
              onClick={() => setValue('scope', watch('scope') === 'personal' ? 'family' : 'personal')}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                watch('scope') === 'personal' ? 'bg-primary' : 'bg-outline-variant'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                watch('scope') === 'personal' ? 'translate-x-5' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>
          {space !== 'personal' && hasFamily && (
            <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl">
              <div>
                <span className="text-sm font-semibold text-on-surface">👥 Тип операции</span>
                <p className="text-xs text-on-surface-variant">
                  {watch('scope') === 'personal'
                    ? 'Личная операция — только ваша, не учитывается в семейном бюджете'
                    : 'Семейная операция — видна всем участникам, учитывается в общем бюджете'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setValue('scope', watch('scope') === 'personal' ? 'family' : 'personal')}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                  watch('scope') === 'personal' ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                  watch('scope') === 'personal' ? 'translate-x-5' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>
          )}
          {hasFamily && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container p-3 rounded-xl">
              <span className="material-symbols-outlined text-sm">lightbulb</span>
              <span>Переключатель «Личное/Семья» влияет только на видимость. Для сокрытия суммы от других участников используйте переключатель «Скрытая операция».</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost px-6 py-3">Отмена</button>
            <button type="submit" className="btn-primary px-8 py-3">
              {editingId ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={handleConfirmClose}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}
