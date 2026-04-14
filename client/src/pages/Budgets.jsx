import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import FormattedInput from '../components/ui/FormattedInput';
import { useForm } from 'react-hook-form';
import { formatMoney } from '../utils/format';

function currentMonth() { return new Date().toISOString().slice(0, 7); }

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [memberFilter, setMemberFilter] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberContributions, setMemberContributions] = useState({});
  const { register, handleSubmit, reset, watch, setValue } = useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { month };
      if (memberFilter) params.memberId = memberFilter;
      const [budgetsRes, catRes, dashRes] = await Promise.all([
        api.get('/budgets', { params }),
        api.get('/categories'),
        api.get('/dashboard'),
      ]);
      setItems(budgetsRes.data?.items || []);
      setCategories(catRes.data || []);
      setMemberContributions(budgetsRes.data?.memberContributions || {});
      if (dashRes.data?.family?.memberStats) {
        setMembers(dashRes.data.family.memberStats);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [month, memberFilter]);

  const onCreate = async (data) => {
    try {
      await api.post('/budgets', {
        month,
        type: data.type,
        category_id: Number(data.category_id),
        limit_amount: Number(data.limit_amount),
        is_personal: data.is_personal === 'true',
      });
      setModalOpen(false); reset(); fetchData();
    } catch (err) { console.error(err); alert(err.response?.data?.message || 'Ошибка'); }
  };

  const onUpdate = async (id, nextLimit) => {
    try { await api.put(`/budgets/${id}`, { limit_amount: Number(nextLimit) }); fetchData(); }
    catch (err) { console.error(err); alert(err.response?.data?.message || 'Ошибка'); }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Удалить бюджет?')) return;
    try { await api.delete(`/budgets/${id}`); fetchData(); }
    catch (err) { console.error(err); alert(err.response?.data?.message || 'Ошибка'); }
  };

  const totals = useMemo(() => {
    const byType = { income: { limit: 0, actual: 0 }, expense: { limit: 0, actual: 0 } };
    for (const i of items) { byType[i.type].limit += Number(i.limit_amount || 0); byType[i.type].actual += Number(i.actual_amount || 0); }
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
          <p className="text-on-surface-variant text-sm mt-1">План/факт по категориям за месяц</p>
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
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="select-ghost py-2.5 text-sm" />
          <button onClick={() => { reset({ type: 'expense', is_personal: 'false' }); setModalOpen(true); }} className="btn-primary px-6 py-2.5 flex items-center gap-2 text-sm">
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
                        b.type === 'expense' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'
                      }`}>
                        <span className="material-symbols-outlined text-sm">{b.type === 'expense' ? 'trending_down' : 'trending_up'}</span>
                        {b.type === 'expense' ? 'Расход' : 'Доход'}
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
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${isOver ? 'text-error' : 'text-on-surface'}`}>
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
                            <div className={`progress-bar-fill ${isOver ? 'bg-error' : 'bg-primary'}`} style={{ width: `${progress}%` }}></div>
                          </div>
                        )}
                        <span className={`text-xs font-bold ${isOver ? 'text-error' : 'text-on-surface-variant'}`}>{progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { const next = prompt('Новый план (₽):', String(Math.trunc(Number(b.limit_amount || 0)))); if (next) onUpdate(b.id, next); }} className="w-9 h-9 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors">
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
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type === 'income' ? 'Доход' : 'Расход'})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Бюджет</label>
            <select {...register('is_personal')} className="select-ghost">
              <option value="false">Семейный</option>
              <option value="true">Личный</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">План (₽)</label>
            <FormattedInput value={watch('limit_amount') || ''} onChange={(v) => setValue('limit_amount', v)} className="input-ghost" placeholder="0" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost px-6 py-3">Отмена</button>
            <button type="submit" className="btn-primary px-8 py-3">Сохранить</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
