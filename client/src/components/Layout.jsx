import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import NotificationBell from './NotificationBell';

export const FAMILY_CHANGED_EVENT = 'family:changed';

export default function Layout({ space = 'personal', currentSpace, onSpaceChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const memberMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  const basePath = `/${space}`;
  
  const personalNav = [
    { name: 'Главная', path: `${basePath}/dashboard`, icon: 'dashboard' },
    { name: 'Операции', path: `${basePath}/transactions`, icon: 'receipt_long' },
    { name: 'Цели', path: `${basePath}/goals`, icon: 'track_changes' },
    { name: 'Подушка', path: `${basePath}/safety-pillow`, icon: 'savings' },
    { name: 'Аналитика', path: `${basePath}/analytics`, icon: 'analytics' },
    { name: 'Бюджеты', path: `${basePath}/budgets`, icon: 'account_balance_wallet' },
    { name: 'Кредиты', path: `${basePath}/debts`, icon: 'credit_score' },
    { name: 'Регулярные', path: `${basePath}/recurring`, icon: 'event_repeat' },
    { name: 'Импорт', path: `${basePath}/import`, icon: 'upload' },
    { name: 'Экспорт', path: `${basePath}/export`, icon: 'download' },
    { name: 'Настройки', path: `${basePath}/settings`, icon: 'settings' },
  ];

  const familyNav = [
    { name: 'Главная', path: '/family/dashboard', icon: 'dashboard' },
    { name: 'Операции', path: '/family/transactions', icon: 'receipt_long' },
    { name: 'Цели', path: '/family/goals', icon: 'track_changes' },
    { name: 'Подушка', path: '/family/safety-pillow', icon: 'savings' },
    { name: 'Аналитика', path: '/family/analytics', icon: 'analytics' },
    { name: 'Бюджеты', path: '/family/budgets', icon: 'account_balance_wallet' },
    { name: 'Кредиты', path: '/family/debts', icon: 'credit_score' },
    { name: 'Регулярные', path: '/family/recurring', icon: 'event_repeat' },
    { name: 'Экспорт', path: '/family/export', icon: 'download' },
    { name: 'Семья', path: '/family/manage', icon: 'groups' },
    { name: 'Настройки', path: '/family/settings', icon: 'settings' },
  ];

  const activeNavItems = space === 'personal' ? personalNav : familyNav;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
        setSelectedMember(res.data);
        if (res.data.family && res.data.family.members) {
          setFamilyMembers(res.data.family.members);
        } else {
          setFamilyMembers([]);
        }
      } catch (err) { console.error(err); }
    };
    fetchUser();

    const onFamilyChanged = () => fetchUser();
    window.addEventListener(FAMILY_CHANGED_EVENT, onFamilyChanged);
    return () => window.removeEventListener(FAMILY_CHANGED_EVENT, onFamilyChanged);
  }, []);

  useEffect(() => {
    const now = new Date();
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    setCurrentDate(`${monthNames[now.getMonth()]}, ${now.getFullYear()}`);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (memberMenuRef.current && !memberMenuRef.current.contains(e.target)) setMemberMenuOpen(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout API error:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpiresAt');
    navigate('/login');
  };

  const selectMember = (member) => {
    setSelectedMember(member);
    setMemberMenuOpen(false);
    window.dispatchEvent(new Event('memberContextChanged'));
  };

  const isActive = (path) => location.pathname === path;

  const pageTitle = activeNavItems.find(n => location.pathname.startsWith(n.path))?.name || '';

  const MemberSwitcher = () => (
    <div className="relative" ref={memberMenuRef}>
      <button
        onClick={() => setMemberMenuOpen(!memberMenuOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-surface-container transition-colors"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container">
          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {selectedMember?.name?.charAt(0).toUpperCase() || '?'}
          </div>
        </div>
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="text-xs font-bold text-on-surface leading-none truncate">{selectedMember?.name || '...'}</span>
          <span className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{user?.family?.owner_user_id === user?.id ? 'Владелец' : user?.family_id ? 'Участник' : 'Личный'}</span>
        </div>
        <span className="material-symbols-outlined text-sm text-on-surface-variant">expand_more</span>
      </button>

      {memberMenuOpen && familyMembers.length > 1 && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden z-50">
          <div className="p-3 border-b border-outline-variant/20">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Переключить вид</p>
          </div>
          {familyMembers.map(m => (
            <button
              key={m.id}
              onClick={() => selectMember(m)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                selectedMember?.id === m.id ? 'bg-primary/5 text-primary' : 'text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {m.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <span className="text-sm font-medium truncate">{m.name}</span>
              {selectedMember?.id === m.id && <span className="material-symbols-outlined text-primary text-sm ml-auto">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body selection:bg-primary-container selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 z-40 flex flex-col p-4 bg-surface-container-low w-64 h-full hidden md:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white overflow-hidden shadow-vault">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-primary font-headline">Финансы</h1>
            <p className="text-[10px] text-on-surface-variant font-medium tracking-wide">Premium Capital</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {activeNavItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isActiveItem = isActive(item.path);
            const isSubItemActive = hasSubItems && item.subItems.some(sub => isActive(sub.path));

            if (hasSubItems) {
              return (
                <div key={item.path} className="relative group">
                  <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                    isActiveItem || isSubItemActive
                      ? 'bg-primary/5 text-primary font-bold border-r-4 border-primary'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                  }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: isActiveItem || isSubItemActive ? "'FILL' 1" : "'FILL' 0" }}>
                        {item.icon}
                      </span>
                      <span className="font-headline text-sm font-semibold tracking-tight">{item.name}</span>
                    </div>
                    <span className="material-symbols-outlined text-sm group-hover:rotate-180 transition-transform">expand_more</span>
                  </div>
                  {/* Dropdown - always rendered but opacity controlled by hover */}
                  <div className="absolute left-full top-0 ml-1 w-48 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/20 overflow-hidden z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150">
                    {item.subItems.map(sub => (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
                          isActive(sub.path)
                            ? 'bg-primary/5 text-primary font-semibold'
                            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{sub.icon}</span>
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-primary/5 text-primary font-bold border-r-4 border-primary'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive(item.path) ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span className="font-headline text-sm font-semibold tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Add button, Profile, Logout */}
        <div className="mt-auto space-y-1">
          <Link
            to={`${basePath}/transactions`}
            className="w-full mb-6 py-3 px-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-vault hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Добавить операцию
          </Link>
          <Link to={`${basePath}/settings`} className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded-lg">
            <span className="material-symbols-outlined">account_circle</span>
            <span className="font-headline text-sm font-medium tracking-tight">Профиль</span>
          </Link>
          <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2 text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors rounded-lg">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-headline text-sm font-medium tracking-tight">Выйти</span>
          </button>
        </div>
      </aside>

      {/* Top App Bar */}
      <header className="fixed top-0 right-0 left-0 md:left-64 z-30 flex justify-between items-center px-6 py-3 bg-surface/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="font-headline text-lg font-semibold text-on-surface">{pageTitle}</h2>
          {/* Space Switcher */}
          {user?.family_id && (
            <button
              onClick={() => {
                const newSpace = space === 'personal' ? 'family' : 'personal';
                onSpaceChange?.(newSpace);
                navigate(`/${newSpace}/dashboard`);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full text-sm font-semibold hover:bg-surface-container-high transition-colors"
            >
              <span>{space === 'personal' ? '👤' : '👨‍👩‍👧'}</span>
              <span className="text-primary">{space === 'personal' ? 'Личное' : 'Семья'}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Date pill */}
          <div className="hidden md:flex items-center bg-surface-container-low px-3 py-1.5 rounded-full text-sm font-medium text-on-surface-variant gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_today</span>
            <span>{currentDate}</span>
          </div>
          {/* Right actions */}
          <div className="flex gap-2">
            <NotificationBell />
            <button
              onClick={() => {
                const d = document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', d ? 'dark' : 'light');
              }}
              className="p-2 text-on-surface-variant hover:opacity-70 transition-opacity active:scale-95"
            >
              <span className="material-symbols-outlined">dark_mode</span>
            </button>
          </div>
          {/* User avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30">
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {selectedMember?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-surface/95 backdrop-blur-sm pt-16 px-6">
          <nav className="space-y-2">
            {activeNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors ${
                  isActive(item.path) ? 'bg-surface-container-lowest text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-headline text-base font-medium">{item.name}</span>
              </Link>
            ))}
            <button onClick={logout} className="flex items-center gap-4 w-full px-4 py-4 text-error rounded-2xl hover:bg-error-container transition-colors">
              <span className="material-symbols-outlined">logout</span>
              <span className="font-headline text-base font-medium">Выйти</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="md:ml-64 pt-20 pb-24 px-6 min-h-screen">
        <div className="mx-auto w-full max-w-7xl">
          <Outlet context={{ selectedMember, currentUser: user }} />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 md:hidden bg-surface/90 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-3xl border-t border-outline-variant/20 font-inter text-[10px] font-semibold uppercase tracking-wider">
        {activeNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center ${
              isActive(item.path) ? 'text-primary bg-primary/10 rounded-2xl px-3 py-1' : 'text-on-surface-variant/60'
            }`}
          >
            <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: isActive(item.path) ? "'FILL' 1" : "'FILL' 0" }}>
              {item.icon}
            </span>
            <span>{item.name}</span>
          </Link>
        ))}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`flex flex-col items-center justify-center ${
              moreMenuOpen ? 'text-primary bg-primary/10 rounded-2xl px-3 py-1' : 'text-on-surface-variant/60'
            }`}
          >
            <span className="material-symbols-outlined text-2xl mb-1">menu</span>
            <span>Меню</span>
          </button>
          {moreMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-52 bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden z-50">
              {activeNavItems.slice(4).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isActive(item.path) ? 'text-primary font-bold bg-primary/5' : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
