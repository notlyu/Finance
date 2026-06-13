import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../services/api';
import { getWidgetConfig, saveWidgetConfig } from '../services/widgetStorage';
import { WIDGET_DEFINITIONS, getVisibleWidgets } from '../widgets/widgetRegistry';
import WidgetCard from '../widgets/WidgetCard';
import { formatMoney } from '../utils/format';
import logger from '../utils/logger';
import { SkeletonChart, SkeletonCard } from '../components/ui/Skeleton';

const WIDGET_ROUTES = {
  allocation:   'analytics',
  transactions: 'transactions',
  goals:        'goals',
  memberStats:  'family',
  budgets:      'budgets',
  recurring:    'recurring',
  debts:        'debts',
  safetyPillow: 'safety-pillow',
  analytics:    'analytics',
  family:       'family',
};

// Sortable wrapper для каждого виджета
function SortableWidget({ widget, def, data, loading, space, onRemove, editMode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const navigateTo = WIDGET_ROUTES[widget.type];

  return (
    <div ref={setNodeRef} style={style} className={`col-span-1 ${colSpanClass(def?.defaultCols)}`}>
      <WidgetCard
        widget={widget}
        def={def}
        data={data}
        loading={loading}
        space={space}
        navigateTo={editMode ? null : navigateTo}
        onRemove={editMode ? onRemove : null}
        dragHandleProps={editMode ? { ...attributes, ...listeners } : null}
      />
    </div>
  );
}

function colSpanClass(cols) {
  const map = { 4: 'md:col-span-4', 5: 'md:col-span-5', 6: 'md:col-span-6', 7: 'md:col-span-7', 8: 'md:col-span-8', 12: 'md:col-span-12' };
  return map[cols] || 'md:col-span-6';
}

export default function DashboardWithWidgets({ space: routeSpace }) {
  const { currentUser, selectedMember } = useOutletContext() || {};
  const hasFamily = currentUser?.family_id;

  const [widgetConfig, setWidgetConfig] = useState([]);
  const [widgetConfigLoading, setWidgetConfigLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [budgetsData, setBudgetsData] = useState([]);
  const [recurringData, setRecurringData] = useState([]);
  const [debtsData, setDebtsData] = useState(null);
  const [safetyData, setSafetyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const activeTypes = useMemo(() => widgetConfig.map(w => w.type), [widgetConfig]);
  const space = routeSpace || (hasFamily ? 'family' : 'personal');

  // dnd-kit sensors — pointer (мышь/тачпад) + touch (мобильные)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  // Загрузка конфига виджетов
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const config = await getWidgetConfig(currentUser?.id, currentUser?.family_id);
      if (!cancelled) { setWidgetConfig(config); setWidgetConfigLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.family_id]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = { _t: Date.now() };
      if (space === 'family' && selectedMember?.id && selectedMember.id !== currentUser?.id) {
        params.memberId = selectedMember.id;
      }
      const requests = [api.get('/dashboard', { params })];
      const keys = ['dashboard'];

      if (activeTypes.includes('budgets')) { requests.push(api.get('/budgets', { params: { limit: 10 } })); keys.push('budgets'); }
      if (activeTypes.includes('recurring')) { requests.push(api.get('/recurring', { params: { limit: 20, active: 'true' } })); keys.push('recurring'); }
      if (activeTypes.includes('debts')) { requests.push(api.get('/debts', { params: { limit: 20 } })); keys.push('debts'); }
      if (activeTypes.includes('safetyPillow')) { requests.push(api.get('/safety-pillow/current')); keys.push('safetyPillow'); }

      const results = await Promise.allSettled(requests);
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') { logger.error(`${keys[i]} failed`, r.reason); return; }
        const d = r.value.data;
        if (keys[i] === 'dashboard') { setDashboardData(d); }
        else if (keys[i] === 'budgets') { setBudgetsData(Array.isArray(d) ? d : (d?.items || [])); }
        else if (keys[i] === 'recurring') { setRecurringData(Array.isArray(d) ? d : (d?.items || [])); }
        else if (keys[i] === 'debts') {
          if (d?.items) {
            const items = d.items;
            const total = items.reduce((s, x) => s + Number(x.remaining || 0), 0);
            const monthly = items.reduce((s, x) => s + Number(x.monthly_payment || 0), 0);
            const nearest = items.filter(x => x.monthly_payment)
              .map(x => {
                const today = new Date();
                const day = Number(x.day_of_month) || new Date(x.start_date).getDate();
                let next = new Date(today.getFullYear(), today.getMonth(), day);
                if (next <= today) next = new Date(today.getFullYear(), today.getMonth() + 1, day);
                return { ...x, nextDate: next };
              }).sort((a, b) => a.nextDate - b.nextDate)[0];
            setDebtsData({ items, total, count: items.length, monthlyPayment: monthly, nearest });
          } else { setDebtsData(d); }
        }
        else if (keys[i] === 'safetyPillow') { setSafetyData(d); }
      });
    } catch (err) { logger.error(err); }
    finally { setLoading(false); }
  }, [selectedMember, currentUser, space, activeTypes]);

  const location = useLocation();
  useEffect(() => { fetchDashboard(); }, [fetchDashboard, location.pathname]);
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') fetchDashboard(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [fetchDashboard]);

  const visibleWidgets = useMemo(() => getVisibleWidgets(widgetConfig, hasFamily), [widgetConfig, hasFamily]);
  const availableWidgets = useMemo(() =>
    Object.values(WIDGET_DEFINITIONS).filter(def => !activeTypes.includes(def.id) && (!def.familyOnly || hasFamily)),
    [hasFamily, activeTypes]
  );

  const widgetData = useMemo(() => ({
    ...dashboardData,
    budgets: budgetsData,
    recurring: recurringData,
    debts: debtsData,
    safetyPillow: safetyData,
  }), [dashboardData, budgetsData, recurringData, debtsData, safetyData]);

  const saveConfig = useCallback((cfg) => {
    setWidgetConfig(cfg);
    saveWidgetConfig(currentUser?.id, currentUser?.family_id, cfg);
  }, [currentUser]);

  const handleRemove = useCallback((id) => {
    saveConfig(widgetConfig.filter(w => w.id !== id).map((w, i) => ({ ...w, order: i })));
  }, [widgetConfig, saveConfig]);

  const handleAdd = useCallback((type) => {
    if (widgetConfig.some(w => w.type === type)) return;
    const def = WIDGET_DEFINITIONS[type];
    const newItem = { id: `${type}_${Date.now()}`, type, order: def?.defaultOrder ?? 999 };
    const merged = [...widgetConfig, newItem]
      .sort((a, b) => (WIDGET_DEFINITIONS[a.type]?.defaultOrder ?? a.order ?? 999) - (WIDGET_DEFINITIONS[b.type]?.defaultOrder ?? b.order ?? 999))
      .map((w, i) => ({ ...w, order: i }));
    saveConfig(merged);
  }, [widgetConfig, saveConfig]);

  // DnD handlers
  const handleDragStart = useCallback(({ active }) => setActiveId(active.id), []);
  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = visibleWidgets.findIndex(w => w.id === active.id);
    const newIndex = visibleWidgets.findIndex(w => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(visibleWidgets, oldIndex, newIndex).map((w, i) => ({ ...w, order: i }));
    // Обновляем только order, не трогаем виджеты вне сетки
    const updated = widgetConfig.map(w => {
      const found = reordered.find(r => r.id === w.id);
      return found ? { ...w, order: found.order } : w;
    });
    saveConfig(updated);
  }, [visibleWidgets, widgetConfig, saveConfig]);

  const activeWidget = activeId ? visibleWidgets.find(w => w.id === activeId) : null;

  // Hero data
  const personal = dashboardData?.personal || {};
  const family = dashboardData?.family;
  const displayData = space === 'family' ? family : personal;
  const monthIncome = displayData?.monthIncome || 0;
  const monthExpenses = displayData?.monthExpenses || 0;
  const available = displayData?.available || 0;
  const balance = displayData?.balance || 0;
  const savingsRate = monthIncome > 0 ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100) : 0;
  const now = new Date();
  const monthNames = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

  if (loading || widgetConfigLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-4xl space-y-4"><SkeletonChart /><SkeletonCard /></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">
            {space === 'family' ? 'Семейные финансы' : 'Личные финансы'}
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">{monthNames[now.getMonth()]} {now.getFullYear()}</p>
        </div>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-8 bg-gradient-to-br from-primary to-indigo-900 rounded-3xl p-7 relative overflow-hidden min-h-[220px]">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs text-white/50 uppercase tracking-[0.2em] mb-1">
              {space === 'family' ? 'Общий остаток семьи' : 'Ваш остаток'}
            </p>
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
            </div>
            <p className="text-xs text-on-surface-variant mb-1">{space === 'family' ? 'Общий баланс' : 'Баланс'}</p>
            <h3 className="text-3xl font-extrabold text-on-surface">{formatMoney(balance)} ₽</h3>
          </div>
          <div className="mt-4">
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full">
              <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full"
                style={{ width: `${Math.min(Math.max((available / Math.max(balance, 1)) * 100, 0), 100)}%` }} />
            </div>
            <p className="text-[10px] text-on-surface-variant mt-2">
              {Math.round((available / Math.max(balance, 1)) * 100)}% свободно
            </p>
          </div>
        </div>
      </div>

      {/* Шапка виджетов */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Виджеты</h3>
        <button
          onClick={() => setEditMode(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            editMode ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">{editMode ? 'check' : 'tune'}</span>
          {editMode ? 'Готово' : 'Настроить'}
        </button>
      </div>

      {/* Подсказка в режиме редактирования */}
      {editMode && (
        <p className="text-xs text-on-surface-variant -mt-2">
          Перетащите виджеты чтобы расставить. Нажмите × чтобы убрать.
        </p>
      )}

      {/* Сетка виджетов с drag-and-drop */}
      {visibleWidgets.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={visibleWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {visibleWidgets.map(widget => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  def={WIDGET_DEFINITIONS[widget.type]}
                  data={widgetData}
                  loading={loading}
                  space={space}
                  editMode={editMode}
                  onRemove={() => handleRemove(widget.id)}
                />
              ))}
            </div>
          </SortableContext>

          {/* Ghost-карточка под курсором во время drag */}
          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
            {activeWidget ? (
              <div className={`${colSpanClass(WIDGET_DEFINITIONS[activeWidget.type]?.defaultCols)} opacity-90 rotate-1 scale-105 shadow-ambient`}>
                <WidgetCard
                  widget={activeWidget}
                  def={WIDGET_DEFINITIONS[activeWidget.type]}
                  data={widgetData}
                  loading={false}
                  space={space}
                  navigateTo={null}
                  onRemove={null}
                  dragHandleProps={null}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="text-center py-12 bg-surface-container-lowest rounded-3xl">
          <span className="material-symbols-outlined text-6xl text-outline mb-4 block">widgets</span>
          <p className="text-lg font-semibold mb-2">Нет виджетов</p>
          <p className="text-sm text-on-surface-variant">Нажмите «Настроить» чтобы добавить виджеты</p>
        </div>
      )}

      {/* Панель добавления виджетов */}
      {editMode && availableWidgets.length > 0 && (
        <div className="bg-surface-container rounded-2xl p-4">
          <p className="text-xs font-semibold text-on-surface-variant mb-3 uppercase tracking-wide">Добавить виджет</p>
          <div className="flex flex-wrap gap-2">
            {availableWidgets.map(def => (
              <button
                key={def.id}
                onClick={() => handleAdd(def.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed border-outline-variant/40 text-xs font-semibold text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined text-sm">{def.icon}</span>
                {def.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
