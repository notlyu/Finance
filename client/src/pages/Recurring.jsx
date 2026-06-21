import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import FormattedInput from '../components/ui/FormattedInput';
import { useForm } from 'react-hook-form';
import { formatMoney } from '../utils/format';
import logger from '../utils/logger';
import { SkeletonTable } from '../components/ui/Skeleton';
import Toggle from '../components/ui/Toggle';

export default function Recurring({ space = 'personal' }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, title: '', message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const fetchRecurring = useCallback(async () => {
    try {
      const res = await api.get('/recurring');
      setItems(res.data?.items || res.data || []);
    } catch (err) { logger.error('Recurring fetch error:', err); }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchRecurring(),
      (async () => {
        try {
          const res = await api.get('/categories');
          setCategories(res.data || []);
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
  }, [fetchRecurring]);

  useEffect(() => {
    let c = false;
    fetchData().then(() => c || undefined).catch(() => {});
    return () => { c = true; };
  }, [fetchData]);

  const onCreate = async (data) => {
    try {
      const today = new Date();
      const startMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      await api.post('/recurring', {
        type: data.type, amount: Number(data.amount), category_id: Number(data.category_id),
        account_id: data.account_id ? Number(data.account_id) : null,
        day_of_month: Number(data.day_of_month), comment: data.comment,
        start_month: startMonth,
        visibility: space === 'family' ? 'family' : 'personal',
      });
      setModalOpen(false); reset(); fetchRecurring();
    } catch (err) { logger.error(err); }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    reset({
      type: item.type,
      category_id: item.category_id,
      amount: String(item.amount),
      day_of_month: item.day_of_month,
      account_id: item.account_id || '',
      comment: item.comment || '',
      scope: item.scope || 'personal',
    });
    setModalOpen(true);
  };

  const onUpdate = async (data) => {
    try {
      await api.patch(`/recurring/${editingItem.id}`, {
        type: data.type, amount: Number(data.amount), category_id: Number(data.category_id),
        account_id: data.account_id ? Number(data.account_id) : null,
        day_of_month: Number(data.day_of_month), comment: data.comment,
        scope: data.scope,
      });
      setModalOpen(false); setEditingItem(null); reset(); fetchRecurring();
    } catch (err) { logger.error(err); }
  };

  const toggleActive = async (item) => {
    try { await api.patch(`/recurring/${item.id}`, { active: !item.active }); fetchRecurring(); }
    catch (err) {}
  };

  const remove = async (id) => {
    const item = items.find(i => i.id === id);
    let message = 'Это действие нельзя отменить.';
    if (item?.goal_id) {
      message = `Этот платёж связан с целью. Отключить автопополнение цели?`;
    } else if (item?.debt_id) {
      message = `Этот платёж связан с долгом. Отключить регулярный платёж по долгу?`;
    }
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Удалить регулярную операцию?',
      message,
      confirmText: 'Удалить',
      onConfirm: async () => {
        try { await api.delete(`/recurring/${id}`); fetchRecurring(); }
        catch (err) {}
      }
    });
  };

  // Client-side filtering
  const filteredItems = useMemo(() => {
    let result = items;
    if (typeFilter) result = result.filter(i => i.type === typeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        (i.comment && i.comment.toLowerCase().includes(q)) ||
        (i.category_name && i.category_name.toLowerCase().includes(q)) ||
        (String(i.amount).includes(q))
      );
    }
    return result;
  }, [items, typeFilter, searchQuery]);

  const [sortField, setSortField] = useState('day_of_month');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'amount') cmp = Number(a.amount) - Number(b.amount);
      else if (sortField === 'day_of_month') cmp = a.day_of_month - b.day_of_month;
      else if (sortField === 'category_name') cmp = (a.category_name || '').localeCompare(b.category_name || '', 'ru');
      else if (sortField === 'type') cmp = (a.type || '').localeCompare(b.type || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredItems, sortField, sortDir]);

  // Stats — must be before any early return
  const activeCount = items.filter(i => i.active).length;
  const monthlyTotal = useMemo(() => items.filter(i => i.active).reduce((s, i) => s + Number(i.amount || 0), 0), [items]);
  const nextItem = useMemo(() => {
    const today = new Date().getDate();
    const active = items.filter(i => i.active).sort((a, b) => a.day_of_month - b.day_of_month);
    const next = active.find(i => i.day_of_month >= today);
    return next || active[0];
  }, [items]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <SkeletonTable rows={6} cols={5} className="w-full max-w-5xl" />
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
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Регулярные операции</h2>
          <p className="text-on-surface-variant text-sm mt-1">Автоматически создаются раз в месяц (день 1–28)</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-ghost px-4 py-2.5 text-sm w-48"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="select-ghost text-sm"
          >
            <option value="">Все типы</option>
            <option value="income">Доходы</option>
            <option value="expense">Расходы</option>
          </select>
          <button onClick={() => { setEditingItem(null); reset({ type: 'expense', day_of_month: 1, scope: 'personal' }); setModalOpen(true); }} className="btn-primary px-6 py-2.5 flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-sm">add</span>
          Добавить
        </button>
        </div>
      </div>

      {/* Stats Grid 3-column */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-card border border-outline-variant/60">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">autorenew</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Прогноз / месяц</p>
              <p className="text-xl font-extrabold font-headline text-on-surface">{formatMoney(monthlyTotal)} ₽</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-card border border-outline-variant/60">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">calendar_today</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Ближайший</p>
              <p className="text-xl font-extrabold font-headline text-on-surface">
                {nextItem ? `${nextItem.day_of_month}-е число` : '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-card border border-outline-variant/60">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Активных</p>
              <p className="text-xl font-extrabold font-headline text-on-surface">{activeCount} <span className="text-base font-medium text-on-surface-variant">/ {items.length}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-card border border-outline-variant/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Активно</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-on-surface select-none" onClick={() => handleSort('type')}>
                  Тип{sortField === 'type' && <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-on-surface select-none" onClick={() => handleSort('category_name')}>
                  Категория{sortField === 'category_name' && <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-on-surface select-none" onClick={() => handleSort('amount')}>
                  Сумма{sortField === 'amount' && <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-on-surface select-none" onClick={() => handleSort('day_of_month')}>
                  День{sortField === 'day_of_month' && <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Комментарий</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-on-surface-variant uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((i, idx) => (
                <tr key={i.id} className={`transition-colors hover:bg-surface-container ${idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => toggleActive(i)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      i.active ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {i.active ? 'Активно' : 'Неактивно'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      i.type === 'expense' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'
                    }`}>
                      <span className="material-symbols-outlined text-sm">{i.type === 'expense' ? 'trending_down' : 'trending_up'}</span>
                      {i.type === 'income' ? 'Доход' : 'Расход'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-on-surface">{i.category_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-on-surface">{formatMoney(i.amount)} ₽</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">{i.day_of_month}-е число</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant max-w-48 truncate">{i.comment || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      i.scope === 'family' || i.scope === 'shared' ? 'bg-primary/10 text-primary' : 'bg-tertiary-container text-tertiary'
                    }`}>
                      <span className="material-symbols-outlined text-xs">{i.scope === 'family' || i.scope === 'shared' ? 'home' : 'person'}</span>
                      {i.scope === 'family' || i.scope === 'shared' ? 'Семейный' : 'Личный'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditModal(i)} className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => remove(i.id)} className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-error hover:bg-error-container transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-outline mb-3">event_repeat</span>
                    <h3 className="text-lg font-bold text-on-surface mb-1">Нет регулярных операций</h3>
                    <p className="text-on-surface-variant text-sm">Добавьте первую регулярную операцию</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingItem(null); }} title={editingItem ? 'Редактировать операцию' : 'Новая регулярная операция'}>
        <form onSubmit={handleSubmit(editingItem ? onUpdate : onCreate)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Тип</label>
              <select {...register('type', { required: true })} className="select-ghost">
                <option value="expense">Расход</option>
                <option value="income">Доход</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Категория</label>
              <select {...register('category_id', { required: true })} className="select-ghost">
                <option value="">Выберите</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Сумма</label>
              <FormattedInput value={watch('amount') || ''} onChange={(v) => setValue('amount', v)} className="input-ghost" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">День месяца</label>
              <input type="number" min="1" max="28" {...register('day_of_month', { required: true, min: 1, max: 28 })} className="input-ghost" placeholder="1" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Счёт (опционально)</label>
            <select {...register('account_id')} className="select-ghost">
              <option value="">Без счёта</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)} ₽)</option>
              ))}
            </select>
            <p className="text-xs text-on-surface-variant mt-1">Если выбран счёт, при выполнении операции будет меняться его баланс</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Комментарий</label>
            <input {...register('comment')} className="input-ghost" placeholder="Необязательно" />
          </div>
          {space !== 'personal' && (
            <div className="flex items-center justify-between p-4 bg-surface-container rounded-3xl">
              <div>
                <span className="text-sm font-semibold text-on-surface">Скрыть от семьи</span>
                <p className="text-xs text-on-surface-variant">Операция будет видна только вам</p>
              </div>
              <Toggle checked={watch('scope') === 'personal'} onChange={() => setValue('scope', watch('scope') === 'personal' ? 'family' : 'personal')} />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost px-6 py-3">Отмена</button>
            <button type="submit" className="btn-primary px-8 py-3">Сохранить</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}
