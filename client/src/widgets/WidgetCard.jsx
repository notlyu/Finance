import { Link } from 'react-router-dom';
import { formatMoney } from '../utils/format';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9','#8b5cf6','#ec4899'];

export default function WidgetCard({ widget, def, data, loading, space, onRemove, navigateTo, dragHandleProps }) {
  const basePath = space === 'family' ? '/family' : '/personal';

  return (
    <div className="w-full h-full bg-surface-container-lowest rounded-3xl shadow-card border border-outline-variant/60 relative flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        {/* Drag handle — только в editMode */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-on-surface-variant/40 hover:text-on-surface-variant transition-colors -ml-1 mr-0.5"
            aria-label="Перетащить виджет"
          >
            <span className="material-symbols-outlined text-xl">drag_indicator</span>
          </div>
        )}
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
            {def?.icon}
          </span>
        </div>
        <h3 className="text-sm font-bold text-on-surface flex-1 truncate">{def?.name}</h3>

        {/* Кнопка × — только в editMode */}
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label={`Удалить ${def?.name}`}
            className="shrink-0 w-7 h-7 rounded-full bg-error/10 flex items-center justify-center text-error hover:bg-error/20 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}

        {/* Ссылка «Все» — только вне editMode */}
        {navigateTo && !onRemove && (
          <Link
            to={`${basePath}/${navigateTo}`}
            className="shrink-0 text-xs font-semibold text-primary flex items-center gap-0.5 hover:opacity-70 transition-opacity"
          >
            Все <span className="material-symbols-outlined text-xs">chevron_right</span>
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pb-5 flex-1">
        {loading ? (
          <div className="animate-pulse space-y-2.5">
            <div className="h-5 bg-surface-container rounded-xl w-3/4" />
            <div className="h-5 bg-surface-container rounded-xl w-1/2" />
            <div className="h-5 bg-surface-container rounded-xl w-2/3" />
          </div>
        ) : (
          <WidgetContent type={widget.type} data={data} space={space} />
        )}
      </div>
    </div>
  );
}

function WidgetContent({ type, data, space }) {
  switch (type) {
    case 'allocation':   return <AllocationContent data={data} />;
    case 'transactions': return <TransactionsContent data={data} />;
    case 'goals':        return <GoalsContent data={data} />;
    case 'safetyPillow': return <SafetyPillowContent data={data} />;
    case 'budgets':      return <BudgetsContent data={data} />;
    case 'recurring':    return <RecurringContent data={data} />;
    case 'debts':        return <DebtsContent data={data} />;
    case 'family':       return <FamilyContent data={data} />;
    case 'memberStats':  return <MemberStatsContent data={data} />;
    case 'analytics':    return <AnalyticsContent data={data} />;
    default: return null;
  }
}

// ── Транзакции (col-span-8) ──────────────────────────────────────────────────
function TransactionsContent({ data }) {
  const txs = data?.lastTransactions || [];
  if (!txs.length) return <Empty text="Нет операций" />;
  return (
    <div className="space-y-0.5">
      {txs.slice(0, 5).map(t => (
        <div key={t.id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-surface-container transition-colors">
          <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
            t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
              {t.type === 'income' ? 'payments' : 'shopping_bag'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">{t.category_name || 'Без категории'}</p>
            <p className="text-xs text-on-surface-variant truncate">
              {t.comment ? `${t.comment} · ` : ''}
              {new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <span className={`text-sm font-bold shrink-0 ${t.type === 'income' ? 'text-emerald-500' : 'text-on-surface'}`}>
            {t.type === 'income' ? '+' : '−'}{formatMoney(t.amount)} ₽
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Распределение с бубликом (col-span-4) ────────────────────────────────────
function AllocationContent({ data }) {
  const raw = data?.allocation || [];
  if (!raw.length) return <Empty text="Нет расходов за месяц" />;

  const total = raw.reduce((s, x) => s + Number(x.total || 0), 0);
  const segments = raw.slice(0, 6).map((seg, i) => ({
    ...seg,
    pct: total > 0 ? Math.round((Number(seg.total) / total) * 100) : (seg.pct || 0),
    color: COLORS[i],
  }));

  // SVG donut
  const R = 15.9;
  const CIRC = 2 * Math.PI * R;
  let offset = 0;
  const slices = segments.map(seg => {
    const dash = (seg.pct / 100) * CIRC;
    const gap = CIRC - dash;
    const slice = { dash, gap, offset, color: seg.color };
    offset += dash;
    return slice;
  });

  return (
    <div className="flex items-center gap-4">
      {/* Donut */}
      <div className="relative shrink-0 w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r={R} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-surface-container-high" />
          {slices.map((s, i) => (
            <circle
              key={i} cx="18" cy="18" r={R} fill="none"
              stroke={s.color} strokeWidth="3.5"
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-on-surface truncate">{seg.name}</span>
            </div>
            <span className="text-xs font-bold text-on-surface-variant shrink-0">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Цели (col-span-7) ────────────────────────────────────────────────────────
function GoalsContent({ data }) {
  const goals = data?.activeGoals || [];
  if (!goals.length) return <Empty text="Нет активных целей" />;
  return (
    <div className="space-y-4">
      {goals.slice(0, 3).map(g => {
        const cur = Number(g.current_amount || 0);
        const tgt = Number(g.target_amount || 1);
        const pct = Math.min(100, Math.round((cur / tgt) * 100));
        const remaining = Math.max(0, tgt - cur);
        return (
          <div key={g.id}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold text-on-surface truncate max-w-[55%]">{g.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant">{formatMoney(cur)} / {formatMoney(tgt)} ₽</span>
                <span className="text-xs font-extrabold text-primary">{pct}%</span>
              </div>
            </div>
            <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            {remaining > 0 && pct < 100 && (
              <p className="text-[11px] text-on-surface-variant mt-1">Осталось {formatMoney(remaining)} ₽</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Бюджеты (col-span-5) ─────────────────────────────────────────────────────
function BudgetsContent({ data }) {
  const budgets = Array.isArray(data?.budgets) ? data.budgets : [];
  if (!budgets.length) return <Empty text="Нет бюджетов" />;
  const sorted = [...budgets].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  return (
    <div className="space-y-3">
      {sorted.slice(0, 4).map((b, i) => {
        const pct = Math.min(100, Math.round(Number(b.percentage || 0)));
        const over = pct >= 100;
        const warn = pct >= 80;
        const color = over ? '#ef4444' : warn ? '#f59e0b' : '#6366f1';
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-on-surface truncate max-w-[50%]">{b.category_name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-on-surface-variant">{formatMoney(b.actual_amount || 0)} / {formatMoney(b.limit_amount || 0)} ₽</span>
                <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
              </div>
            </div>
            <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Регулярные платежи (col-span-4) ──────────────────────────────────────────
function RecurringContent({ data }) {
  const list = Array.isArray(data?.recurring) ? data.recurring : [];
  if (!list.length) return <Empty text="Нет регулярных платежей" />;

  // Вычисляем ближайшую дату из day_of_month
  const withDates = list.map(r => {
    const today = new Date();
    const day = Number(r.day_of_month) || 1;
    let next = new Date(today.getFullYear(), today.getMonth(), day);
    if (next < today) next = new Date(today.getFullYear(), today.getMonth() + 1, day);
    return { ...r, nextDate: next };
  }).sort((a, b) => a.nextDate - b.nextDate);

  return (
    <div className="space-y-2.5">
      {withDates.slice(0, 3).map((r, i) => {
        const daysLeft = Math.round((r.nextDate - new Date()) / 86400000);
        return (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>event_repeat</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate">{r.category_name || 'Платёж'}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {r.nextDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  {daysLeft === 0 ? ' · сегодня' : daysLeft <= 3 ? ` · через ${daysLeft} д.` : ''}
                </p>
              </div>
            </div>
            <span className={`text-sm font-bold shrink-0 ${r.type === 'income' ? 'text-emerald-500' : 'text-on-surface'}`}>
              {r.type === 'income' ? '+' : '−'}{formatMoney(r.amount)} ₽
            </span>
          </div>
        );
      })}
      {withDates.length > 3 && (
        <p className="text-[11px] text-on-surface-variant text-center pt-0.5">+ ещё {withDates.length - 3}</p>
      )}
    </div>
  );
}

// ── Долги (col-span-4) ────────────────────────────────────────────────────────
function DebtsContent({ data }) {
  const debts = data?.debts;
  const total = debts?.total || 0;
  const count = debts?.count || 0;
  const monthly = debts?.monthlyPayment || 0;
  const nearest = debts?.nearest;

  if (!count) return <Empty text="Нет активных кредитов" />;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wide mb-0.5">Общий остаток</p>
          <p className="text-2xl font-extrabold text-error leading-none">{formatMoney(total)} ₽</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-on-surface-variant">в месяц</p>
          <p className="text-base font-bold text-on-surface">{formatMoney(monthly)} ₽</p>
        </div>
      </div>
      {nearest && (
        <div className="bg-surface-container rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-on-surface truncate max-w-[120px]">{nearest.name}</p>
            <p className="text-[11px] text-on-surface-variant">
              {nearest.nextDate
                ? nearest.nextDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                : `${new Date(nearest.start_date).getDate()}-го числа`}
            </p>
          </div>
          <span className="text-sm font-bold text-error">{formatMoney(nearest.monthly_payment)} ₽</span>
        </div>
      )}
      <p className="text-[11px] text-on-surface-variant">{count} {count === 1 ? 'кредит' : count < 5 ? 'кредита' : 'кредитов'}</p>
    </div>
  );
}

// ── Подушка безопасности (col-span-4) ────────────────────────────────────────
function SafetyPillowContent({ data }) {
  const pillow = data?.safetyPillow;

  if (!pillow) {
    return <Empty text="Загрузка данных..." />;
  }

  const progress = Math.min(100, Number(pillow.progress || 0));
  const target = Number(pillow.target || 0);
  const monthlyAvg = Number(pillow.monthlyAverage || 0);
  const months = Number(pillow.months || 3);
  const liquidFunds = target > 0 ? Math.round((progress / 100) * target) : 0;

  // Arc SVG
  const R = 15.9;
  const CIRC = 2 * Math.PI * R;
  const filled = (progress / 100) * CIRC;

  const color = progress >= 100 ? '#10b981' : progress >= 60 ? '#f59e0b' : '#ef4444';
  const label = progress >= 100 ? 'Цель достигнута' : progress >= 60 ? 'Хорошо' : 'Недостаточно';

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0 w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r={R} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-surface-container-high" />
          <circle
            cx="18" cy="18" r={R} fill="none"
            stroke={color} strokeWidth="3.5"
            strokeDasharray={`${filled} ${CIRC - filled}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-extrabold leading-none" style={{ color }}>{Math.round(progress)}%</span>
        </div>
      </div>
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-bold text-on-surface">{label}</p>
        <p className="text-xs text-on-surface-variant">
          {formatMoney(liquidFunds)} / {formatMoney(target)} ₽
        </p>
        <p className="text-xs text-on-surface-variant">Цель: {months} мес.</p>
        {monthlyAvg > 0 && (
          <p className="text-xs text-on-surface-variant">{formatMoney(monthlyAvg)} ₽/мес. расх.</p>
        )}
      </div>
    </div>
  );
}

// ── Аналитика (col-span-12) ───────────────────────────────────────────────────
// Показывает изменения vs прошлый месяц + топ-3 категорий расходов
function AnalyticsContent({ data }) {
  const p = data?.personal || {};
  const incomeChange = p.monthIncomeChange;
  const expenseChange = p.monthExpenseChange;
  const prevIncome = p.prevMonthIncome || 0;
  const prevExpenses = p.prevMonthExpenses || 0;
  const alloc = (data?.allocation || []).slice(0, 3);
  const total = alloc.reduce((s, x) => s + Number(x.total || 0), 0);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Изменения vs прошлый месяц */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Vs прошлый месяц</p>
        <div className="flex items-center justify-between bg-surface-container rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500 text-base">arrow_upward</span>
            <div>
              <p className="text-[11px] text-on-surface-variant">Доходы</p>
              <p className="text-sm font-bold text-on-surface">{formatMoney(prevIncome)} ₽</p>
            </div>
          </div>
          {incomeChange != null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${incomeChange >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-error/10 text-error'}`}>
              {incomeChange >= 0 ? '+' : ''}{incomeChange}%
            </span>
          )}
        </div>
        <div className="flex items-center justify-between bg-surface-container rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-base">arrow_downward</span>
            <div>
              <p className="text-[11px] text-on-surface-variant">Расходы</p>
              <p className="text-sm font-bold text-on-surface">{formatMoney(prevExpenses)} ₽</p>
            </div>
          </div>
          {expenseChange != null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${expenseChange <= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-error/10 text-error'}`}>
              {expenseChange >= 0 ? '+' : ''}{expenseChange}%
            </span>
          )}
        </div>
      </div>
      {/* Топ категорий */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Топ расходов</p>
        {alloc.length > 0 ? alloc.map((seg, i) => {
          const pct = total > 0 ? Math.round((Number(seg.total) / total) * 100) : (seg.pct || 0);
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xs text-on-surface truncate max-w-[100px]">{seg.name}</span>
                </div>
                <span className="text-xs font-bold text-on-surface-variant">{pct}%</span>
              </div>
              <div className="h-1 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i] }} />
              </div>
            </div>
          );
        }) : <p className="text-xs text-on-surface-variant">Нет расходов</p>}
      </div>
    </div>
  );
}

// ── Семья (col-span-6) ────────────────────────────────────────────────────────
function FamilyContent({ data }) {
  const members = data?.family?.memberStats || [];
  if (!members.length) return <Empty text="Нет участников" />;
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m, i) => (
        <div key={i} className="flex items-center gap-2 bg-surface-container rounded-2xl px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {m.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface">{m.name}</p>
            <p className="text-[11px] text-on-surface-variant">{formatMoney(m.income)} ₽</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Участники (col-span-5) ────────────────────────────────────────────────────
function MemberStatsContent({ data }) {
  const stats = data?.family?.memberStats || [];
  const totalIncome = stats.reduce((s, m) => s + Number(m.income || 0), 0);
  if (!stats.length) return <Empty text="Нет данных" />;
  return (
    <div className="space-y-3">
      {stats.slice(0, 3).map((m, i) => {
        const pct = totalIncome > 0 ? Math.round((Number(m.income) / totalIncome) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {m.name?.charAt(0)?.toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-on-surface flex-1 truncate">{m.name}</span>
              <span className="text-xs font-bold text-emerald-500 shrink-0">+{formatMoney(m.income)} ₽</span>
              <span className="text-xs text-on-surface-variant shrink-0">{pct}%</span>
            </div>
            <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden ml-9">
              <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-xs text-on-surface-variant text-center py-3">{text}</p>;
}
