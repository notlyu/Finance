import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import FormattedInput from '../components/ui/FormattedInput';
import { useForm } from 'react-hook-form';
import { formatMoney } from '../utils/format';
import { showError } from '../utils/toast';

function formatMonth(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function currentMonth() { return formatMonth(new Date()); }
function formatYear(date) { return String(date.getFullYear()); }
function currentYear() { return formatYear(new Date()); }

export default function Budgets({ space = 'personal' }) {
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(currentYear());
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [memberFilter, setMemberFilter] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberContributions, setMemberContributions] = useState({});
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, title: '', message: '' });
  const [editLimitModal, setEditLimitModal] = useState({ open: false, budgetId: null, currentLimit: 0, onSave: null });
  const [periodType, setPeriodType] = useState('month');
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      month: currentMonth(),
      scope: 'family',
      category_id: '',
      limit_amount: '',
      budgetType: 'expense',
      is_year_budget: false,
    }
  });

  const fetchBudgets = async () => {
    const params = periodType === 'year' ? { period: 'year', year } : { month };
    if (memberFilter) params.memberId = memberFilter;
    try {
      const budgetsRes = await api.get('/budgets', { params });
      setItems(budgetsRes.data?.items || []);
      setMemberContributions(budgetsRes.data?.memberContributions || {});
    } catch (err) {
      console.error('Budget fetch error:', err);
      showError('Ошибка загрузки бюджетов: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchCategories = async () => {
    try {
      const catRes = await api.get('/categories');
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Categories fetch error:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      const dashRes = await api.get('/dashboard');
      if (dashRes.data?.family?.memberStats) {
        setMembers(dashRes.data.family.memberStats);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    // Независимые запросы — ошибка одного не блокирует другие
    await Promise.allSettled([
      fetchBudgets(),
      fetchCategories(),
      fetchMembers(),
    ]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [month, year, memberFilter, periodType]);

  const onCreate = async (data) => {
    try {
      const budgetMonth = data.month || month;
      const limitAmount = Number(data.limit_amount);
      const yearNum = Number(year);
      // scope from form: 'personal' or 'family'
      const scope = data.scope || 'family';
      const createPromises = [];

      if (periodType === 'year' && data.is_year_budget) {
        for (let m = 1; m <= 12; m++) {
          const mm = String(m).padStart(2, '0');
          createPromises.push(api.post('/budgets', {
            month: `${yearNum}-${mm}`,
            category_id: Number(data.category_id),
            limit_amount: limitAmount,
            scope,
            type: data.budgetType || 'expense',
            is_year_budget: true,
          }));
        }
        await Promise.all(createPromises);
      } else {
        await api.post('/budgets', {
          month: budgetMonth,
          category_id: Number(data.category_id),
          limit_amount: limitAmount,
          scope,
          type: data.budgetType || 'expense',
        });
      }
      setModalOpen(false); 
      reset(); 
      if (budgetMonth !== month && periodType !== 'year') {
        setMonth(budgetMonth);
      }
      fetchBudgets();
    } catch (err) { 
      console.error('Create budget error:', err); 
      showError(err.response?.data?.message || 'Ошибка'); 
    }
  };

  const onUpdate = async (id, nextLimit) => {
    try { await api.put(`/budgets/${id}`, { limit_amount: Number(nextLimit) }); fetchBudgets(); }
    catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
  };

  const onDelete = async (id) => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Удалить бюджет?',
      message: 'Это действие нельзя отменить.',
      confirmText: 'Удалить',
      onConfirm: async () => {
        try { await api.delete(`/budgets/${id}`); fetchBudgets(); }
        catch (err) { console.error(err); showError(err.response?.data?.message || 'Ошибка'); }
      }
    });
  };

  const totals = useMemo(() => {
    const byType = { income: { limit: 0, actual: 0 }, expense: { limit: 0, actual: 0 } };
    if (!items || !Array.isArray(items)) return byType;
    for (const i of items) {
      if (!i || !i.category_type) continue;
      const type = i.category_type === 'income' ? 'income' : 'expense';
      if (!byType[type]) continue;
      byType[type].limit += Number(i.limit_amount || 0);
      byType[type].actual += Number(i.actual_amount || 0);
    }
    return byType;
  }, [items]);

  const colors = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-error'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Назад
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Бюджеты</h2>
          <p className="text-on-surface-variant text-sm mt-1">{items.length} бюджетов • {periodType === 'year' ? `Год ${year}` : month}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {members.length > 1 && (
            <select
              value={memberFilter || ''}
              onChange={e => setMemberFilter(e.target.value ? Number(e.target.value) : null)}
              className="select-ghost py-2.5 text-sm"
            >
              <option value="">Все участники</option>
              {members.map(m => (
                <option key={m.userId} value={m.userId}>{m.name}</option>
              ))}
            </select>
          )}
          <div className="flex bg-surface-container rounded-xl p-1">
            <button 
              type="button" 
              onClick={() => { setPeriodType('month'); setMonth(currentMonth()); }} 
              className={`flex px-4 py-2 rounded-lg text-sm font-bold transition-all ${periodType === 'month' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-sm mr-1 align-middle">calendar_month</span>
              Месяц
            </button>
            <button 
              type="button" 
              onClick={() => { setPeriodType('year'); setYear(currentYear()); }} 
              className={`flex px-4 py-2 rounded-lg text-sm font-bold transition-all ${periodType === 'year' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-sm mr-1 align-middle">event</span>
              Год
            </button>
          </div>
          {periodType === 'month' ? (
            <>
              <button onClick={() => { const [y, m] = month.split('-').map(Number); const newDate = new Date(y, m - 2, 15); setMonth(formatMonth(newDate)); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white transition-all" title="Предыдущий месяц">
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-full">
                <span className="material-symbols-outlined text-primary text-lg">calendar_month</span>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-transparent text-sm font-bold text-on-surface outline-none w-24" />
              </div>
              <button onClick={() => { const [y, m] = month.split('-').map(Number); const newDate = new Date(y, m, 15); setMonth(formatMonth(newDate)); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white transition-all" title="Следующий месяц">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setYear(String(Number(year) - 1))} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white transition-all" title="Предыдущий год">
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-full">
                <span className="material-symbols-outlined text-primary text-lg">event</span>
                <input type="number" value={year} onChange={(e) => setYear(e.target.value)} min="2020" max="2030" className="bg-transparent text-sm font-bold text-on-surface outline-none w-16 text-center" />
              </div>
              <button onClick={() => setYear(String(Number(year) + 1))} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white transition-all" title="Следующий год">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </>
          )}
          <button onClick={() => {
            if (periodType === 'month') {
              reset({ month: currentMonth(), scope: 'family', category_id: '', limit_amount: '', budgetType: 'expense', is_year_budget: false });
            } else {
              reset({ month: year, scope: 'family', category_id: '', limit_amount: '', budgetType: 'expense', is_year_budget: true });
            }
            setModalOpen(true);
          }} className="btn-primary px-5 py-2.5 flex items-center gap-2 text-sm rounded-full">
            <span className="material-symbols-outlined text-sm">add</span>
            Добавить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-sm">trending_up</span>
            </div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Доходы</p>
          </div>
          <p className="text-xl font-extrabold font-headline text-on-surface">{formatMoney(totals.income.actual)} ₽</p>
          <p className="text-xs text-secondary mt-1 font-semibold">
            {totals.income.limit > 0 ? `${Math.round((totals.income.actual / totals.income.limit) * 100)}% от плана` : 'Без плана'}
          </p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-sm">trending_down</span>
            </div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Расходы</p>
          </div>
          <p className="text-xl font-extrabold font-headline text-on-surface">{formatMoney(totals.expense.actual)} ₽</p>
          <div className="progress-bar h-1.5 mt-2">
            <div className={`progress-bar-fill ${totals.expense.limit > 0 && totals.expense.actual > totals.expense.limit ? 'bg-error' : 'bg-primary'}`} style={{ width: `${totals.expense.limit > 0 ? Math.min(100, (totals.expense.actual / totals.expense.limit) * 100) : 0}%` }}></div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-sm">savings</span>
            </div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Накопления</p>
          </div>
          <p className="text-xl font-extrabold font-headline text-on-surface">{formatMoney(Math.max(0, totals.income.actual - totals.expense.actual))} ₽</p>
          <p className="text-xs text-on-surface-variant mt-1">Доходы − Расходы</p>
        </div>
        <div className="bg-gradient-to-br from-primary to-primary-container text-white p-5 rounded-3xl shadow-button relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 mb-2 relative">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
            </div>
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Свободно</p>
          </div>
          <p className="text-xl font-extrabold font-headline relative">{formatMoney(Math.max(0, totals.income.actual - totals.expense.actual))} ₽</p>
          <p className="text-xs text-white/60 mt-1 relative">Доступно к распределению</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Активно</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Тип</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Категория</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">План</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Факт</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-widest">Прогресс</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-on-surface-variant uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((b, i) => {
                const progress = Math.min(100, Math.round(Number(b.progress || 0)));
                const isOver = Number(b.actual_amount || 0) > Number(b.limit_amount || 0);
                const hasMembers = b.spent_by_members && b.spent_by_members.length > 1 && b.spent_by_members.some(m => m.amount > 0);
                return (
                  <tr key={b.id} className={`transition-colors hover:bg-surface-container ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        (b.category_type || 'expense') === 'expense' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'
                      }`}>
                        <span className="material-symbols-outlined text-sm">{(b.category_type || 'expense') === 'expense' ? 'trending_down' : 'trending_up'}</span>
                        {(b.category_type || 'expense') === 'expense' ? 'Расход' : 'Доход'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-on-surface">{b.category_name}</span>
                      {hasMembers && (
                        <div className="flex items-center gap-1 mt-1">
                          {b.spent_by_members.filter(m => m.amount > 0).map((m, idx) => (
                            <span key={m.userId} className="text-[10px] px-1.5 py-0.5 bg-surface-container rounded-full text-on-surface-variant flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${colors[idx % colors.length]}`}></span>
                              {m.name}: {formatMoney(m.amount)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">{formatMoney(b.limit_amount)} ₽</td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${isOver ? (b.category_type === 'income' ? 'text-secondary' : 'text-error') : 'text-on-surface'}`}>
                {formatMoney(b.actual_amount)} ₽
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  {hasMembers ? (
                    <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ minWidth: 128 }}>
                      {b.spent_by_members.filter(m => m.amount > 0).map((m, idx) => (
                        <div
                          key={m.userId}
                          className={`h-full ${colors[idx % colors.length]} transition-all`}
                          style={{ width: `${m.percentage}%` }}
                          title={`${m.name}: ${m.percentage}%`}
                        ></div>
                      ))}
                      <div className="h-full bg-surface-container flex-1"></div>
                    </div>
                  ) : (
                    <div className="progress-bar flex-1 w-32">
                      <div className={`progress-bar-fill ${isOver ? (b.category_type === 'income' ? 'bg-secondary' : 'bg-error') : 'bg-primary'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  )}
                  <span className={`text-xs font-bold ${isOver ? (b.category_type === 'income' ? 'text-secondary' : 'text-error') : 'text-on-surface-variant'}`}>{progress}%</span>
                </div>
              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditLimitModal({ open: true, budgetId: b.id, currentLimit: Number(b.limit_amount || 0), onSave: onUpdate })} className="w-9 h-9 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onClick={() => onDelete(b.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-error hover:bg-error-container transition-colors">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-outline mb-3">account_balance_wallet</span>
                    <h3 className="text-lg font-bold text-on-surface mb-1">Нет бюджетов</h3>
                    <p className="text-on-surface-variant text-sm">Добавьте первый бюджет на этот месяц</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Новый бюджет">
        <p className="text-xs text-on-surface-variant mb-4 -mt-2">
          {periodType === 'year' ? 'Создайте годовой бюджет (будет распределён по 12 месяцам)' : 'Создайте бюджет на месяц'}
        </p>
        <form onSubmit={handleSubmit(onCreate)} className="space-y-6">
          {periodType === 'month' && (
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Месяц</label>
              <input type="month" {...register('month', { value: month })} className="select-ghost" />
            </div>
          )}
          {periodType === 'year' && (
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Год</label>
              <input type="number" {...register('month', { value: year })} min="2020" max="2030" className="select-ghost" />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Тип бюджета</label>
            <div className="flex bg-surface-container rounded-xl p-1">
              <button type="button" onClick={() => setValue('budgetType', 'expense')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${watch('budgetType') === 'expense' || !watch('budgetType') ? 'bg-error text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                <span className="material-symbols-outlined text-sm mr-1 align-middle">trending_down</span>
                Расход
              </button>
              <button type="button" onClick={() => setValue('budgetType', 'income')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${watch('budgetType') === 'income' ? 'bg-secondary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                <span className="material-symbols-outlined text-sm mr-1 align-middle">trending_up</span>
                Доход
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Категория</label>
            <select {...register('category_id', { required: true })} className="select-ghost">
              <option value="">Выберите</option>
              {categories.filter(c => c.type === (watch('budgetType') || 'expense')).map((c) => (
                <option key={c.id} value={c.id}>{c.type === 'income' ? '💰' : '💸'} {c.name}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-error mt-1">Нет доступных категорий</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="is_year_budget"
              {...register('is_year_budget')}
              className="w-5 h-5 rounded text-primary focus:ring-primary"
            />
            <label htmlFor="is_year_budget" className="text-sm text-on-surface">
              Распределить равными частями на весь год
            </label>
          </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">
                Лимит {periodType === 'year' && watch('is_year_budget') ? '(₽/год)' : '(₽)'}
              </label>
              <FormattedInput value={watch('limit_amount') || ''} onChange={(v) => setValue('limit_amount', v)} className="input-ghost" placeholder="0" min={1} max={999999999} label="Лимит" />
              {periodType === 'year' && watch('is_year_budget') && (
                <p className="text-xs text-on-surface-variant mt-1">Будет распределено по {watch('limit_amount') ? Number(watch('limit_amount'))/12 : 0} ₽/мес</p>
              )}
            </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Тип бюджета</label>
            <select {...register('scope')} className="select-ghost">
              <option value="personal">Личный</option>
              <option value="family">Семейный</option>
            </select>
          </div>
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

      {editLimitModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/50" onClick={() => setEditLimitModal({ open: false })}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-surface-container-lowest rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-surface-container-lowest px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-bold font-headline text-on-surface">Изменить лимит</h3>
                <div className="mt-4">
                  <input
                    type="number"
                    defaultValue={editLimitModal.currentLimit}
                    className="input-ghost w-full"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.target.value;
                        if (val) editLimitModal.onSave(editLimitModal.budgetId, val);
                        setEditLimitModal({ open: false });
                      }
                    }}
                  />
                </div>
                <div className="mt-6 flex gap-3 justify-end">
                  <button onClick={() => setEditLimitModal({ open: false })} className="btn-ghost px-4 py-2.5">Отмена</button>
                  <button onClick={(e) => {
                    const val = e.target.parentElement.parentElement.querySelector('input').value;
                    if (val) editLimitModal.onSave(editLimitModal.budgetId, val);
                    setEditLimitModal({ open: false });
                  }} className="btn-primary px-4 py-2.5">Сохранить</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
