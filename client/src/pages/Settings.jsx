import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import logger from '../utils/logger';
import { SkeletonCard } from '../components/ui/Skeleton';
import Toggle from '../components/ui/Toggle';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const { register, handleSubmit, reset } = useForm();

  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
    }
  }, [user]);

  const onSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMessage(''); setProfileError('');
    if (!profileName.trim()) { setProfileError('Имя не может быть пустым'); return; }
    setProfileSaving(true);
    try {
      const res = await api.patch('/auth/me', { name: profileName.trim(), email: profileEmail.trim() });
      setUser(res.data);
      setProfileMessage('Профиль сохранён');
      setTimeout(() => setProfileMessage(''), 2500);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Ошибка сохранения');
    } finally { setProfileSaving(false); }
  };
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState('category');
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [notifSettings, setNotifSettings] = useState({
    remind_upcoming: true, notify_goal_reached: true,
    notify_budget_exceeded: true, notify_wish_completed: true,
  });
  const [notifSaved, setNotifSaved] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, title: '', message: '' });

  const [familySettings, setFamilySettings] = useState({ show_personal_in_stats: false, safety_pillow_months: 3 });
  const [familySettingsSaved, setFamilySettingsSaved] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [accountForm, setAccountForm] = useState({ name: '', type: 'bank', balance: '', currency: 'RUB', scope: 'personal', is_liquid: true });
  const [editingAccountId, setEditingAccountId] = useState(null);

  const fetchUser = async () => {
    try { const res = await api.get('/auth/me'); setUser(res.data); }
    catch (err) { logger.error(err); }
  };

  const fetchCategories = async () => {
    try { const res = await api.get('/categories'); setCategories(res.data); }
    catch (err) { logger.error(err); }
    finally { setLoading(false); }
  };

  const fetchNotifSettings = async () => {
    try {
      const res = await api.get('/notifications/settings');
      setNotifSettings({
        remind_upcoming: res.data.remind_upcoming ?? true,
        notify_goal_reached: res.data.notify_goal_reached ?? true,
        notify_budget_exceeded: res.data.notify_budget_exceeded ?? true,
        notify_wish_completed: res.data.notify_wish_completed ?? true,
      });
    } catch (err) { logger.error(err); }
  };

  const fetchFamilySettings = async () => {
    try {
      const res = await api.get('/family-settings');
      setFamilySettings({
        show_personal_in_stats: res.data.show_personal_in_stats ?? false,
        safety_pillow_months: res.data.safety_pillow_months ?? 3,
      });
    } catch (err) { logger.error(err); }
  };

  const fetchAccounts = async () => {
    try { const res = await api.get('/accounts'); setAccounts(res.data); }
    catch (err) { logger.error(err); }
  };

  useEffect(() => {
    fetchUser();
    fetchCategories();
    fetchNotifSettings();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (user?.family_id) fetchFamilySettings();
  }, [user?.family_id]);

  const onChangePassword = async (data) => {
    setPasswordMessage(''); setPasswordError('');
    if (data.oldPassword === data.newPassword) {
      setPasswordError('Новый пароль должен отличаться от старого');
      return;
    }
    try {
      await api.post('/auth/change-password', { oldPassword: data.oldPassword, newPassword: data.newPassword });
      setPasswordMessage('Пароль успешно изменён'); reset();
    } catch (err) { setPasswordError(err.response?.data?.message || 'Ошибка'); }
  };

  const onSaveCategory = async () => {
    if (!newCategoryName) return;
    try {
      const payload = { name: newCategoryName, type: newCategoryType };
      // Если иконка выбрана и это не стандартная category, добавляем icon
      if (newCategoryIcon && newCategoryIcon !== 'category') {
        payload.icon = newCategoryIcon;
      }
      if (editingCategoryId) {
        await api.patch(`/categories/${editingCategoryId}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setNewCategoryName(''); setNewCategoryIcon('category'); setEditingCategoryId(null); fetchCategories();
    } catch (err) {}
  };

  const onDeleteCategory = async (id) => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Удалить категорию?',
      message: 'Все операции с этой категорией потеряют привязку.',
      confirmText: 'Удалить',
      onConfirm: async () => {
        try {
          await api.delete(`/categories/${id}`);
        } catch (err) {
          // 404 = категория уже удалена, не считаем ошибкой
          if (err.response?.status !== 404) logger.error(err);
        } finally {
          fetchCategories();
        }
      }
    });
  };

  const onSaveAccount = async () => {
    if (!accountForm.name) return;
    try {
      const payload = { ...accountForm };
      if (payload.balance) payload.balance = Number(payload.balance);
      if (editingAccountId) {
        await api.patch(`/accounts/${editingAccountId}`, payload);
      } else {
        await api.post('/accounts', payload);
      }
      setAccountForm({ name: '', type: 'bank', balance: '', currency: 'RUB', scope: 'personal', is_liquid: true });
      setEditingAccountId(null);
      fetchAccounts();
    } catch (err) { logger.error(err); }
  };

  const onEditAccount = (account) => {
    setEditingAccountId(account.id);
    setAccountForm({
      name: account.name,
      type: account.type || 'bank',
      balance: String(account.balance || ''),
      currency: account.currency || 'RUB',
      scope: account.scope || 'personal',
      is_liquid: account.is_liquid !== false,
    });
  };

  const onDeleteAccount = async (id) => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Удалить счёт?',
      message: 'Счёт будет скрыт. Операции по нему сохранятся.',
      confirmText: 'Удалить',
      onConfirm: async () => {
        try { await api.delete(`/accounts/${id}`); fetchAccounts(); }
        catch (err) {}
      }
    });
  };

  const toggleTheme = () => {
    const d = document.documentElement.classList.toggle('dark');
    const theme = d ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    logger.info('theme saved:', theme);
    setIsDark(d);
  };

  const saveNotifSettings = async () => {
    try { await api.patch('/notifications/settings', notifSettings); setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000); }
    catch (err) { logger.error(err); }
  };

  const tabs = useMemo(() => {
    const items = [
      { key: 'profile', label: 'Профиль', icon: 'person' },
      { key: 'notifications', label: 'Уведомления', icon: 'notifications' },
      { key: 'accounts', label: 'Счета', icon: 'account_balance' },
      { key: 'categories', label: 'Категории', icon: 'category' },
      { key: 'theme', label: 'Оформление', icon: 'palette' },
    ];
    if (user?.family_id) {
      items.push({ key: 'family', label: 'Семья', icon: 'groups' });
    }
    return items;
  }, [user?.family_id]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );

  const saveFamilySettings = async () => {
    try {
      await api.patch('/family-settings', familySettings);
      setFamilySettingsSaved(true);
      setTimeout(() => setFamilySettingsSaved(false), 2000);
    } catch (err) { logger.error(err); }
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Назад
          </button>
        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Настройки</h2>
        <p className="text-on-surface-variant text-sm mt-1">Управление аккаунтом и приложением</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-button'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card border border-outline-variant/60">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <h3 className="text-xl font-bold font-headline text-on-surface">{user?.name}</h3>
                <p className="text-sm text-on-surface-variant">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={onSaveProfile} className="space-y-4 max-w-md mb-8">
              <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Основные данные</h4>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Имя</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="input-ghost"
                  placeholder="Ваше имя"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Email</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="input-ghost"
                  placeholder="example@mail.ru"
                />
              </div>
              {profileMessage && (
                <div className="text-secondary text-sm font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>{profileMessage}
                </div>
              )}
              {profileError && (
                <div className="text-error text-sm font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>{profileError}
                </div>
              )}
              <button type="submit" disabled={profileSaving} className="btn-primary px-6 py-3 text-sm disabled:opacity-60">
                {profileSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </form>

            <div className="border-t border-outline-variant/20 pt-6">
            <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Смена пароля</h4>
            <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Старый пароль</label>
                <input type="password" {...register('oldPassword', { required: true })} className="input-ghost" placeholder="Введите старый пароль" />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Новый пароль</label>
                <input type="password" {...register('newPassword', { required: true, minLength: 8, pattern: { value: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: 'Минимум 8 символов, цифра и буква' } })} className="input-ghost" placeholder="Минимум 8 символов, цифра и буква" />
              </div>
              {passwordMessage && <div className="text-secondary text-sm font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span>{passwordMessage}</div>}
              {passwordError && <div className="text-error text-sm font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{passwordError}</div>}
              <button type="submit" className="btn-primary px-6 py-3 text-sm">Изменить пароль</button>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card border border-outline-variant/60">
          <h3 className="text-lg font-bold font-headline mb-6">Настройки уведомлений</h3>
          <div className="space-y-4 max-w-lg">
            {[
              { key: 'notify_goal_reached', label: 'Достижение цели', desc: 'Когда сумма накоплений достигает целевой', icon: 'emoji_events' },
              { key: 'notify_wish_completed', label: 'Выполнение желания', desc: 'Когда желание полностью оплачено', icon: 'stars' },
              { key: 'notify_budget_exceeded', label: 'Превышение бюджета', desc: 'Когда расходы по категории превышают лимит', icon: 'warning' },
              { key: 'remind_upcoming', label: 'Регулярные платежи', desc: 'Предстоящие регулярные операции', icon: 'event_repeat' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-surface-container rounded-3xl hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <span className="material-symbols-outlined text-on-surface-variant">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                    <p className="text-xs text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
                <Toggle checked={notifSettings[item.key]} onChange={() => setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))} />
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={saveNotifSettings} className="btn-primary px-6 py-3 text-sm">Сохранить</button>
              {notifSaved && <span className="text-secondary text-sm font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span>Сохранено</span>}
            </div>
          </div>
        </div>
      )}

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                </div>
                <h3 className="font-headline font-bold text-xl text-on-surface">{editingAccountId ? 'Редактировать счёт' : 'Новый счёт'}</h3>
              </div>
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSaveAccount(); }}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Название</label>
                  <input type="text" value={accountForm.name} onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-surface-container-low dark:bg-surface-container-high border-none rounded-3xl py-4 px-5 text-on-surface dark:text-on-surface focus:ring-2 focus:ring-primary/20 placeholder:text-outline/50 transition-all" placeholder="Например: Основной счёт" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Тип</label>
                    <select value={accountForm.type} onChange={(e) => setAccountForm(prev => ({ ...prev, type: e.target.value }))} className="w-full bg-surface-container-low dark:bg-surface-container-high border-none rounded-3xl py-4 px-5 text-on-surface dark:text-on-surface">
                      <option value="bank">Банк</option>
                      <option value="cash">Наличные</option>
                      <option value="card">Карта</option>
                      <option value="ewallet">Электронный</option>
                      <option value="savings">Накопительный</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Валюта</label>
                    <select value={accountForm.currency} onChange={(e) => setAccountForm(prev => ({ ...prev, currency: e.target.value }))} className="w-full bg-surface-container-low dark:bg-surface-container-high border-none rounded-3xl py-4 px-5 text-on-surface dark:text-on-surface">
                      <option value="RUB">₽ RUB</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="CNY">¥ CNY</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Остаток (₽)</label>
                  <input type="number" value={accountForm.balance} onChange={(e) => setAccountForm(prev => ({ ...prev, balance: e.target.value }))} className="w-full bg-surface-container-low dark:bg-surface-container-high border-none rounded-3xl py-4 px-5 text-on-surface dark:text-on-surface focus:ring-2 focus:ring-primary/20 transition-all" placeholder="0" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Доступность</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setAccountForm(prev => ({ ...prev, scope: 'personal' }))} className={`flex-1 py-4 rounded-3xl font-semibold transition-all ${accountForm.scope === 'personal' ? 'bg-primary text-white' : 'bg-surface-container-low dark:bg-surface-container-high text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-sm mr-1 align-middle">lock</span>
                      Личный
                    </button>
                    <button type="button" onClick={() => setAccountForm(prev => ({ ...prev, scope: 'family' }))} className={`flex-1 py-4 rounded-3xl font-semibold transition-all ${accountForm.scope === 'family' ? 'bg-primary text-white' : 'bg-surface-container-low dark:bg-surface-container-high text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-sm mr-1 align-middle">home</span>
                      Семейный
                    </button>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-primary text-white rounded-3xl font-bold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all">
                  {editingAccountId ? 'Сохранить изменения' : 'Создать счёт'}
                </button>
              </form>
            </div>
          </section>
          <section className="lg:col-span-7">
            <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl overflow-hidden">
              {accounts.length > 0 ? (
                <div className="divide-y divide-surface-container-low dark:divide-surface-container-high">
                  {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center gap-4 p-5 hover:bg-surface-container-low/50 dark:hover:bg-surface-container-high/50 transition-colors group">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        acc.type === 'savings' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        acc.type === 'cash' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                        acc.type === 'card' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        acc.type === 'ewallet' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                        'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        <span className="material-symbols-outlined">
                          {acc.type === 'savings' ? 'savings' : acc.type === 'cash' ? 'payments' : acc.type === 'card' ? 'credit_card' : acc.type === 'ewallet' ? 'account_balance_wallet' : 'account_balance'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-on-surface">{acc.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-semibold text-on-surface">{Number(acc.balance).toLocaleString('ru-RU')} ₽</span>
                          <span className="text-xs text-on-surface-variant">• {acc.currency}</span>
                          {acc.is_liquid && <span className="text-[10px] bg-secondary/10 dark:bg-secondary/20 text-secondary dark:text-secondary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Ликвидный</span>}
                          {acc.scope === 'family' && <span className="text-[10px] bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">home</span>Семейный</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEditAccount(acc)} className="w-10 h-10 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container dark:hover:bg-surface-container-high transition-all">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button onClick={() => onDeleteAccount(acc.id)} className="w-10 h-10 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container dark:hover:bg-error/10 transition-all">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline/30 mb-2">account_balance</span>
                  <p className="text-on-surface-variant text-sm">Нет счетов</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Family Tab */}
      {activeTab === 'family' && user?.family_id && (
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card border border-outline-variant/60">
          <h3 className="text-lg font-bold font-headline mb-6">Настройки семьи</h3>
          <div className="space-y-6 max-w-lg">
            <div className={`flex items-center justify-between p-4 bg-surface-container rounded-3xl ${user?.family?.owner_user_id === user?.id ? '' : 'opacity-70'}`}>
              <div>
                <p className="text-sm font-semibold text-on-surface">Прозрачность личных операций</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {user?.family?.owner_user_id === user?.id
                    ? 'Если включено — личные операции участников видны партнёрам полностью (без «🔒 Сюрприз»). Меняет только владелец семьи.'
                    : 'По умолчанию личные операции скрыты от партнёра («🔒 Сюрприз»). Включить полную прозрачность может только владелец семьи.'}
                </p>
              </div>
              <Toggle
                checked={familySettings.show_personal_in_stats}
                disabled={user?.family?.owner_user_id !== user?.id}
                onChange={() => setFamilySettings(prev => ({ ...prev, show_personal_in_stats: !prev.show_personal_in_stats }))}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container rounded-3xl">
              <div>
                <p className="text-sm font-semibold text-on-surface">Месяцев для подушки безопасности</p>
                <p className="text-xs text-on-surface-variant mt-1">Количество месяцев, которое должна покрывать подушка</p>
              </div>
              <input
                type="number"
                min="1"
                max="24"
                value={familySettings.safety_pillow_months}
                onChange={(e) => setFamilySettings(prev => ({ ...prev, safety_pillow_months: parseInt(e.target.value) || 3 }))}
                className="w-20 bg-surface-container-high rounded-xl px-3 py-2 text-center text-sm font-semibold"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={saveFamilySettings} className="btn-primary px-6 py-3 text-sm">Сохранить</button>
              {familySettingsSaved && (
                <span className="text-secondary text-sm font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Сохранено
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Category Form */}
          <section className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-secondary-container dark:bg-secondary/20 flex items-center justify-center text-secondary dark:text-secondary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                </div>
                <h3 className="font-headline font-bold text-xl text-on-surface">Новая категория</h3>
              </div>
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSaveCategory(); }}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Название категории</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full bg-surface-container-low dark:bg-surface-container-high border-none rounded-3xl py-4 px-5 text-on-surface dark:text-on-surface focus:ring-2 focus:ring-primary/20 placeholder:text-outline/50 transition-all"
                    placeholder="Например: Хобби"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Тип категории</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewCategoryType('expense')}
                      className={`flex items-center justify-center gap-2 py-4 rounded-3xl font-semibold transition-all ${
                        newCategoryType === 'expense'
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-low dark:bg-surface-container-high text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">trending_down</span>
                      Расход
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCategoryType('income')}
                      className={`flex items-center justify-center gap-2 py-4 rounded-3xl font-semibold transition-all ${
                        newCategoryType === 'income'
                          ? 'bg-secondary text-white'
                          : 'bg-surface-container-low dark:bg-surface-container-high text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      Доход
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Визуальный маркер</label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', icon: 'category' },
                      { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', icon: 'shopping_cart' },
                      { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', icon: 'restaurant' },
                      { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', icon: 'directions_car' },
                      { bg: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-500 dark:text-slate-400', icon: 'more_horiz' },
                    ].map((color, i) => (
                      <button key={i} type="button" onClick={() => setNewCategoryIcon(color.icon)} className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center hover:ring-2 hover:ring-primary/50 transition-all ${newCategoryIcon === color.icon ? 'ring-2 ring-primary' : ''}`}>
                        <span className="material-symbols-outlined text-lg">{color.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  onClick={() => onSaveCategory()}
                  className="w-full py-4 bg-primary text-white rounded-3xl font-bold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all"
                >
                  {editingCategoryId ? 'Сохранить изменения' : 'Создать категорию'}
                </button>
              </form>
            </div>
            {/* Tip Card */}
            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-white min-h-[160px] flex flex-col justify-end">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="relative z-10">
                <p className="text-primary-fixed dark:text-primary-fixed-dim text-sm font-bold uppercase tracking-wider mb-1">Совет дня</p>
                <h4 className="font-headline font-bold text-xl">Разделяй и властвуй</h4>
                <p className="text-white/80 text-sm mt-1">Детализированные категории помогают точнее определить «черные дыры» бюджета.</p>
              </div>
            </div>
          </section>

          {/* Categories List */}
          <section className="lg:col-span-7 space-y-8">
            {/* System Categories */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-headline font-bold text-lg text-on-surface">Системные категории</h3>
                <span className="text-xs font-bold text-outline-variant bg-surface-container dark:bg-surface-container-high px-3 py-1 rounded-full uppercase tracking-tighter">Только чтение</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.filter(c => c.is_system).slice(0, 4).map((cat, i) => {
                  const colors = [
                    { bg: 'bg-secondary/10 dark:bg-secondary/20', text: 'text-secondary dark:text-secondary', icon: 'home' },
                    { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-primary', icon: 'shopping_bag' },
                    { bg: 'bg-tertiary/10 dark:bg-tertiary/20', text: 'text-tertiary dark:text-tertiary', icon: 'medical_services' },
                    { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', icon: 'commute' },
                  ];
                  const c = colors[i] || colors[0];
                  return (
                    <div key={cat.id} className="group bg-surface-container-low dark:bg-surface-container-high p-4 rounded-3xl flex items-center gap-4 border border-transparent hover:border-outline-variant/30 transition-all">
                      <div className={`w-12 h-12 rounded-xl bg-surface-container-lowest dark:bg-surface-container-low ${c.text} flex items-center justify-center`}>
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-on-surface">{cat.name}</p>
                        <p className="text-xs text-on-surface-variant">{cat.type === 'expense' ? 'Расходы' : 'Доходы'}</p>
                      </div>
                      <span className="material-symbols-outlined text-outline/40 group-hover:text-outline transition-colors">lock</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* User Categories */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-headline font-bold text-lg text-on-surface">Пользовательские категории</h3>
                <span className="text-xs font-bold text-primary bg-primary-fixed dark:bg-primary/20 px-3 py-1 rounded-full uppercase tracking-tighter">Редактируемые</span>
              </div>
              <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl overflow-hidden">
                <div className="divide-y divide-surface-container-low dark:divide-surface-container-high">
                  {categories.filter(c => !c.is_system).length > 0 ? (
                    categories.filter(c => !c.is_system).map(cat => (
                      <div key={cat.id} className="flex items-center gap-4 p-5 hover:bg-surface-container-low/50 dark:hover:bg-surface-container-high/50 transition-colors group">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.type === 'expense' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                          <span className="material-symbols-outlined">{cat.icon || (cat.type === 'expense' ? 'shopping_bag' : 'payments')}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-on-surface">{cat.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                              cat.type === 'expense'
                                ? 'bg-error/10 dark:bg-error/20 text-error dark:text-error'
                                : 'bg-secondary/10 dark:bg-secondary/20 text-secondary dark:text-secondary'
                            }`}>
                              {cat.type === 'expense' ? 'Расход' : 'Доход'}
                            </span>
                            {cat.family_id && (
                              <span className="text-[10px] bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">home</span>
                                Семейная
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingCategoryId(cat.id); setNewCategoryName(cat.name); setNewCategoryType(cat.type); setNewCategoryIcon(cat.icon || 'category'); }} className="w-10 h-10 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container dark:hover:bg-surface-container-high transition-all">
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button onClick={() => onDeleteCategory(cat.id)} className="w-10 h-10 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container dark:hover:bg-error/10 transition-all">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <span className="material-symbols-outlined text-4xl text-outline/30 mb-2">folder_open</span>
                      <p className="text-on-surface-variant text-sm">Нет пользовательских категорий</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card border border-outline-variant/60">
          <h3 className="text-lg font-bold font-headline mb-6">Тема оформления</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => { if (isDark) toggleTheme(); }}
              className={`p-6 rounded-3xl border-2 transition-all text-left ${
                !isDark ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-2xl text-yellow-600" style={{ fontVariationSettings: "'FILL' 1" }}>light_mode</span>
                <span className="font-bold text-on-surface">Светлая тема</span>
              </div>
              <p className="text-xs text-on-surface-variant">Классический светлый интерфейс</p>
            </button>
            <button
              onClick={() => { if (!isDark) toggleTheme(); }}
              className={`p-6 rounded-3xl border-2 transition-all text-left ${
                isDark ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-2xl text-indigo-400" style={{ fontVariationSettings: "'FILL' 1" }}>dark_mode</span>
                <span className="font-bold text-on-surface">Тёмная тема</span>
              </div>
              <p className="text-xs text-on-surface-variant">Тёмный интерфейс для комфортной работы</p>
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}
