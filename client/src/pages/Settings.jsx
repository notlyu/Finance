import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const { register, handleSubmit, reset } = useForm();

  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');

  const [notifSettings, setNotifSettings] = useState({
    remind_upcoming: true, notify_goal_reached: true,
    notify_budget_exceeded: true, notify_wish_completed: true,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  const fetchUser = async () => {
    try { const res = await api.get('/auth/me'); setUser(res.data); }
    catch (err) { console.error(err); }
  };

  const fetchCategories = async () => {
    try { const res = await api.get('/categories'); setCategories(res.data); }
    catch (err) { console.error(err); }
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
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUser(); fetchCategories(); fetchNotifSettings(); }, []);

  const onChangePassword = async (data) => {
    setPasswordMessage(''); setPasswordError('');
    try {
      await api.post('/auth/change-password', { oldPassword: data.oldPassword, newPassword: data.newPassword });
      setPasswordMessage('Пароль успешно изменён'); reset();
    } catch (err) { setPasswordError(err.response?.data?.message || 'Ошибка'); }
  };

  const onCreateCategory = async () => {
    if (!newCategoryName) return;
    try {
      await api.post('/categories', { name: newCategoryName, type: newCategoryType });
      setNewCategoryName(''); fetchCategories();
    } catch (err) { alert(err.response?.data?.message || 'Ошибка'); }
  };

  const onDeleteCategory = async (id) => {
    if (window.confirm('Удалить категорию?')) {
      try { await api.delete(`/categories/${id}`); fetchCategories(); }
      catch (err) { alert(err.response?.data?.message || 'Ошибка'); }
    }
  };

  const toggleTheme = () => {
    const d = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', d ? 'dark' : 'light');
    setIsDark(d);
  };

  const saveNotifSettings = async () => {
    try { await api.put('/notifications/settings', notifSettings); setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000); }
    catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );

  const tabs = [
    { key: 'profile', label: 'Профиль', icon: 'person' },
    { key: 'notifications', label: 'Уведомления', icon: 'notifications' },
    { key: 'categories', label: 'Категории', icon: 'category' },
    { key: 'theme', label: 'Оформление', icon: 'palette' },
  ];

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Назад
        </Link>
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
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <h3 className="text-xl font-bold font-headline text-on-surface">{user?.name}</h3>
                <p className="text-sm text-on-surface-variant">{user?.email}</p>
              </div>
            </div>

            <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Смена пароля</h4>
            <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Старый пароль</label>
                <input type="password" {...register('oldPassword', { required: true })} className="input-ghost" placeholder="Введите старый пароль" />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Новый пароль</label>
                <input type="password" {...register('newPassword', { required: true, minLength: 6 })} className="input-ghost" placeholder="Минимум 6 символов" />
              </div>
              {passwordMessage && <div className="text-secondary text-sm font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span>{passwordMessage}</div>}
              {passwordError && <div className="text-error text-sm font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{passwordError}</div>}
              <button type="submit" className="btn-primary px-6 py-3 text-sm">Изменить пароль</button>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
          <h3 className="text-lg font-bold font-headline mb-6">Настройки уведомлений</h3>
          <div className="space-y-4 max-w-lg">
            {[
              { key: 'notify_goal_reached', label: 'Достижение цели', desc: 'Когда сумма накоплений достигает целевой', icon: 'emoji_events' },
              { key: 'notify_wish_completed', label: 'Выполнение желания', desc: 'Когда желание полностью оплачено', icon: 'stars' },
              { key: 'notify_budget_exceeded', label: 'Превышение бюджета', desc: 'Когда расходы по категории превышают лимит', icon: 'warning' },
              { key: 'remind_upcoming', label: 'Регулярные платежи', desc: 'Предстоящие регулярные операции', icon: 'event_repeat' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-surface-container rounded-2xl hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <span className="material-symbols-outlined text-on-surface-variant">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                    <p className="text-xs text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                    notifSettings[item.key] ? 'bg-primary' : 'bg-outline-variant'
                  }`}
                >
                  <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                    notifSettings[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={saveNotifSettings} className="btn-primary px-6 py-3 text-sm">Сохранить</button>
              {notifSaved && <span className="text-secondary text-sm font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span>Сохранено</span>}
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
            <h3 className="text-lg font-bold font-headline mb-6">Добавить категорию</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Название</label>
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="input-ghost" placeholder="Название категории" />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Тип</label>
                <select value={newCategoryType} onChange={(e) => setNewCategoryType(e.target.value)} className="select-ghost">
                  <option value="expense">Расход</option>
                  <option value="income">Доход</option>
                </select>
              </div>
              <button onClick={onCreateCategory} className="btn-primary px-6 py-3 text-sm">Добавить</button>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant">star</span>
              Системные категории
            </h3>
            <div className="space-y-2">
              {categories.filter(c => c.is_system).map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-3 bg-surface-container rounded-xl">
                  <span className="text-sm font-semibold text-on-surface">{cat.name}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${cat.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                    {cat.type === 'income' ? 'Доход' : 'Расход'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant">edit</span>
              Пользовательские категории
            </h3>
            {categories.filter(c => !c.is_system).length > 0 ? (
              <div className="space-y-2">
                {categories.filter(c => !c.is_system).map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-3 bg-surface-container rounded-xl">
                    <div>
                      <span className="text-sm font-semibold text-on-surface">{cat.name}</span>
                      <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${cat.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                        {cat.type === 'income' ? 'Доход' : 'Расход'}
                      </span>
                    </div>
                    <button onClick={() => onDeleteCategory(cat.id)} className="text-error text-sm font-semibold hover:opacity-80 transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-on-surface-variant text-sm text-center py-4">Нет пользовательских категорий</p>
            )}
          </div>
        </div>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
          <h3 className="text-lg font-bold font-headline mb-6">Тема оформления</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => { if (isDark) toggleTheme(); }}
              className={`p-6 rounded-2xl border-2 transition-all text-left ${
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
              className={`p-6 rounded-2xl border-2 transition-all text-left ${
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
    </div>
  );
}
