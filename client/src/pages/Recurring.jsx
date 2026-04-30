import { Link } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import FormattedInput from '../components/ui/FormattedInput';
import { useForm } from 'react-hook-form';
import { formatMoney } from '../utils/format';
import { showError } from '../utils/toast';

export default function Recurring({ space = 'personal' }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, title: '', message: '' });
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const fetchRecurring = async () => {
    try {
      const res = await api.get(`/${space}/recurring`);
      setItems(res.data || []);
    } catch (err) { console.error('Recurring fetch error:', err); }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
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
      fetchRecurring(),
      fetchCategories(),
      fetchAccounts(),
    ]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [space]);

  const onCreate = async (data) => {
    try {
      const today = new Date();
      const startMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      await api.post(`/${space}/recurring`, {
        type: data.type, amount: Number(data.amount), category_id: Number(data.category_id),
        account_id: data.account_id ? Number(data.account_id) : null,
        day_of_month: Number(data.day_of_month), comment: data.comment,
        start_month: startMonth,
        visibility: space === 'family' ? 'family' : 'personal',
      });
      setModalOpen(false); reset(); fetchRecurring();
    } catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
  };

  const toggleActive = async (item) => {
    try { await api.put(`/${space}/recurring/${item.id}`, { active: !item.active }); fetchRecurring(); }
    catch (err) { showError(err.response?.data?.message || 'Ошибка'); }
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
        try { await api.delete(`/${space}/recurring/${id}`); fetchRecurring(); }
        catch (err) { showError(err.response?.data?.message || 'Ошибка'); }
      }
    });
  };

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
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Регулярные операции</h2>
          <p className="text-on-surface-variant text-sm mt-1">Автоматически создаются раз в месяц (день 1–28)</p>
        </div>
        <button onClick={() => { reset({ type: 'expense', day_of_month: 1, scope: 'personal' }); setModalOpen(true); }} className="btn-primary px-6 py-2.5 flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-sm">add</span>
          Добавить
        </button>
      </div>

      {/* Stats Grid 3-column */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-card">
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
        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-card">
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
        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-card">
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
      <div className="bg-surface-container-lowest rounded-3xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Активно</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Тип</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Категория</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Сумма</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">День</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Комментарий</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-on-surface-variant uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
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
                    <button onClick={() => remove(i.id)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-error hover:bg-error-container transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Новая регулярная операция">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-6">
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
            <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl">
              <div>
                <span className="text-sm font-semibold text-on-surface">Скрыть от семьи</span>
                <p className="text-xs text-on-surface-variant">Операция будет видна только вам</p>
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
