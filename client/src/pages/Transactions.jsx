import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api, { downloadFile } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { showError } from '../utils/toast';
import TransactionFilters from '../components/TransactionFilters';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';
import logger from '../utils/logger';
import { SkeletonTable } from '../components/ui/Skeleton';
import { localDateStr } from '../utils/date';
import { flags } from '../config/flags';

export default function Transactions({ space = 'personal' }) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState({ items: [], limit: 30, offset: 0, hasMore: false });
  const [filters, setFilters] = useState(() => {
    const today = new Date();
    const start = localDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
    const end = localDateStr(today);
    return { startDate: start, endDate: end, type: '', categoryId: '', accountId: '', includePrivate: 'all', q: '' };
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [datePreset, setDatePreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, title: '', message: '', variant: 'danger' });
  const [pendingBudgetWarning, setPendingBudgetWarning] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  
  const hasFamily = flags.familyEnabled && currentUser?.family_id;

  const updateDateFilter = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    let start = '', end = '';
    switch (preset) {
      case 'today':
        start = end = localDateStr(today);
        break;
      case 'yesterday': {
        const y = new Date(today); y.setDate(today.getDate() - 1);
        start = end = localDateStr(y);
        break;
      }
      case 'week': {
        const w = new Date(today); w.setDate(today.getDate() - today.getDay());
        start = localDateStr(w); end = localDateStr(today);
        break;
      }
      case 'month':
        start = localDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
        end = localDateStr(today);
        break;
      case 'custom':
        start = customStart; end = customEnd;
        break;
      default: break;
    }
    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  };

  const buildParams = useCallback((offset = 0) => {
    const params = { paginate: true, limit: page.limit, offset };
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.type) params.type = filters.type;
    if (filters.categoryId) params.categoryId = filters.categoryId;
    if (filters.accountId) params.accountId = filters.accountId;
    if (filters.includePrivate && filters.includePrivate !== 'all') params.includePrivate = filters.includePrivate;
    if (filters.q) params.q = filters.q;
    return params;
  }, [filters, page.limit]);

  const fetchTransactions = useCallback(async (offset = 0) => {
    const params = buildParams(offset);
    try {
      const res = await api.get('/transactions', { params });
      const items = res.data?.items || [];
      const meta = res.data?.meta || {};
      setTransactions(items);
      setPage(prev => ({ ...prev, items, offset: meta.offset ?? offset, hasMore: !!meta.hasMore }));
    } catch (err) { logger.error('Transactions fetch error:', err); }
  }, [buildParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchTransactions(0),
      (async () => {
        try {
          const res = await api.get('/categories');
          setCategories(res.data);
        } catch (err) { logger.error('Categories fetch error:', err); }
      })(),
      (async () => {
        try {
          const res = await api.get('/accounts');
          setAccounts(res.data || []);
        } catch (err) { logger.error('Accounts fetch error:', err); }
      })(),
    ]);
    setLoading(false);
  }, [fetchTransactions]);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => cancelled || undefined).catch(() => {});
    return () => { cancelled = true; };
  }, [fetchData]);

  const loadMore = async () => {
    try {
      const nextOffset = transactions.length;
      const res = await api.get('/transactions', { params: buildParams(nextOffset) });
      const items = res.data?.items || [];
      const meta = res.data?.meta || {};
      setTransactions(prev => [...prev, ...items]);
      setPage(prev => ({ ...prev, offset: meta.offset ?? nextOffset, hasMore: !!meta.hasMore }));
    } catch (err) { logger.error(err); }
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
    let cancelled = false;
    api.get('/auth/me').then(res => { if (!cancelled) setCurrentUser(res.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTransactions(0).then(() => cancelled || undefined).catch(() => {});
    return () => { cancelled = true; };
  }, [filters.startDate, filters.endDate, filters.type, filters.categoryId, filters.includePrivate, fetchTransactions]);

  const onSubmit = async (data) => {
    try {
      if (editingId) {
        await api.patch(`/transactions/${editingId}`, data);
      } else {
        const payload = { 
          ...data, 
          amount: Number(data.amount),
          category_id: Number(data.category_id)
        };
        if (data.account_id) payload.account_id = Number(data.account_id);
        if (!payload.date) payload.date = localDateStr();
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
    } catch (err) { logger.error(err); showError(err.response?.data?.message || 'Ошибка при сохранении'); }
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
        catch (err) { logger.error(err); showError('Ошибка при удалении'); }
      }
    });
  };

  const batchDeleteTransactions = () => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: `Удалить ${selectedIds.length} операций?`,
      message: 'Это действие нельзя отменить.',
      confirmText: 'Удалить',
      onConfirm: async () => {
        try {
          await api.post('/transactions/batch-delete', { ids: selectedIds });
          setSelectedIds([]);
          fetchTransactions(0);
        } catch (err) { logger.error(err); showError('Ошибка при массовом удалении'); }
      }
    });
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    setSelectedIds(transactions.map(t => t.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const duplicateTransaction = (t) => {
    setEditingId(null);
    setValue('amount', t.amount);
    setValue('type', t.type);
    setValue('category_id', t.category_id);
    setValue('account_id', t.account_id || '');
    setValue('date', localDateStr());
    setValue('comment', t.comment || '');
    setValue('scope', t.scope || (t.is_personal !== false ? 'personal' : 'family'));
    setModalOpen(true);
  };

  const handleConfirmClose = async () => {
    if (pendingBudgetWarning) {
      try { await api.delete(`/transactions/${pendingBudgetWarning.txId}`); }
      catch (err) { logger.error(err); showError('Ошибка при отмене операции'); }
    }
    setConfirmModal({ open: false });
    setPendingBudgetWarning(null);
  };

  const resetFilters = () => {
    const today = localDateStr();
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
    await downloadFile(`/api/export/transactions?format=${format === 'excel' ? 'xlsx' : 'csv'}${query}`, `transactions-${localDateStr()}.${ext}`);
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <SkeletonTable rows={8} cols={5} className="w-full max-w-6xl" />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Назад
          </button>
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
              <div className="absolute right-0 mt-2 w-44 bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/60 overflow-hidden z-50">
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
          reset({ type: 'expense', scope: 'personal', date: localDateStr() });
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

      <TransactionFilters
        datePreset={datePreset}
        onDatePresetChange={updateDateFilter}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        type={filters.type}
        onTypeChange={v => setFilters(prev => ({ ...prev, type: v }))}
        categoryId={filters.categoryId}
        onCategoryIdChange={v => setFilters(prev => ({ ...prev, categoryId: v }))}
        accountId={filters.accountId}
        onAccountIdChange={v => setFilters(prev => ({ ...prev, accountId: v }))}
        includePrivate={filters.includePrivate}
        onIncludePrivateChange={v => setFilters(prev => ({ ...prev, includePrivate: v }))}
        categories={categories}
        accounts={accounts}
        filtersOpen={filtersOpen}
        onReset={resetFilters}
        startDate={filters.startDate}
        endDate={filters.endDate}
      />

      <TransactionList
        transactions={transactions}
        hasMore={page.hasMore}
        onLoadMore={loadMore}
        onDuplicate={duplicateTransaction}
        onEdit={openEditModal}
        onDelete={deleteTransaction}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
      />

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-container-lowest shadow-lg rounded-3xl border border-outline-variant px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-semibold text-on-surface">Выбрано: {selectedIds.length}</span>
          <button
            onClick={handleClearSelection}
            className="px-3 py-1.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Отменить
          </button>
          <button
            onClick={batchDeleteTransactions}
            className="px-4 py-1.5 rounded-xl text-sm font-semibold text-on-error bg-error hover:opacity-90 transition-colors"
          >
            <span className="material-symbols-outlined text-sm mr-1 align-middle">delete</span>
            Удалить
          </button>
        </div>
      )}

      <TransactionForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingId={editingId}
        categories={categories}
        accounts={accounts}
        space={space}
        hasFamily={hasFamily}
        register={register}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        watch={watch}
        setValue={setValue}
        reset={reset}
      />

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
