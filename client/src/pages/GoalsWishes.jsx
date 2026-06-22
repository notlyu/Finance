import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import GoalsSection from '../components/GoalsSection';
import WishesSection from '../components/WishesSection';
import logger from '../utils/logger';
import { SkeletonList } from '../components/ui/Skeleton';
import { localDateStr } from '../utils/date';

export default function GoalsWishes({ space = 'personal' }) {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('goals');
  const [showArchived, setShowArchived] = useState(false);

  const todayStr = useMemo(() => localDateStr(), []);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await api.get('/goals', { params: { archived: showArchived } });
      setGoals(res.data?.items || res.data || []);
    } catch (err) { logger.error('Goals fetch error:', err); }
  }, [showArchived]);

  const fetchWishes = useCallback(async () => {
    try {
      const res = await api.get('/wishes', { params: { showArchived } });
      setWishes(res.data?.items || res.data || []);
    } catch (err) { logger.error('Wishes fetch error:', err); }
  }, [showArchived]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.filter(c => c.type === 'expense'));
    } catch (err) { logger.error('Categories fetch error:', err); }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data || []);
    } catch (err) { logger.error('Accounts fetch error:', err); }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchGoals(),
      fetchWishes(),
      fetchCategories(),
      fetchAccounts(),
    ]);
    setLoading(false);
  }, [fetchGoals, fetchWishes, fetchCategories, fetchAccounts]);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => cancelled || undefined).catch(() => {});
    return () => { cancelled = true; };
  }, [fetchData]);

  const activeGoals = useMemo(() => goals.filter(g => !g.archived && !g.achieved), [goals]);
  const activeWishes = useMemo(() => wishes.filter(w => !w.archived && w.status !== 'completed'), [wishes]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <SkeletonList items={3} className="w-full max-w-2xl" />
    </div>
  );

  return (
    <div className="space-y-8">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Назад
          </button>
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">Цели и Желания</h2>
        </div>
        <div className="flex gap-2">
          {(goals.filter(g => g.archived || g.achieved).length > 0 || wishes.filter(w => w.archived || w.status === 'completed').length > 0) && (
            <button onClick={() => setShowArchived(!showArchived)} className="btn-ghost px-4 py-3 text-sm">
              {showArchived ? 'Скрыть архив' : 'Архив'}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-5 py-2.5 rounded-3xl text-sm font-bold transition-colors ${activeTab === 'goals' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          Цели ({activeGoals.length})
        </button>
        <button
          onClick={() => setActiveTab('wishes')}
          className={`px-5 py-2.5 rounded-3xl text-sm font-bold transition-colors ${activeTab === 'wishes' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          Желания ({activeWishes.length})
        </button>
      </div>

      {activeTab === 'goals' && (
        <GoalsSection
          goals={goals}
          showArchived={showArchived}
          categories={categories}
          accounts={accounts}
          todayStr={todayStr}
          onRefresh={() => { fetchGoals(); fetchAccounts(); }}
        />
      )}

      {activeTab === 'wishes' && (
        <WishesSection
          wishes={wishes}
          showArchived={showArchived}
          categories={categories}
          accounts={accounts}
          todayStr={todayStr}
          onRefresh={() => { fetchWishes(); fetchAccounts(); }}
        />
      )}
    </div>
  );
}
