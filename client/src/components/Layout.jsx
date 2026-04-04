import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import NotificationBell from './NotificationBell';

const navItems = [
  { name: 'Главная', path: '/', icon: 'dashboard' },
  { name: 'Операции', path: '/transactions', icon: 'receipt_long' },
  { name: 'Цели', path: '/goals', icon: 'track_changes' },
  { name: 'Желания', path: '/wishes', icon: 'favorite' },
  { name: 'Подушка', path: '/safety-pillow', icon: 'savings' },
  { name: 'Аналитика', path: '/analytics', icon: 'analytics' },
  { name: 'Бюджеты', path: '/budgets', icon: 'account_balance_wallet' },
  { name: 'Регулярные', path: '/recurring', icon: 'event_repeat' },
  { name: 'Семья', path: '/family', icon: 'groups' },
  { name: 'Настройки', path: '/settings', icon: 'settings' },
];

const primaryNav = navItems.slice(0, 4);
const secondaryNav = navItems.slice(4);

export default function Layout() {
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
        setSelectedMember(res.data);
        if (res.data.family_id) {
          try {
            const famRes = await api.get(`/families/${res.data.family_id}`);
            if (famRes.data && famRes.data.Members) setFamilyMembers(famRes.data.Members);
          } catch (err) { console.error('Failed to fetch family:', err); }
        }
      } catch (err) { console.error(err); }
    };
    fetchUser();
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

  const logout = () => { localStorage.removeItem('token'); navigate('/login'); };

  const selectMember = (member) => {
    setSelectedMember(member);
    setMemberMenuOpen(false);
    window.dispatchEvent(new Event('memberContextChanged'));
  };

  const isActive = (path) => location.pathname === path;

  const pageTitle = navItems.find(n => n.path === location.pathname)?.name || '';

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
          <span className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Владелец</span>
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
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white overflow-hidden shadow-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary font-headline">Финансы</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Семейный капитал</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-card'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive(item.path) ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="font-headline text-sm font-medium tracking-tight">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom: Add button, Profile, Logout */}
        <div className="mt-auto space-y-1">
          <Link
            to="/transactions"
            className="w-full mb-6 py-3 px-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Добавить операцию
          </Link>
          <Link to="/settings" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded-lg">
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
        <h2 className="font-headline text-lg font-semibold text-on-surface">{pageTitle}</h2>
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
              onClick={() => document.documentElement.classList.toggle('dark')}
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
            {navItems.map((item) => (
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
          <Outlet context={{ selectedMember }} />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 md:hidden bg-surface/90 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-3xl border-t border-outline-variant/20 font-inter text-[10px] font-semibold uppercase tracking-wider">
        {primaryNav.map((item) => (
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
              {secondaryNav.map((item) => (
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
