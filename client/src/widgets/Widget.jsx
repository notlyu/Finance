import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';

export default function Widget({ widget, data, loading, error, onNavigate }) {
  const { selectedMember, currentUser } = useOutletContext() || {};
  const def = widget.def;

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-vault">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">{def.icon}</span>
          <h3 className="text-lg font-bold">{def.name}</h3>
        </div>
        {onNavigate && (
          <Link to={onNavigate} className="text-xs font-bold text-primary flex items-center gap-1">
            Все <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </Link>
        )}
      </div>
      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-surface-container rounded w-3/4"></div>
          <div className="h-4 bg-surface-container rounded w-1/2"></div>
        </div>
      )}
      {error && (
        <div className="text-center py-4">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="text-sm text-on-error-container mt-1">{error}</p>
        </div>
      )}
      {!loading && !error && data && (
        <WidgetContent type={widget.type} data={data} />
      )}
    </div>
  );
}

function WidgetContent({ type, data }) {
  switch (type) {
    case 'summary': return <SummaryContent data={data} />;
    case 'allocation': return <AllocationContent data={data} />;
    case 'transactions': return <TransactionsContent data={data} />;
    case 'goals': return <GoalsContent data={data} />;
    case 'memberStats': return <MemberStatsContent data={data} />;
    default: return <div className="text-sm text-on-surface-variant">Виджет {type}</div>;
  }
}

function SummaryContent({ data }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-on-surface-variant">Остаток</p>
        <p className="text-2xl font-extrabold">{data.available !== undefined ? new Intl.NumberFormat('ru-RU').format(data.available) : '—'} ₽</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container rounded-xl p-3">
          <p className="text-[10px] uppercase mb-1">Доход</p>
          <p className="text-lg font-bold text-green-300">+{data.income !== undefined ? new Intl.NumberFormat('ru-RU').format(data.income) : '0'}</p>
        </div>
        <div className="bg-surface-container rounded-xl p-3">
          <p className="text-[10px] uppercase mb-1">Расход</p>
          <p className="text-lg font-bold text-pink-200">−{data.expenses !== undefined ? new Intl.NumberFormat('ru-RU').format(data.expenses) : '0'}</p>
        </div>
      </div>
    </div>
  );
}

function AllocationContent({ data }) {
  return (
    <div>
      {data.segments?.length > 0 ? (
        <>
          <div className="space-y-1">
            {data.segments.slice(0, 5).map((seg, i) => (
              <div key={i} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }}></div>
                  <span className="text-sm">{seg.label}</span>
                </div>
                <span className="text-sm font-medium">{seg.value !== undefined ? new Intl.NumberFormat('ru-RU').format(seg.value) : '0'} ₽</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-on-surface-variant text-center py-4">Нет данных</p>
      )}
    </div>
  );
}

function TransactionsContent({ data }) {
  return (
    <div className="space-y-1.5">
      {data.transactions?.length > 0 ? data.transactions.slice(0, 5).map(t => (
        <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
              <span className="material-symbols-outlined text-base">{t.type === 'income' ? 'payments' : 'shopping_cart'}</span>
            </div>
            <div>
              <p className="font-semibold text-sm truncate">{t.category_name || 'Без категории'}</p>
              <p className="text-xs text-on-surface-variant">{new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
          <span className={`font-bold text-sm ${t.type === 'income' ? 'text-secondary' : 'text-on-surface'}`}>
            {t.type === 'income' ? '+' : '−'}{new Intl.NumberFormat('ru-RU').format(t.amount)} ₽
          </span>
        </div>
      )) : (
        <p className="text-sm text-on-surface-variant text-center py-4">Нет операций</p>
      )}
    </div>
  );
}

function GoalsContent({ data }) {
  return (
    <div>
      {data.goals?.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-1">
          {data.goals.slice(0, 3).map(g => {
            const progress = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
            return (
              <div key={g.id} className="min-w-[200px] flex flex-col gap-2 p-4 bg-surface-container rounded-2xl">
                <div className="flex items-start justify-between">
                  <span className="font-bold text-sm line-clamp-1">{g.name}</span>
                  <span className="text-sm font-bold text-primary">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-surface-container-highest rounded-full">
                  <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant text-center py-4">Нет активных целей</p>
      )}
    </div>
  );
}

function MemberStatsContent({ data }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {data.memberStats?.map(m => {
        const pct = data.displayIncome > 0 ? Math.round((m.income / data.displayIncome) * 100) : 0;
        return (
          <div key={m.userId} className="min-w-[160px] p-3.5 bg-surface-container rounded-2xl">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{m.name?.charAt(0)}</div>
              <div><p className="font-semibold text-sm truncate">{m.name}</p><p className="text-xs text-on-surface-variant">{pct}% дохода</p></div>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full mb-1.5">
              <div className="h-full bg-gradient-to-r from-secondary to-secondary-container rounded-full" style={{ width: `${pct}%` }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
