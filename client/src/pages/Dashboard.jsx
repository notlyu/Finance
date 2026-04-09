import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import api from '../services/api';
import { formatMoney } from '../utils/format';

ChartJS.register(ArcElement, Tooltip, Legend);

const donutColors = ['#3525cd', '#006c49', '#95002b', '#f59e0b', '#0ea5e9', '#6b7280'];

function DonutChart({ segments, size = 240 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const data = {
    labels: segments.map(s => s.label),
    datasets: [{ data: segments.map(s => s.value), backgroundColor: segments.map(s => s.color), borderColor: '#ffffff', borderWidth: 3, hoverOffset: 8 }],
  };
  const options = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatMoney(ctx.parsed)} ₽` } } } };
  return (
    <div className="relative" style={{ height: size }}>
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-2xl font-extrabold text-on-surface leading-tight">{total > 0 ? formatMoney(total) : '—'}</p>
        <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant/50 mt-1">Всего</p>
      </div>
    </div>
  );
}

function ContextPicker({ isFamilyMode, setIsFamilyMode, hasFamily, onModeChange }) {
  if (!hasFamily) return null;
  return (
    <div className="flex bg-surface-container rounded-full p-0.5">
      <button onClick={() => onModeChange(false)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${!isFamilyMode ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
        <span className="material-symbols-outlined text-sm">account_balance_wallet</span>Личное
      </button>
      <button onClick={() => onModeChange(true)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${isFamilyMode ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
        <span className="material-symbols-outlined text-sm">groups</span>Семья
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { selectedMember, currentUser } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFamilyMode, setIsFamilyMode] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const hasSeenFamilyToast = localStorage.getItem('hasSeenFamilyToast');

  const handleModeChange = (newMode) => {
    if (newMode && !isFamilyMode && !hasSeenFamilyToast) {
      setToastVisible(true);
      localStorage.setItem('hasSeenFamilyToast', 'true');
      setTimeout(() => setToastVisible(false), 5000);
    }
    setIsFamilyMode(newMode);
  };
  const hasFamily = currentUser?.family_id;

  useEffect(() => {
    const params = {};
    if (isFamilyMode) {
      if (selectedMember?.id && selectedMember.id !== currentUser?.id) params.memberId = selectedMember.id;
    } else {
      params.memberId = currentUser?.id;
    }
    api.get('/dashboard', { params }).then(res => setData(res.data)).catch(err => console.error(err)).finally(() => setLoading(false));
  }, [selectedMember, currentUser, isFamilyMode]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div><p className="text-on-surface-variant text-sm font-medium">Загрузка...</p></div></div>;
  if (!data) return <div className="bg-error-container rounded-3xl p-6 flex items-center gap-3"><span className="material-symbols-outlined text-error">error</span><p className="text-on-error-container text-sm">Ошибка загрузки данных</p></div>;

  const { family, personal, lastTransactions, activeGoals, warning } = data;
  const isFamily = !!family;
  
  const displayData = isFamilyMode ? {
    balance: isFamily ? family.balance : personal.balance,
    available: isFamily ? family.available : personal.available,
    monthIncome: isFamily ? family.monthIncome : personal.monthIncome,
    monthExpenses: isFamily ? family.monthExpenses : personal.monthExpenses,
  } : { balance: personal.balance, available: personal.available, monthIncome: personal.monthIncome, monthExpenses: personal.monthExpenses };

  const { balance: displayBalance, available: displayAvailable, monthIncome: displayIncome, monthExpenses: displayExpenses } = displayData;
  const savingsRate = displayIncome > 0 ? Math.round(((displayIncome - displayExpenses) / displayIncome) * 100) : 0;
  const now = new Date();
  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const periodLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  const allocationSegments = (data.allocation || []).map((a, i) => ({ label: a.name, value: a.total, pct: a.pct, color: donutColors[i % donutColors.length] }));
  const displayGoals = isFamilyMode ? (activeGoals || []).filter(g => !!g.family_id).slice(0, 3) : (activeGoals || []).filter(g => !g.family_id).slice(0, 3);
  const totalFamilyBalance = isFamily ? family.balance : 0;
  const myContributionPct = totalFamilyBalance > 0 && isFamily ? Math.round((personal.balance / totalFamilyBalance) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">{isFamilyMode ? 'Семейные финансы' : 'Личные финансы'}</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">{periodLabel}</p>
          {selectedMember && selectedMember.id !== currentUser?.id && <div className="mt-1.5 inline-flex items-center px-3 py-1 bg-surface-container-high text-primary rounded-full text-xs"><span className="material-symbols-outlined text-xs mr-0.5">visibility</span>{selectedMember.name}</div>}
        </div>
        <div className="flex items-center gap-3">
          <ContextPicker isFamilyMode={isFamilyMode} setIsFamilyMode={setIsFamilyMode} hasFamily={hasFamily} onModeChange={handleModeChange} />
        </div>
      </div>

      {/* Family mode onboarding toast */}
      {toastVisible && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-tertiary-container text-on-tertiary-container px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-md">
            <span className="material-symbols-outlined text-tertiary">info</span>
            <div>
              <p className="text-sm font-medium">Семейный режим</p>
              <p className="text-xs opacity-80">Здесь видны финансы всех участников семьи. Личные операции скрыты.</p>
            </div>
            <button onClick={() => setToastVisible(false)} className="text-tertiary hover:opacity-80"><span className="material-symbols-outlined text-sm">close</span></button>
          </div>
        </div>
      )}

      {warning && <div className={`p-4 rounded-2xl flex items-start gap-3 border-l-4 ${warning.type === 'no_funds' ? 'bg-error-container border-error' : 'bg-yellow-50 border-yellow-500'}`}><span className="material-symbols-outlined text-warning text-lg">warning</span><div><p className="text-sm font-semibold">{warning.message}</p><p className="text-xs">Свободных: {formatMoney(warning.available)} ₽</p></div></div>}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-8 bg-gradient-to-br from-primary to-indigo-900 rounded-3xl p-7 relative overflow-hidden min-h-[220px]">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-xs text-white/50 uppercase tracking-[0.2em] mb-1">{isFamilyMode ? 'Общий остаток семьи' : 'Ваш остаток'}</p>
            <h3 className="text-5xl font-extrabold text-white">{formatMoney(displayAvailable)} ₽</h3>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-3 mt-4">
            <div className="glass-card rounded-xl p-4"><p className="text-[10px] text-white/50 uppercase mb-1">Доход</p><p className="text-xl font-bold text-green-300">+{formatMoney(displayIncome)}</p></div>
            <div className="glass-card rounded-xl p-4"><p className="text-[10px] text-white/50 uppercase mb-1">Расход</p><p className="text-xl font-bold text-pink-200">−{formatMoney(displayExpenses)}</p></div>
            <div className="glass-card rounded-xl p-4"><p className="text-[10px] text-white/50 uppercase mb-1">Накопления</p><p className="text-xl font-bold text-white">{savingsRate}%</p></div>
          </div>
        </div>
        <div className="md:col-span-4 bg-surface-container-lowest rounded-3xl p-6 shadow-vault flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-primary text-lg">account_balance</span></div>
              <span className="text-xs font-bold px-2 py-0.5 bg-secondary/10 text-secondary rounded-full">+{Math.round((displayAvailable / Math.max(displayBalance, 1)) * 100)}%</span>
            </div>
            <p className="text-xs text-on-surface-variant mb-1">{isFamilyMode ? 'Общий баланс' : 'Баланс'}</p>
            <h3 className="text-3xl font-extrabold text-on-surface">{formatMoney(displayBalance)} ₽</h3>
          </div>
          <div className="mt-4">
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full"><div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: `${Math.min(Math.max((displayAvailable / Math.max(displayBalance, 1)) * 100, 0), 100)}%` }}></div></div>
            <p className="text-[10px] text-on-surface-variant mt-2">{Math.round((displayAvailable / Math.max(displayBalance, 1)) * 100)}% свободно</p>
          </div>
        </div>
      </div>

      {isFamilyMode && hasFamily && totalFamilyBalance > 0 && (
        <div className="flex items-center gap-3 p-3 bg-tertiary-container/30 rounded-2xl border border-tertiary-container/50">
          <div className="w-8 h-8 rounded-full bg-tertiary/20 flex items-center justify-center"><span className="material-symbols-outlined text-tertiary text-sm">trending_up</span></div>
          <div className="flex-1"><p className="text-xs text-on-surface font-medium">Ваши личные деньги в семейном бюджете</p><p className="text-xs text-on-surface-variant">из {formatMoney(totalFamilyBalance)} ({myContributionPct}% от общих)</p></div>
          <Link to="/family" className="text-xs font-bold text-tertiary">Подробнее →</Link>
        </div>
      )}

      {!hasFamily && (
        <div className="bg-slate-900 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div><h3 className="text-lg font-bold text-white mb-1">Создайте семейный профиль</h3><p className="text-sm text-indigo-200/60">Объедините финансы с близкими.</p></div>
          <Link to="/family" className="px-6 py-2.5 bg-white text-indigo-950 rounded-xl font-bold text-sm">Начать сейчас</Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {allocationSegments.length > 0 && (
          <div className="md:col-span-4 bg-surface-container-lowest rounded-3xl p-6 shadow-card">
            <h3 className="text-lg font-bold mb-1">Распределение</h3>
            <p className="text-xs text-on-surface-variant mb-4">Куда уходят деньги</p>
            <DonutChart segments={allocationSegments} size={190} />
            <div className="mt-3 space-y-1">
              {allocationSegments.slice(0, 5).map((seg, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }}></div><span className="text-sm">{seg.label}</span></div>
                  <div className="flex items-center gap-3"><span className="text-sm font-medium">{formatMoney(seg.value)} ₽</span><span className="text-xs text-on-surface-variant w-8 text-right">{seg.pct}%</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={`${allocationSegments.length > 0 ? 'md:col-span-8' : 'md:col-span-12'} bg-surface-container-lowest rounded-3xl p-6 shadow-vault`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Последние операции</h3>
            <Link to="/transactions" className="text-xs font-bold text-primary flex items-center gap-1">Все <span className="material-symbols-outlined text-xs">arrow_forward</span></Link>
          </div>
          <div className="space-y-1.5">
            {lastTransactions?.length > 0 ? lastTransactions.map(t => (
              <div key={t.id} className="flex items-center justify-between group cursor-pointer p-3 rounded-xl hover:bg-surface-container">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.is_hidden ? 'bg-surface-container-high text-slate-400' : t.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-on-surface-variant group-hover:bg-primary group-hover:text-white'}`}>
                    <span className="material-symbols-outlined text-base">{t.is_hidden ? 'lock' : t.type === 'income' ? 'payments' : 'shopping_cart'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{t.is_hidden ? 'Личная операция' : (t.category_name || t.Category?.name || 'Без категории')}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-on-surface-variant">{new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                      {hasFamily && (
                        <>
                          <span className={`text-[10px] px-1 py-0.5 rounded ${t.family_id ? 'bg-primary/10 text-primary' : 'bg-tertiary-container text-tertiary'}`}>
                            {t.family_id ? '🏠 Семейный' : '👤 Личный'}
                          </span>
                          {t.User && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.user_id === currentUser?.id ? 'bg-surface-container text-on-surface-variant' : 'bg-tertiary-container text-tertiary'}`}>{t.User.name}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`font-bold text-sm shrink-0 ${t.type === 'income' ? 'text-secondary' : 'text-on-surface'}`}>{t.type === 'income' ? '+' : '−'}{t.is_hidden ? '••••' : formatMoney(t.amount)} ₽</span>
              </div>
            )) : <div className="text-center py-8"><span className="material-symbols-outlined text-4xl text-outline mb-2 block">receipt_long</span><p className="text-sm text-on-surface-variant">Нет операций</p></div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className={`${isFamilyMode && hasFamily && family.memberStats?.length > 1 ? 'md:col-span-7' : 'md:col-span-12'} bg-surface-container-lowest rounded-3xl p-6 shadow-vault`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Активные цели</h3>
            <Link to="/goals" className="text-xs font-bold text-primary flex items-center gap-1">Все <span className="material-symbols-outlined text-xs">arrow_forward</span></Link>
          </div>
          {displayGoals.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-1">
              {displayGoals.map(g => {
                const progress = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
                const achieved = Number(g.current_amount) >= Number(g.target_amount);
                return (
                  <div key={g.id} className="min-w-[200px] flex flex-col gap-2 p-4 bg-surface-container rounded-2xl">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">{achieved && <span className="material-symbols-outlined text-secondary text-base">check_circle</span>}<span className="font-bold text-sm line-clamp-1">{g.name}</span></div>
                      <span className={`text-sm font-bold ${achieved ? 'text-secondary' : 'text-primary'}`}>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-highest rounded-full"><div className={`h-full rounded-full ${achieved ? 'bg-gradient-to-r from-secondary to-secondary-container' : 'bg-gradient-to-r from-primary to-primary-container'}`} style={{ width: `${progress}%` }}></div></div>
                    <p className="text-xs text-on-surface-variant">{formatMoney(g.current_amount)} / {formatMoney(g.target_amount)} ₽</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6"><span className="material-symbols-outlined text-4xl text-outline mb-3 block">track_changes</span><p className="text-sm text-on-surface-variant mb-4">Нет активных целей</p><Link to="/goals" className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold text-sm"><span className="material-symbols-outlined text-sm">add</span>Создать цель</Link></div>
          )}
        </div>
        {isFamilyMode && hasFamily && family.memberStats && family.memberStats.length > 1 && (
          <div className="md:col-span-5 bg-surface-container-lowest rounded-3xl p-6 shadow-vault">
            <h3 className="text-lg font-bold mb-4">Вклад участников</h3>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {family.memberStats.map(m => {
                const pct = displayIncome > 0 ? Math.round((m.income / displayIncome) * 100) : 0;
                return (
                  <div key={m.userId} className="min-w-[160px] p-3.5 bg-surface-container rounded-2xl">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{m.name?.charAt(0)}</div>
                      <div><p className="font-semibold text-sm truncate">{m.name}</p><p className="text-xs text-on-surface-variant">{pct}% дохода</p></div>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-highest rounded-full mb-1.5"><div className="h-full bg-gradient-to-r from-secondary to-secondary-container rounded-full" style={{ width: `${pct}%` }}></div></div>
                    <div className="flex justify-between"><span className="text-xs text-secondary font-bold">+{formatMoney(m.income)}</span><span className="text-xs text-error font-bold">−{formatMoney(m.expenses)}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}