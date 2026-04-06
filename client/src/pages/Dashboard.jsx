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

  const { family, personal, lastTransactions, activeGoals, warning } = data;
  const isFamily = !!family;

  return (
    <div className="space-y-8">
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

      {warning && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 border-l-4 ${warning.type === 'no_funds' ? 'bg-error-container border-error' : 'bg-warning-container border-warning'}`}>
          <span className="material-symbols-outlined text-warning mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <div>
            <p className={`text-sm font-semibold ${warning.type === 'no_funds' ? 'text-on-error-container' : 'text-on-warning-container'}`}>{warning.message}</p>
            <p className={`text-xs ${warning.type === 'no_funds' ? 'text-on-error-container/80' : 'text-on-warning-container/80'}`}>Свободных средств: {formatMoney(warning.available)} ₽</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isFamily && (
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card relative overflow-hidden">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary-container/20 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>family_restroom</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface font-headline">Семейные финансы</h3>
                <p className="text-xs text-on-surface-variant">Общий бюджет семьи</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-surface-container rounded-xl">
                <span className="text-sm text-on-surface-variant">Баланс семьи</span>
                <span className={`font-bold text-base ${family.balance >= 0 ? 'text-on-surface' : 'text-error'}`}>
                  {formatMoney(family.balance)} ₽
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-container rounded-xl">
                <span className="text-sm text-on-surface-variant">Доход за месяц</span>
                <span className="font-bold text-base text-secondary">+{formatMoney(family.monthIncome)} ₽</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-container rounded-xl">
                <span className="text-sm text-on-surface-variant">Расход за месяц</span>
                <span className="font-bold text-base text-error">-{formatMoney(family.monthExpenses)} ₽</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-container rounded-xl">
                <span className="text-sm text-on-surface-variant">Зарезервировано</span>
                <span className="font-bold text-base text-on-surface">{formatMoney(family.reserved)} ₽</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl">
                <span className="text-sm font-medium text-white/80">Свободные средства</span>
                <span className="font-bold text-base text-white">{formatMoney(family.available)} ₽</span>
              </div>
            </div>

            {family.memberStats && family.memberStats.length > 1 && (
              <div className="mt-5 pt-5 border-t border-surface-container">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Вклад участников за месяц</p>
                <div className="space-y-2">
                  {family.memberStats.map(m => (
                    <div key={m.userId} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-container/30 flex items-center justify-center text-xs font-bold text-primary-container">
                          {m.name.charAt(0)}
                        </div>
                        <span className="text-sm text-on-surface">{m.name}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-xs text-secondary">+{formatMoney(m.income)}</span>
                        <span className="text-xs text-error">-{formatMoney(m.expenses)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`${isFamily ? '' : 'lg:col-span-2'} bg-surface-container-lowest p-6 rounded-2xl shadow-card relative overflow-hidden`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface font-headline">Ваши финансы</h3>
              <p className="text-xs text-on-surface-variant">{isFamily ? 'Ваш личный вклад' : 'Ваш личный бюджет'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-surface-container rounded-xl">
              <span className="text-sm text-on-surface-variant">Ваш баланс</span>
              <span className={`font-bold text-base ${personal.balance >= 0 ? 'text-on-surface' : 'text-error'}`}>
                {formatMoney(personal.balance)} ₽
              </span>
            </div>
            {isFamily && (
              <>
                <div className="flex justify-between items-center p-3 bg-surface-container rounded-xl">
                  <span className="text-sm text-on-surface-variant">Ваш доход за месяц</span>
                  <span className="font-bold text-base text-secondary">+{formatMoney(personal.monthIncome)} ₽</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface-container rounded-xl">
                  <span className="text-sm text-on-surface-variant">Ваши расходы за месяц</span>
                  <span className="font-bold text-base text-error">-{formatMoney(personal.monthExpenses)} ₽</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface-container rounded-xl">
                  <span className="text-sm text-on-surface-variant">Ваши накопления</span>
                  <span className="font-bold text-base text-on-surface">{formatMoney(personal.reserved)} ₽</span>
                </div>
              </>
            )}
            <div className={`flex justify-between items-center p-3 ${isFamily ? 'bg-gradient-to-r from-secondary to-secondary/70' : 'bg-gradient-to-r from-primary to-primary-container'} text-white rounded-xl`}>
              <span className="text-sm font-medium text-white/80">Ваши свободные средства</span>
              <span className="font-bold text-base text-white">{formatMoney(personal.available)} ₽</span>
            </div>
          </div>

          {!isFamily && (
            <div className="mt-5 pt-5 border-t border-surface-container">
              <p className="text-xs text-on-surface-variant mb-3">Создайте семью, чтобы объединить финансы</p>
              <Link to="/family" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">add</span>
                Создать семью
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface-container-lowest p-8 rounded-3xl shadow-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold font-headline">Последние операции</h3>
            <Link to="/transactions" className="text-primary text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
              Все операции
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="space-y-4">
            {lastTransactions && lastTransactions.length > 0 ? lastTransactions.map(t => (
              <div key={t.id} className="flex items-center justify-between group cursor-pointer p-3 hover:bg-surface-container rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    t.is_hidden
                      ? 'bg-surface-container-high text-slate-400'
                      : t.type === 'income'
                        ? 'bg-secondary/10 text-secondary'
                        : 'bg-surface-container-high text-primary group-hover:bg-primary-container group-hover:text-white'
                  }`}>
                    <span className="material-symbols-outlined text-sm">
                      {t.is_hidden ? 'lock' : t.type === 'income' ? 'payments' : 'shopping_cart'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-on-surface text-sm">
                        {t.is_hidden ? '🔒 Сюрприз' : (t.Category?.name || t.category_name || 'Без категории')}
                      </h4>
                      {!t.is_hidden && t.User && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-surface-container rounded-full text-on-surface-variant font-medium">
                          {t.User.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant">{new Date(t.date).toLocaleDateString('ru-RU')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-sm ${t.type === 'income' ? 'text-secondary' : 'text-on-surface'}`}>
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

        <div className="lg:col-span-4 space-y-6">
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
        </div>
      </div>

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
