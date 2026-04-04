import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import api from '../services/api';
import { formatMoney } from '../utils/format';

export default function Dashboard() {
  const { selectedMember } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = selectedMember?.id ? { memberId: selectedMember.id } : {};
    api.get('/dashboard', { params })
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedMember]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="bg-error-container rounded-3xl p-6 flex items-center gap-3">
      <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
      <p className="text-on-error-container text-sm">Ошибка загрузки данных</p>
    </div>
  );

  const { month, totalBalance, reservedTotal, availableFunds, lastTransactions, activeGoals } = data;

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-2 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Главная</h2>
          {selectedMember && (
            <div className="mt-2 inline-flex items-center px-3 py-1 bg-surface-container-high text-primary rounded-full text-xs font-semibold">
              <span className="material-symbols-outlined text-sm mr-1">visibility</span>
              Просмотр: {selectedMember.name}
            </div>
          )}
        </div>
        <div className="hidden md:block">
          <Link
            to="/transactions"
            className="btn-primary px-6 py-2.5 flex items-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Добавить операцию
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {/* Decorative blur */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-secondary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        {/* Income */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-110"></div>
          <p className="text-on-surface-variant text-sm font-medium mb-1">Доходы за месяц</p>
          <h3 className="text-2xl font-bold text-secondary font-headline">+{formatMoney(month.income)} ₽</h3>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-secondary uppercase tracking-wider">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            За текущий месяц
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-error/5 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-110"></div>
          <p className="text-on-surface-variant text-sm font-medium mb-1">Расходы за месяц</p>
          <h3 className="text-2xl font-bold text-error font-headline">-{formatMoney(month.expenses)} ₽</h3>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-error uppercase tracking-wider">
            <span className="material-symbols-outlined text-xs">trending_down</span>
            За текущий месяц
          </div>
        </div>

        {/* Available */}
        <div className="bg-gradient-to-br from-primary to-primary-container text-white p-6 rounded-2xl shadow-button relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-on-primary/10 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-110"></div>
          <p className="text-white/70 text-sm font-medium mb-1">Свободные средства</p>
          <h3 className="text-2xl font-bold font-headline">{formatMoney(availableFunds)} ₽</h3>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-white/80 uppercase tracking-wider">
            <span className="material-symbols-outlined text-xs">account_balance_wallet</span>
            Доступно к тратам
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="bg-surface-container p-6 rounded-3xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Общий баланс</p>
            <h4 className={`text-2xl font-bold font-headline ${totalBalance >= 0 ? 'text-on-surface' : 'text-error'}`}>
              {formatMoney(totalBalance)} ₽
            </h4>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Зарезервировано</p>
            <h4 className="text-2xl font-bold font-headline text-on-surface">{formatMoney(reservedTotal)} ₽</h4>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Разница за месяц</p>
            <h4 className={`text-2xl font-bold font-headline ${month.diff >= 0 ? 'text-secondary' : 'text-error'}`}>
              {month.diff >= 0 ? '+' : ''}{formatMoney(month.diff)} ₽
            </h4>
          </div>
        </div>
      </div>

      {/* Bento Grid: Transactions + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-8 rounded-3xl shadow-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold font-headline">Последние операции</h3>
            <Link to="/transactions" className="text-primary text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
              Все операции
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="space-y-6">
            {lastTransactions && lastTransactions.length > 0 ? lastTransactions.map(t => (
              <div key={t.id} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    t.is_hidden
                      ? 'bg-surface-container-high text-slate-400'
                      : t.type === 'income'
                        ? 'bg-secondary/10 text-secondary'
                        : 'bg-surface-container-high text-primary group-hover:bg-primary-container group-hover:text-white'
                  }`}>
                    <span className="material-symbols-outlined">
                      {t.is_hidden ? 'lock' : t.type === 'income' ? 'payments' : 'shopping_cart'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface text-sm">
                      {t.is_hidden ? '🔒 Сюрприз' : (t.Category?.name || t.category_name || 'Без категории')}
                    </h4>
                    <p className="text-xs text-on-surface-variant">{new Date(t.date).toLocaleDateString('ru-RU')} • {t.User?.name || ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${t.type === 'income' ? 'text-secondary' : 'text-on-surface'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.is_hidden ? '••••' : formatMoney(t.amount)} ₽
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">receipt_long</span>
                <p className="text-on-surface-variant text-sm">Нет операций</p>
              </div>
            )}
          </div>
        </div>

        {/* Goals + Empty State */}
        <div className="lg:col-span-4 space-y-6">
          {/* Goals */}
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold font-headline">Цели</h3>
              <Link to="/goals" className="text-primary text-sm font-bold flex items-center gap-1">
                Все цели
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            <div className="space-y-6">
              {activeGoals && activeGoals.length > 0 ? activeGoals.map(g => {
                const progress = g.progress || ((Number(g.current_amount) / Number(g.target_amount)) * 100);
                const achieved = g.achieved || (Number(g.current_amount) >= Number(g.target_amount));
                return (
                  <div key={g.id}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-on-surface flex items-center gap-1">
                        {achieved && <span className="text-secondary text-sm">✓</span>}
                        {g.name}
                      </span>
                      <span className={`text-xs font-bold ${achieved ? 'text-secondary' : 'text-primary'}`}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${achieved ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                    <p className="mt-2 text-[10px] font-bold text-on-surface-variant uppercase">
                      {formatMoney(g.current_amount)} / {formatMoney(g.target_amount)} ₽
                    </p>
                  </div>
                );
              }) : (
                <div className="text-center py-4">
                  <span className="material-symbols-outlined text-3xl text-outline mb-2">track_changes</span>
                  <p className="text-on-surface-variant text-xs">Нет активных целей</p>
                </div>
              )}
            </div>
          </div>

          {/* Empty State / CTA */}
          <div className="bg-surface-container-lowest p-8 rounded-3xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mb-4 text-outline">
              <span className="material-symbols-outlined text-3xl">event_busy</span>
            </div>
            <h4 className="text-sm font-bold text-on-surface mb-1">Нет ближайших списаний</h4>
            <p className="text-xs text-on-surface-variant max-w-[200px]">Все счета оплачены. Наслаждайтесь финансовым спокойствием.</p>
          </div>
        </div>
      </div>

      {/* Mobile CTA */}
      <div className="md:hidden mt-8">
        <Link
          to="/transactions"
          className="w-full btn-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Добавить операцию
        </Link>
      </div>
    </div>
  );
}
