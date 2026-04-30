import { useState, useEffect, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import api from '../services/api';
import { getWidgetConfig, saveWidgetConfig } from '../services/widgetStorage';
import { WIDGET_DEFINITIONS, getVisibleWidgets } from '../widgets/widgetRegistry';
import WidgetCard from '../widgets/WidgetCard';
import { formatMoney } from '../utils/format';

const WIDGET_ROUTES = {
  allocation: { path: 'analytics', label: 'Аналитика' },
  transactions: { path: 'transactions', label: 'Операции' },
  goals: { path: 'goals', label: 'Цели' },
  memberStats: { path: 'family', label: 'Семья' },
  budgets: { path: 'budgets', label: 'Бюджеты' },
  recurring: { path: 'recurring', label: 'Регулярные' },
  debts: { path: 'debts', label: 'Кредиты' },
  safetyPillow: { path: 'safety-pillow', label: 'Подушка' },
  analytics: { path: 'analytics', label: 'Аналитика' },
  family: { path: 'family', label: 'Семья' },
};

function AddWidgetButton({ availableWidgets, onAdd }) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <div className="relative">
        <button onClick={() => setIsOpen(false)} className="w-full py-4 border-2 border-dashed border-outline-variant/50 rounded-2xl text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-all">
          Нажмите чтобы закрыть
        </button>
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest rounded-2xl shadow-ambient z-10 max-h-60 overflow-y-auto">
          {availableWidgets.map(def => (
            <button
              key={def.id}
              onClick={() => { onAdd(def.id); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-primary">{def.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{def.name}</p>
                <p className="text-xs text-on-surface-variant">{def.description}</p>
              </div>
              <span className="material-symbols-outlined text-sm text-primary">add</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setIsOpen(true)} className="w-full py-4 border-2 border-dashed border-outline-variant/50 rounded-2xl text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2">
      <span className="material-symbols-outlined">add</span>
      Добавить виджет
    </button>
  );
}

export default function DashboardWithWidgets({ space: routeSpace }) {
  const { currentUser, selectedMember } = useOutletContext() || {};
  const hasFamily = currentUser?.family_id;
  const [widgetConfig, setWidgetConfig] = useState(() => getWidgetConfig(currentUser?.id, currentUser?.family_id));
  const [dashboardData, setDashboardData] = useState(null);
  const [budgetsData, setBudgetsData] = useState([]);
  const [recurringData, setRecurringData] = useState([]);
  const [debtsData, setDebtsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const activeTypes = useMemo(() => widgetConfig.map(w => w.type), [widgetConfig]);
  const visibleWidgets = useMemo(() => getVisibleWidgets(widgetConfig, hasFamily), [widgetConfig, hasFamily]);
  const availableWidgets = useMemo(() => {
    return Object.values(WIDGET_DEFINITIONS).filter(def => {
      const isActive = activeTypes.includes(def.id);
      const isFamilyOnly = def.familyOnly === true;
      return !isActive && (!isFamilyOnly || hasFamily);
    });
  }, [hasFamily, activeTypes]);

  const space = routeSpace || (hasFamily ? 'family' : 'personal');

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (space === 'family' && selectedMember?.id && selectedMember.id !== currentUser?.id) {
          params.memberId = selectedMember.id;
        }
        
        const requests = [api.get('/dashboard', { params })];
        const requestKeys = ['dashboard'];
        
        if (activeTypes.includes('budgets')) {
          requests.push(api.get('/budgets', { params: { limit: 10 } }));
          requestKeys.push('budgets');
        }
        if (activeTypes.includes('recurring')) {
          requests.push(api.get(`/${space}/recurring`));
          requestKeys.push('recurring');
        }
        if (activeTypes.includes('debts')) {
          requests.push(api.get('/debts'));
          requestKeys.push('debts');
        }
        
        const results = await Promise.allSettled(requests);
        
        if (!isMounted) return;
        
        // Process results by key
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const key = requestKeys[index];
            if (key === 'dashboard') {
              setDashboardData(result.value.data);
            } else if (key === 'budgets') {
              setBudgetsData(result.value.data || []);
            } else if (key === 'recurring') {
              setRecurringData(result.value.data || []);
            } else if (key === 'debts') {
              setDebtsData(result.value.data || null);
            }
          } else {
            console.error(`Request ${requestKeys[index]} failed:`, result.reason);
          }
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData();
    
    return () => { isMounted = false; };
  }, [selectedMember, currentUser, space, activeTypes.join(',')]);

  const widgetData = useMemo(() => ({
    ...dashboardData,
    budgets: budgetsData,
    recurring: recurringData,
    debts: debtsData,
  }), [dashboardData, budgetsData, recurringData, debtsData]);

  const handleRemoveWidget = (id) => {
    const newConfig = widgetConfig.filter(w => w.id !== id).map((w, i) => ({ ...w, order: i }));
    setWidgetConfig(newConfig);
    saveWidgetConfig(currentUser?.id, currentUser?.family_id, newConfig);
  };

  const handleAddWidget = (type) => {
    if (widgetConfig.some(w => w.type === type)) return;
    const newConfig = [...widgetConfig, { id: `${type}_${Date.now()}`, type, order: widgetConfig.length }];
    setWidgetConfig(newConfig);
    saveWidgetConfig(currentUser?.id, currentUser?.family_id, newConfig);
  };

  const personal = dashboardData?.personal || {};
  const family = dashboardData?.family;
  const displayData = space === 'family' ? family : personal;
  const monthIncome = displayData?.monthIncome || 0;
  const monthExpenses = displayData?.monthExpenses || 0;
  const available = displayData?.available || 0;
  const balance = displayData?.balance || 0;
  const savingsRate = monthIncome > 0 ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100) : 0;
  const now = new Date();
  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const periodLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">{space === 'family' ? 'Семейные финансы' : 'Личные финансы'}</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">{periodLabel}</p>
        </div>
      </div>

      {/* Hero - Сводка */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-8 bg-gradient-to-br from-primary to-indigo-900 rounded-3xl p-7 relative overflow-hidden min-h-[220px]">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-xs text-white/50 uppercase tracking-[0.2em] mb-1">{space === 'family' ? 'Общий остаток семьи' : 'Ваш остаток'}</p>
            <h3 className="text-5xl font-extrabold text-white">{formatMoney(available)} ₽</h3>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-3 mt-4">
            <div className="glass-card rounded-xl p-4">
              <p className="text-[10px] text-white/50 uppercase mb-1">Доход</p>
              <p className="text-xl font-bold text-green-300">+{formatMoney(monthIncome)}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-[10px] text-white/50 uppercase mb-1">Расход</p>
              <p className="text-xl font-bold text-pink-200">−{formatMoney(monthExpenses)}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-[10px] text-white/50 uppercase mb-1">Накопления</p>
              <p className="text-xl font-bold text-white">{savingsRate}%</p>
            </div>
          </div>
        </div>
        <div className="md:col-span-4 bg-surface-container-lowest rounded-3xl p-6 shadow-vault flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-lg">account_balance</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-secondary/10 text-secondary rounded-full">+{Math.round((available / Math.max(balance, 1)) * 100)}%</span>
            </div>
            <p className="text-xs text-on-surface-variant mb-1">{space === 'family' ? 'Общий баланс' : 'Баланс'}</p>
            <h3 className="text-3xl font-extrabold text-on-surface">{formatMoney(balance)} ₽</h3>
          </div>
          <div className="mt-4">
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full">
              <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: `${Math.min(Math.max((available / Math.max(balance, 1)) * 100, 0), 100)}%` }}></div>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-2">{Math.round((available / Math.max(balance, 1)) * 100)}% свободно</p>
          </div>
        </div>
      </div>

      {/* Widgets */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-on-surface">Виджеты</h3>
        <Link to={`/${space}/settings`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container text-on-surface-variant hover:text-on-surface transition-all">
          <span className="material-symbols-outlined text-sm">settings</span>
        </Link>
      </div>

      {visibleWidgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleWidgets.map(widget => {
            const def = WIDGET_DEFINITIONS[widget.type];
            const route = WIDGET_ROUTES[widget.type];
            return (
              <WidgetCard
                key={widget.id}
                widget={widget}
                def={def}
                data={widgetData}
                loading={loading}
                space={space}
                onRemove={() => handleRemoveWidget(widget.id)}
                navigateTo={route?.path}
              />
            );
          })}
          <AddWidgetButton availableWidgets={availableWidgets} onAdd={handleAddWidget} />
        </div>
      ) : (
        <div className="text-center py-12 bg-surface-container-lowest rounded-3xl">
          <span className="material-symbols-outlined text-6xl text-outline mb-4 block">widgets</span>
          <p className="text-lg font-semibold mb-2">Нет виджетов</p>
          <p className="text-sm text-on-surface-variant mb-4">Добавьте виджеты для отображения информации</p>
          <AddWidgetButton availableWidgets={availableWidgets} onAdd={handleAddWidget} />
        </div>
      )}

      {availableWidgets.length === 0 && visibleWidgets.length > 0 && (
        <p className="text-center text-xs text-on-surface-variant">Все доступные виджеты добавлены</p>
      )}
    </div>
  );
}
