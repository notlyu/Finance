import { useState, useEffect } from 'react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { formatMoney } from '../utils/format';

const debtTypeIcons = {
  credit: 'account_balance',
  loan: 'paid',
  mortgage: 'home',
  personal: 'person',
};

function EditorialLabel({ children, className = '' }) {
  return (
    <span className={`text-[0.6875rem] uppercase tracking-[0.05em] text-on-surface-variant ${className}`}>
      {children}
    </span>
  );
}

function DebtCard({ debt, onPartialClose, onDelete }) {
  return (
    <div className="group bg-surface-container-lowest dark:bg-surface-container-low p-6 rounded-[1.5rem] hover:shadow-[var(--md-shadow-premium)] transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 bg-surface-container dark:bg-surface-container-high rounded-2xl flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-3xl">
            {debtTypeIcons[debt.type] || 'credit_card'}
          </span>
        </div>
        <div>
          <h4 className="font-bold text-lg text-on-surface">{debt.name}</h4>
          <EditorialLabel className="mt-1">{debt.type === 'credit' ? 'Кредит' : 'Долг'}</EditorialLabel>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1 md:ml-12">
        <div>
          <EditorialLabel className="mb-1">Остаток</EditorialLabel>
          <p className="font-bold text-on-surface">{formatMoney(debt.remaining)} ₽</p>
        </div>
        <div>
          <EditorialLabel className="mb-1">Платёж</EditorialLabel>
          <p className="font-bold text-on-surface">
            {debt.monthly_payment ? `${formatMoney(debt.monthly_payment)} ₽` : '—'}
          </p>
        </div>
        <div className="hidden md:block">
          <EditorialLabel className="mb-1">Процент</EditorialLabel>
          <p className="font-bold text-secondary">{debt.interest_rate ? `${debt.interest_rate}%` : '0%'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onPartialClose(debt)} 
          className="p-3 hover:bg-surface-container dark:hover:bg-surface-container-high rounded-full transition-colors"
          title="Закрыть часть"
        >
          <span className="material-symbols-outlined">payments</span>
        </button>
        <button 
          onClick={() => onDelete(debt.id)} 
          className="p-3 hover:bg-error-container dark:hover:bg-error-container/30 rounded-full transition-colors text-error"
          title="Удалить"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon, variant = 'default' }) {
  const variantClasses = {
    default: 'bg-surface-container-low dark:bg-surface-container text-on-surface',
    warning: 'bg-tertiary-container dark:bg-tertiary-container/80 text-on-tertiary-fixed dark:text-on-tertiary-container',
    success: 'bg-secondary-container dark:bg-secondary-container/80 text-on-secondary-container dark:text-on-secondary-container',
  };

  return (
    <div className={`col-span-1 ${variantClasses[variant]} p-8 rounded-[1.5rem] space-y-6 relative overflow-hidden group`}>
      <div className="relative z-10">
        <EditorialLabel className="block mb-2">{title}</EditorialLabel>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-sm text-on-surface-variant mt-1 opacity-70">{subtitle}</p>}
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
        <span className="material-symbols-outlined text-[8rem]" style={{ fontVariationSettings: "'FILL' 1;" }}>
          {icon}
        </span>
      </div>
    </div>
  );
}

function ProgressCard({ title, value, subtitle, progress }) {
  return (
    <div className="col-span-1 bg-secondary-container dark:bg-secondary-container/80 p-8 rounded-[1.5rem] space-y-4 flex flex-col justify-between">
      <div>
        <EditorialLabel className="block mb-2 opacity-80">{title}</EditorialLabel>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold text-on-secondary-container dark:text-secondary">{progress}%</p>
          <p className="text-sm text-on-secondary-container dark:text-secondary-container mb-1">{subtitle || 'выплачено'}</p>
        </div>
      </div>
      <div className="w-full h-2 bg-surface-container-highest dark:bg-surface-container-highest rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" 
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

function AddDebtModal({ isOpen, onClose, onSubmit, categories, form, setForm, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-surface-container-lowest dark:bg-surface-container-low w-full max-w-lg rounded-[2rem] p-8 space-y-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-on-surface">Добавить долг</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1">Название</label>
              <input 
                required 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary" 
                placeholder="Ипотека, автокредит..." 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1">Тип</label>
              <select
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
                className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary"
              >
                <option value="credit">Кредит</option>
                <option value="mortgage">Ипотека</option>
                <option value="loan">Займ</option>
                <option value="personal">Частный долг</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1">Сумма</label>
              <input 
                required 
                type="number" 
                value={form.total_amount} 
                onChange={e => setForm({...form, total_amount: e.target.value})}
                className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary" 
                placeholder="100000" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1">Остаток</label>
              <input 
                type="number" 
                value={form.remaining} 
                onChange={e => setForm({...form, remaining: e.target.value})}
                className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary" 
                placeholder={form.total_amount || '100000'} 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1">Процент годовых</label>
              <input 
                type="number" 
                step="0.01" 
                value={form.interest_rate} 
                onChange={e => setForm({...form, interest_rate: e.target.value})}
                className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary" 
                placeholder="12.5" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1">Платёж в месяц</label>
              <input 
                type="number" 
                value={form.monthly_payment} 
                onChange={e => setForm({...form, monthly_payment: e.target.value})}
                className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary" 
                placeholder="5000" 
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1">Дата начала</label>
            <input 
              required 
              type="date" 
              value={form.start_date} 
              onChange={e => setForm({...form, start_date: e.target.value})}
              className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary" 
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer px-2">
            <input 
              type="checkbox" 
              checked={form.create_recurring} 
              onChange={e => setForm({...form, create_recurring: e.target.checked})}
              className="w-5 h-5 text-primary rounded" 
            />
            <span className="text-sm font-medium text-on-surface">Создать регулярный платёж</span>
          </label>
          {form.create_recurring && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2 border-l-2 border-primary/20">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1">Категория платежа</label>
                <select 
                  value={form.category_id} 
                  onChange={e => setForm({...form, category_id: e.target.value})}
                  className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Выберите категорию</option>
                  {categories.filter(c => c.type === 'expense').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1">День платежа</label>
                <input 
                  type="number" 
                  min="1" 
                  max="31" 
                  value={form.day_of_month} 
                  onChange={e => setForm({...form, day_of_month: e.target.value})}
                  className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary" 
                  placeholder="День месяца (1-31)" 
                />
              </div>
            </div>
          )}
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 bg-surface-container dark:bg-surface-container-high text-on-surface-variant rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="flex-1 py-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Debts({ space = 'personal' }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, title: '', message: '' });
  const [partialModal, setPartialModal] = useState({ open: false, debt: null, amount: '', accountId: '' });
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '', total_amount: '', remaining: '', interest_rate: '', monthly_payment: '', type: 'credit', start_date: '', notes: '', create_recurring: false, category_id: '', day_of_month: ''
  });

  useEffect(() => { fetchDebts(); fetchCategories(); }, []);

  const fetchDebts = async () => {
    try {
      const res = await api.get('/debts');
      setDebts(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_amount: Number(form.total_amount),
        remaining: Number(form.remaining || form.total_amount),
        monthly_payment: form.monthly_payment ? Number(form.monthly_payment) : undefined,
        interest_rate: form.interest_rate ? Number(form.interest_rate) : undefined,
        category_id: form.create_recurring ? (form.category_id ? Number(form.category_id) : undefined) : undefined,
        day_of_month: form.create_recurring && form.day_of_month ? Number(form.day_of_month) : undefined,
      };
      await api.post('/debts', payload);
      setShowAddModal(false);
      setForm({ name: '', total_amount: '', remaining: '', interest_rate: '', monthly_payment: '', type: 'credit', start_date: '', notes: '', create_recurring: false, category_id: '', day_of_month: '' });
      fetchDebts();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Закрыть полностью?',
      message: 'Долг будет помечен как закрытый.',
      confirmText: 'Закрыть',
      onConfirm: async () => {
        try {
          await api.delete(`/debts/${id}`);
          fetchDebts();
        } catch (err) { console.error(err); }
      }
    });
  };

  const handlePartialClose = async (debt) => {
    setPartialModal({ open: true, debt, amount: '', accountId: '' });
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data || []);
    } catch (err) { console.error(err); }
  };

  const handlePartialSubmit = async () => {
    const amount = Number(partialModal.amount);
    if (!amount || amount <= 0) return;
    if (amount > partialModal.debt.remaining) return;
    try {
      await api.patch(`/debts/${partialModal.debt.id}/close-partial`, {
        amount,
        account_id: partialModal.accountId || undefined,
      });
      setPartialModal({ open: false, debt: null, amount: '', accountId: '' });
      fetchDebts();
    } catch (err) { console.error(err); }
  };

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.remaining || 0), 0);
  const totalOriginal = debts.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
  const paidPercent = totalOriginal > 0 ? Math.round(((totalOriginal - totalDebt) / totalOriginal) * 100) : 0;
  const avgRate = debts.length > 0 
    ? (debts.reduce((sum, d) => sum + Number(d.interest_rate || 0), 0) / debts.length).toFixed(1) 
    : '0';

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <EditorialLabel>Общая задолженность</EditorialLabel>
          <h1 className="text-4xl md:text-[3.5rem] font-extrabold tracking-[-0.03em] text-on-surface leading-none">
            {formatMoney(totalDebt)} <span className="text-2xl font-medium text-outline-variant ml-1">₽</span>
          </h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowAddModal(true)} 
            className="bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Добавить долг
          </button>
        </div>
      </div>

      {/* Empty State */}
      {debts.length === 0 && (
        <div className="text-center py-20 bg-surface-container-low dark:bg-surface-container rounded-[2rem]">
          <span className="material-symbols-outlined text-7xl text-outline mb-4 block">credit_score</span>
          <h3 className="text-xl font-bold text-on-surface mb-2">Нет кредитов и долгов</h3>
          <p className="text-on-surface-variant mb-6">Добавьте ваш первый кредит для отслеживания</p>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold"
          >
            Добавить первый кредит
          </button>
        </div>
      )}

      {/* Summary Cards Bento Grid */}
      {debts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard 
            title="Ближайший платёж" 
            value="15 Сентября" 
            subtitle="Ипотека • 45 200 ₽" 
            icon="calendar_today"
          />
          <SummaryCard 
            title="Средняя ставка" 
            value={`${avgRate}%`} 
            subtitle="годовых" 
            icon="trending_up"
            variant="warning"
          />
          <ProgressCard 
            title="Прогресс погашения" 
            value={paidPercent}
            progress={paidPercent}
            subtitle="выплачено"
          />
        </div>
      )}

      {/* Debt List */}
      {debts.length > 0 && (
        <div className="space-y-4 mt-8">
          <div className="flex items-center justify-between px-4 mb-2">
            <h3 className="text-xl font-bold text-on-surface">Активные ��бязательства</h3>
            <EditorialLabel>Всего: {debts.length}</EditorialLabel>
          </div>
          <div className="space-y-4">
            {debts.map(debt => (
              <DebtCard 
                key={debt.id} 
                debt={debt} 
                onPartialClose={handlePartialClose}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Contextual Insight Footer */}
      {debts.length > 0 && totalDebt > 0 && (
        <div className="mt-12 p-8 bg-surface-container-low dark:bg-surface-container rounded-[2rem] flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-primary mb-2">
              <span className="material-symbols-outlined text-xl">auto_awesome</span>
              <EditorialLabel className="font-bold">Совет куратора</EditorialLabel>
            </div>
            <p className="text-on-surface text-lg leading-relaxed">
              Если вы внесете дополнительные <span className="font-bold text-primary">15 000 ₽</span> в счет основного долга, вы сократите срок кредита и сэкономите на процентах.
            </p>
          </div>
          <button className="whitespace-nowrap px-8 py-4 bg-surface-container-lowest dark:bg-surface-container-highest text-primary rounded-xl font-bold hover:bg-white dark:hover:bg-surface-container transition-all active:scale-95">
            Рассчитать досрочно
          </button>
        </div>
      )}

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        onConfirm={() => { confirmModal.onConfirm?.(); setConfirmModal({ ...confirmModal, open: false }); }}
        onCancel={() => setConfirmModal({ ...confirmModal, open: false })}
      />

      {/* Add Debt Modal */}
      <AddDebtModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmit}
        categories={categories}
        form={form}
        setForm={setForm}
        isLoading={saving}
      />

      {/* Partial Close Modal */}
      {partialModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-bold text-on-surface">Закрыть часть долга</h3>
            <p className="text-sm text-on-surface-variant">
              Остаток: <span className="font-medium text-primary">{formatMoney(partialModal.debt?.remaining)} ₽</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Счёт списания</label>
              <select
                value={partialModal.accountId}
                onChange={e => setPartialModal({ ...partialModal, accountId: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none"
              >
                <option value="">Выберите счёт</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)} ₽)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Сумма платежа</label>
              <input
                type="number"
                value={partialModal.amount}
                onChange={e => setPartialModal({ ...partialModal, amount: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl border-none"
                placeholder="0"
                max={partialModal.debt?.remaining}
                min="0"
              />
              {Number(partialModal.amount) > partialModal.debt?.remaining && (
                <p className="text-xs text-error mt-1">Сумма не может превышать остаток</p>
              )}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setPartialModal({ open: false, debt: null, amount: '', accountId: '' })}
                className="flex-1 py-3 bg-surface-container dark:bg-surface-container-high rounded-xl font-medium"
              >
                Отмена
              </button>
              <button 
                onClick={handlePartialSubmit}
                disabled={!partialModal.amount || Number(partialModal.amount) <= 0 || Number(partialModal.amount) > partialModal.debt?.remaining}
                className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-medium disabled:opacity-50"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}