import { Link } from 'react-router-dom';

export default function WidgetCard({ widget, def, data, loading, space, onRemove, navigateTo }) {
  const basePath = space === 'family' ? '/family' : '/personal';

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card relative group">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error opacity-0 group-hover:opacity-100 transition-all"
        title="Удалить виджет"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary">{def?.icon}</span>
        <h3 className="text-sm font-bold">{def?.name}</h3>
      </div>

      {loading && (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-surface-container rounded w-3/4"></div>
          <div className="h-4 bg-surface-container rounded w-1/2"></div>
        </div>
      )}

      {!loading && (
        <WidgetContent type={widget.type} def={def} data={data} />
      )}

      {navigateTo && (
        <Link
          to={`${basePath}/${navigateTo}`}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
        >
          Подробнее <span className="material-symbols-outlined text-xs">arrow_forward</span>
        </Link>
      )}
    </div>
  );
}

function WidgetContent({ type, def, data }) {
  switch (type) {
    case 'allocation':
      return <AllocationContent data={data} />;
    case 'transactions':
      return <TransactionsContent data={data} />;
    case 'goals':
      return <GoalsContent data={data} />;
    case 'safetyPillow':
      return <SafetyPillowContent data={data} />;
    case 'budgets':
      return <BudgetsContent data={data} />;
    case 'recurring':
      return <RecurringContent data={data} />;
    case 'debts':
      return <DebtsContent data={data} />;
    case 'family':
      return <FamilyContent data={data} />;
    case 'memberStats':
      return <MemberStatsContent data={data} />;
    case 'analytics':
      return <AnalyticsContent data={data} />;
    default:
      return <p className="text-xs text-on-surface-variant">Виджет {def?.name}</p>;
  }
}

function AllocationContent({ data }) {
  const segments = data?.allocation || [];
  return (
    <div className="space-y-1">
      {segments.length > 0 ? (
        segments.slice(0, 4).map((seg, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color || '#888' }}></div>
              <span className="text-xs truncate">{seg.name}</span>
            </div>
            <span className="text-xs font-medium">{seg.pct || 0}%</span>
          </div>
        ))
      ) : (
        <p className="text-xs text-on-surface-variant text-center py-2">Нет данных</p>
      )}
    </div>
  );
}

function TransactionsContent({ data }) {
  const transactions = data?.lastTransactions || [];
  return (
    <div className="space-y-1">
      {transactions.length > 0 ? (
        transactions.slice(0, 3).map(t => (
          <div key={t.id} className="flex items-center justify-between py-1">
            <span className="text-xs truncate flex-1">{t.category_name || 'Без категории'}</span>
            <span className={`text-xs font-bold ${t.type === 'income' ? 'text-secondary' : ''}`}>
              {t.type === 'income' ? '+' : '−'}{new Intl.NumberFormat('ru-RU').format(t.amount)}
            </span>
          </div>
        ))
      ) : (
        <p className="text-xs text-on-surface-variant text-center py-2">Нет операций</p>
      )}
    </div>
  );
}

function GoalsContent({ data }) {
  const goals = data?.activeGoals || [];
  return (
    <div className="space-y-2">
      {goals.length > 0 ? (
        goals.slice(0, 2).map(g => {
          const progress = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
          return (
            <div key={g.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{g.name}</span>
                <span className="text-xs font-bold text-primary">{progress}%</span>
              </div>
              <div className="h-1.5 bg-surface-container rounded-full">
                <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-xs text-on-surface-variant text-center py-2">Нет целей</p>
      )}
    </div>
  );
}

function SafetyPillowContent({ data }) {
  const months = data?.safetyPillow?.months || 0;
  const target = data?.safetyPillow?.target || 3;
  const progress = Math.min(100, Math.round((months / target) * 100));
  return (
    <div className="space-y-2">
      <div className="text-center">
        <p className="text-2xl font-extrabold text-primary">{months.toFixed(1)}</p>
        <p className="text-[10px] text-on-surface-variant uppercase">месяцев</p>
      </div>
      <div className="h-2 bg-surface-container rounded-full">
        <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: `${progress}%` }}></div>
      </div>
      <p className="text-xs text-on-surface-variant text-center">Цель: {target} мес.</p>
    </div>
  );
}

function BudgetsContent({ data }) {
  const rawBudgets = data?.budgets;
  const budgets = Array.isArray(rawBudgets) ? rawBudgets : [];
  const nearExceeded = budgets.find(b => b.percentage >= 90);
  return (
    <div className="space-y-1">
      {budgets.length > 0 ? (
        <div className="text-center">
          <p className={`text-xl font-extrabold ${nearExceeded ? 'text-error' : 'text-primary'}`}>
            {budgets.length}
          </p>
          <p className="text-[10px] text-on-surface-variant uppercase">активных бюджетов</p>
          {nearExceeded && (
            <p className="text-xs text-error mt-1">{nearExceeded.category_name} — {nearExceeded.percentage}%</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-on-surface-variant text-center py-2">Нет бюджетов</p>
      )}
    </div>
  );
}

function RecurringContent({ data }) {
  const rawRecurring = data?.recurring;
  const recurring = Array.isArray(rawRecurring) ? rawRecurring : [];
  const next = recurring[0];
  return (
    <div className="space-y-1">
      {next ? (
        <>
          <p className="text-sm font-semibold truncate">{next.category_name}</p>
          <p className="text-xs text-on-surface-variant">
            {next.amount ? new Intl.NumberFormat('ru-RU').format(next.amount) : '0'} ₽ • {next.next_date}
          </p>
        </>
      ) : (
        <p className="text-xs text-on-surface-variant text-center py-2">Нет регулярных</p>
      )}
      {recurring.length > 1 && (
        <p className="text-xs text-on-surface-variant">+ ещё {recurring.length - 1}</p>
      )}
    </div>
  );
}

function DebtsContent({ data }) {
  const debts = data?.debts;
  const totalDebt = debts?.total || debts?.totalDebt || 0;
  const count = debts?.count || 0;
  return (
    <div className="space-y-2">
      <div className="text-center">
        <p className="text-2xl font-extrabold text-error">{totalDebt ? new Intl.NumberFormat('ru-RU').format(totalDebt) : '0'}</p>
        <p className="text-[10px] text-on-surface-variant uppercase">общий долг</p>
      </div>
      <p className="text-xs text-on-surface-variant text-center">{count} кредитов</p>
    </div>
  );
}

function FamilyContent({ data }) {
  const family = data?.family || {};
  const members = family.memberStats || [];
  return (
    <div className="space-y-2">
      <div className="text-center">
        <p className="text-2xl font-extrabold text-primary">{members.length}</p>
        <p className="text-[10px] text-on-surface-variant uppercase">участников</p>
      </div>
      {members.length > 0 && (
        <div className="flex justify-center gap-1">
          {members.slice(0, 4).map((m, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              {m.name?.charAt(0)}
            </div>
          ))}
          {members.length > 4 && (
            <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant text-xs">
              +{members.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MemberStatsContent({ data }) {
  const stats = data?.family?.memberStats || [];
  return (
    <div className="space-y-1">
      {stats.length > 0 ? (
        stats.slice(0, 3).map((m, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              {m.name?.charAt(0)}
            </div>
            <span className="text-xs flex-1 truncate">{m.name}</span>
            <span className="text-xs font-medium text-secondary">{m.income > 0 ? `+${new Intl.NumberFormat('ru-RU').format(m.income)}` : '0'}</span>
          </div>
        ))
      ) : (
        <p className="text-xs text-on-surface-variant text-center py-2">Нет данных</p>
      )}
    </div>
  );
}

function AnalyticsContent({ data }) {
  const income = data?.personal?.monthIncome || 0;
  const expenses = data?.personal?.monthExpenses || 0;
  const savings = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 py-2 bg-surface-container rounded-lg text-center">
          <p className="text-lg font-bold text-secondary">+{income ? new Intl.NumberFormat('ru-RU').format(income) : '0'}</p>
          <p className="text-[10px] text-on-surface-variant uppercase">доход</p>
        </div>
        <div className="flex-1 py-2 bg-surface-container rounded-lg text-center">
          <p className="text-lg font-bold text-error">−{expenses ? new Intl.NumberFormat('ru-RU').format(expenses) : '0'}</p>
          <p className="text-[10px] text-on-surface-variant uppercase">расход</p>
        </div>
      </div>
      <p className="text-xs text-on-surface-variant text-center">Накопления: {savings}%</p>
    </div>
  );
}